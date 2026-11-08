import { randomBytes, randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import { AuthError } from '../auth/auth-service.js'
import type { PostgresPool } from '../storage/postgres.js'
import type { SavedOutfitRecord } from '../domain/saved-outfit.js'
import type { SocialService } from './social-service.js'
import type { OutfitPolicy, SocialPerson, SocialPoll, SocialProfile, SocialSnapshot, SocialPost, SocialVisibility } from './types.js'
import { prepareSocialSearch, socialSearchScore } from './search.js'

type Profile = Omit<SocialProfile, 'name'>
type RequestRow = { id: string; from: string; to: string; createdAt: number }
type Group = { id: string; ownerId: string; name: string; members: string[] }
type Poll = { id: string; ownerId: string; title: string; outfitIds: string[]; imageOptions?: { id: string; imageUrl: string }[]; visibility?: SocialVisibility; groupIds?: string[]; recipients: string[]; votes: Record<string, string>; createdAt: number; expiresAt: number; closed: boolean; winnerId: string | null; notified: boolean }
type Post = { id: string; ownerId: string; caption: string; imageUrls: string[]; visibility: SocialVisibility; groupIds: string[]; createdAt: number }
type Notice = { id: string; userId: string; actor: string; kind: 'request' | 'poll' | 'result'; targetId: string; read: boolean; createdAt: number }
type State = { profiles: Profile[]; friends: [string, string][]; requests: RequestRow[]; groups: Group[]; polls: Poll[]; posts: Post[]; follows: [string, string][]; blocks: [string, string][]; reports: { id: string; from: string; target: string; reason: string; createdAt: number }[]; notices: Notice[]; policies: (OutfitPolicy & { ownerId: string })[]; temporaryImages: { key: string; ownerId: string }[] }
type DbOutfit = SavedOutfitRecord & { ownerId: string }
type Context = { users: { id: string; name: string; role: string }[]; outfits: DbOutfit[]; ownImageKeys: Map<string, Set<string>> }

const fail = (message: string, code = 400): never => { throw new AuthError(code, message) }
const str = (value: unknown, max = 120): string => typeof value === 'string' && value.trim().length <= max ? value.trim() : fail('Dữ liệu văn bản không hợp lệ.')
const ids = (value: unknown, max = 100): string[] => Array.isArray(value) && value.length <= max && value.every(x => typeof x === 'string' && x.length < 150) ? [...new Set(value as string[])] : fail('Danh sách không hợp lệ.')
const imageKeyFromUrl = (value: string): string | null => {
  if (!value.startsWith('/uploads/')) return null
  try { return decodeURIComponent(value.slice('/uploads/'.length)) } catch { return null }
}

export class PostgresSocialStore implements SocialService {
  private readCache: { expiresAt: number; request: Promise<{ state: State; context: Context }> } | null = null

  constructor(private readonly pool: PostgresPool) {}
  async close(): Promise<void> {}

  private invalidateReadCache() { this.readCache = null }

  private async context(client: PostgresPool | PoolClient): Promise<Context> {
    const [usersResult, outfitsResult, keysResult] = await Promise.all([
      client.query<{ id: string; name: string; role: string }>('SELECT id, display_name AS name, role FROM profiles'),
      client.query<{
        id: string; user_id: string; front_image_url: string; front_image_key: string | null;
        back_image_url: string | null; back_image_key: string | null; garment_ids: string[]; created_at: Date | string
      }>('SELECT * FROM saved_outfits'),
      client.query<{ user_id: string; image_key: string }>(`
        SELECT user_id, image_key FROM (
          SELECT user_id, front_original_key AS image_key FROM garments
          UNION ALL SELECT user_id, front_processed_key FROM garments
          UNION ALL SELECT user_id, back_original_key FROM garments WHERE back_original_key IS NOT NULL
          UNION ALL SELECT user_id, back_processed_key FROM garments WHERE back_processed_key IS NOT NULL
          UNION ALL SELECT user_id, image_key FROM person_images
          UNION ALL SELECT user_id, image_key FROM try_on_images WHERE image_key IS NOT NULL
        ) image_keys
      `),
    ])
    const outfits: DbOutfit[] = outfitsResult.rows.map(row => ({
      id: row.id, ownerId: row.user_id, frontImageUrl: row.front_image_url,
      frontImageKey: row.front_image_key, backImageUrl: row.back_image_url,
      backImageKey: row.back_image_key, garmentIds: row.garment_ids ?? [],
      createdAt: new Date(row.created_at).toISOString(),
    }))
    const ownImageKeys = new Map<string, Set<string>>()
    const add = (userId: string, key: string | null) => {
      if (!key) return
      const keys = ownImageKeys.get(userId) ?? new Set<string>()
      keys.add(key); ownImageKeys.set(userId, keys)
    }
    for (const row of keysResult.rows) add(row.user_id, row.image_key)
    for (const outfit of outfits) { add(outfit.ownerId, outfit.frontImageKey); add(outfit.ownerId, outfit.backImageKey) }
    return { users: usersResult.rows, outfits, ownImageKeys }
  }

  private async read<T>(fn: (state: State, context: Context) => T): Promise<T> {
    if (!this.readCache || this.readCache.expiresAt <= Date.now()) {
      const request = Promise.all([
        this.pool.query<{ data: State }>('SELECT data FROM social_state WHERE id = 1'),
        this.context(this.pool),
      ]).then(([stateResult, context]) => {
        const state = stateResult.rows[0]?.data
        if (!state) throw new Error('Migration social_state chưa được chạy.')
        return { state, context }
      }).catch((error) => {
        this.invalidateReadCache()
        throw error
      })
      this.readCache = { expiresAt: Date.now() + 3_000, request }
    }
    const { state, context } = await this.readCache.request
    return fn(state, context)
  }

  private async change<T>(fn: (state: State, context: Context) => T): Promise<T> {
    this.invalidateReadCache()
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query<{ data: State }>('SELECT data FROM social_state WHERE id = 1 FOR UPDATE')
      const state = result.rows[0]?.data
      if (!state) throw new Error('Migration social_state chưa được chạy.')
      const context = await this.context(client)
      const value = fn(state, context)
      this.pruneEphemeralState(state)
      await client.query('UPDATE social_state SET data = $1::jsonb, updated_at = now() WHERE id = 1', [JSON.stringify(state)])
      await client.query('COMMIT')
      return value
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
      this.invalidateReadCache()
    }
  }

  private seed(state: State, context: Context) {
    state.posts ??= []
    state.follows ??= []
    this.removeDeletedUsers(state, context)
    for (const user of context.users) if (!state.profiles.some(profile => profile.id === user.id)) {
      state.profiles.push({ id: user.id, username: `user_${user.id.replace(/-/g, '')}`, avatar: '', birthDate: null, invitePolicy: 'known', inviteCode: randomBytes(24).toString('base64url'), defaultVisibility: 'private' })
    }
    for (const profile of state.profiles) if (profile.defaultVisibility !== 'friends') profile.defaultVisibility = 'private'
  }
  private removeDeletedUsers(state: State, context: Context) {
    const live = new Set(context.users.map(user => user.id))
    const pairIsLive = ([first, second]: [string, string]) => live.has(first) && live.has(second)
    state.profiles = state.profiles.filter(profile => live.has(profile.id))
    state.friends = state.friends.filter(pairIsLive)
    state.requests = state.requests.filter(request => live.has(request.from) && live.has(request.to))
    state.groups = state.groups
      .filter(group => live.has(group.ownerId))
      .map(group => ({ ...group, members: [group.ownerId, ...group.members.filter(id => id !== group.ownerId && live.has(id))] }))
    state.polls = state.polls
      .filter(poll => live.has(poll.ownerId))
      .map(poll => ({
        ...poll,
        recipients: poll.recipients.filter(id => live.has(id)),
        votes: Object.fromEntries(Object.entries(poll.votes).filter(([id]) => live.has(id))),
      }))
    state.posts = state.posts.filter(post => live.has(post.ownerId))
    state.follows = state.follows.filter(pairIsLive)
    state.blocks = state.blocks.filter(pairIsLive)
    state.reports = state.reports.filter(report => live.has(report.from) && live.has(report.target))
    state.notices = state.notices.filter(notice => live.has(notice.userId) && live.has(notice.actor))
    state.policies = state.policies.filter(policy => live.has(policy.ownerId))
    state.temporaryImages = state.temporaryImages.filter(image => live.has(image.ownerId))
  }
  private pruneEphemeralState(state: State) {
    const keepLatestPerUser = <T>(items: T[], userId: (item: T) => string, limit: number): T[] => {
      const counts = new Map<string, number>()
      return [...items].reverse().filter(item => {
        const id = userId(item)
        const count = counts.get(id) ?? 0
        counts.set(id, count + 1)
        return count < limit
      }).reverse()
    }
    state.notices = keepLatestPerUser(state.notices, item => item.userId, 200)
    state.temporaryImages = keepLatestPerUser(state.temporaryImages, item => item.ownerId, 100)
  }
  private needsMaintenance(state: State, context: Context, requiredUserId?: string): boolean {
    const live = new Set(context.users.map(user => user.id))
    const deleted = (id: string) => !live.has(id)
    if (requiredUserId && (!context.users.some(user => user.id === requiredUserId) || !state.profiles.some(profile => profile.id === requiredUserId))) return true
    if (context.users.some(user => !state.profiles.some(profile => profile.id === user.id))) return true
    if (state.profiles.some(profile => deleted(profile.id))) return true
    if (state.friends.some(([first, second]) => deleted(first) || deleted(second))) return true
    if (state.requests.some(request => deleted(request.from) || deleted(request.to))) return true
    if (state.groups.some(group => deleted(group.ownerId) || group.members.some(deleted))) return true
    if (state.polls.some(poll => deleted(poll.ownerId) || poll.recipients.some(deleted) || Object.keys(poll.votes).some(deleted))) return true
    if (state.posts?.some(post => deleted(post.ownerId))) return true
    if (state.follows?.some(([follower, creator]) => deleted(follower) || deleted(creator))) return true
    if (state.blocks.some(([first, second]) => deleted(first) || deleted(second))) return true
    if (state.reports.some(report => deleted(report.from) || deleted(report.target))) return true
    if (state.notices.some(notice => deleted(notice.userId) || deleted(notice.actor))) return true
    if (state.policies.some(policy => deleted(policy.ownerId)) || state.temporaryImages.some(image => deleted(image.ownerId))) return true
    if (state.profiles.some(profile => profile.defaultVisibility !== 'private' && profile.defaultVisibility !== 'friends')) return true
    if (!Array.isArray(state.posts) || !Array.isArray(state.follows)) return true
    return state.polls.some(poll => !poll.notified && (poll.closed || poll.expiresAt <= Date.now()))
  }
  private async ensureMaintained(requiredUserId?: string): Promise<void> {
    const needed = await this.read((state, context) => this.needsMaintenance(state, context, requiredUserId))
    if (!needed) return
    await this.change((state, context) => {
      this.seed(state, context)
      this.endExpired(state)
    })
  }
  private person(state: State, context: Context, id: string): SocialPerson {
    const profile = state.profiles.find(item => item.id === id)
    const user = context.users.find(item => item.id === id)
    if (!profile || !user) return fail('Không tìm thấy người dùng.', 404)
    return { id, username: profile.username, avatar: profile.avatar, name: user.name, creator: user.role === 'koc' || user.role === 'admin' }
  }
  private blocked(state: State, a: string, b: string) { return state.blocks.some(([x,y]) => (x === a && y === b) || (y === a && x === b)) }
  private friend(state: State, a: string, b: string) { return !this.blocked(state,a,b) && state.friends.some(([x,y]) => (x === a && y === b) || (y === a && x === b)) }
  private friends(state: State, id: string) { return state.profiles.filter(profile => this.friend(state,id,profile.id)).map(profile => profile.id) }
  private restricted(profile: Profile) {
    if (!profile.birthDate) return true
    const date = new Date(`${profile.birthDate}T00:00:00Z`); const today = new Date()
    const age = today.getUTCFullYear() - date.getUTCFullYear() - (today.getUTCMonth() < date.getUTCMonth() || (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate()) ? 1 : 0)
    return age < 18
  }
  private notice(state: State, userId: string, actor: string, kind: Notice['kind'], targetId: string) { state.notices.push({ id: randomUUID(), userId, actor, kind, targetId, read: false, createdAt: Date.now() }) }
  private activeRecipients(state: State, poll: Poll) { return poll.recipients.filter(id => !this.blocked(state,poll.ownerId,id)&&(this.friend(state,poll.ownerId,id) || Boolean(poll.imageOptions?.length&&poll.visibility==='public'&&state.follows.some(([follower,creator])=>follower===id&&creator===poll.ownerId)))) }
  private ownerOutfits(context: Context, ownerId: string) { return context.outfits.filter(outfit => outfit.ownerId === ownerId) }
  private visiblePoll(state: State, context: Context, poll: Poll, user: string) { return (poll.ownerId === user || this.activeRecipients(state,poll).includes(user)) && (poll.imageOptions?.length ? true : poll.outfitIds.every(id => this.ownerOutfits(context,poll.ownerId).some(outfit => outfit.id === id))) }
  private endExpired(state: State) { for (const poll of state.polls) if (!poll.notified && (poll.closed || poll.expiresAt <= Date.now())) { poll.notified=true;this.notice(state,poll.ownerId,poll.ownerId,'result',poll.id);for(const id of this.activeRecipients(state,poll))this.notice(state,id,poll.ownerId,'result',poll.id) } }
  private poll(state: State, context: Context, poll: Poll, viewer: string): SocialPoll {
    const recipients=this.activeRecipients(state,poll);const showVotes=viewer===poll.ownerId||Boolean(poll.votes[viewer])||poll.closed||poll.expiresAt<=Date.now()
    return { id:poll.id,owner:this.person(state,context,poll.ownerId),title:poll.title,createdAt:poll.createdAt,expiresAt:poll.expiresAt,closed:poll.closed||poll.expiresAt<=Date.now(),
      outfits:poll.imageOptions?.map(option=>({id:option.id,frontImageUrl:option.imageUrl,backImageUrl:null,official:false}))??this.ownerOutfits(context,poll.ownerId).filter(outfit=>poll.outfitIds.includes(outfit.id)).map(outfit=>({id:outfit.id,frontImageUrl:outfit.frontImageUrl,backImageUrl:outfit.backImageUrl,official:state.policies.some(item=>item.outfitId===outfit.id&&item.official)})),
      recipients:recipients.filter(id=>!this.blocked(state,viewer,id)).map(id=>this.person(state,context,id)),
      votes:showVotes?Object.entries(poll.votes).filter(([id])=>recipients.includes(id)&&!this.blocked(state,viewer,id)).map(([id,outfitId])=>({user:this.person(state,context,id),outfitId})):[],myVote:poll.votes[viewer]??null,winnerId:poll.winnerId }
  }
  private visiblePost(state: State, post: Post, viewer: string) { if(post.ownerId===viewer)return true;if(this.blocked(state,post.ownerId,viewer))return false;if(post.visibility==='public')return true;if(post.visibility==='friends')return this.friend(state,post.ownerId,viewer);if(post.visibility==='groups')return state.groups.some(group=>post.groupIds.includes(group.id)&&group.members.includes(post.ownerId)&&group.members.includes(viewer));return false }
  private socialPost(state: State, context: Context, post: Post): SocialPost { const owner=this.person(state,context,post.ownerId);return {id:post.id,owner,caption:post.caption,imageUrls:post.imageUrls,visibility:post.visibility,groupIds:post.groupIds,createdAt:post.createdAt,creator:Boolean(owner.creator)} }

  async snapshot(user: string): Promise<SocialSnapshot> {
    await this.ensureMaintained(user)
    return this.read((state,context)=>{const me=state.profiles.find(profile=>profile.id===user)!;const requests=state.requests.filter(row=>!this.blocked(state,row.from,row.to)).map(row=>({...row,from:this.person(state,context,row.from),to:this.person(state,context,row.to)}));return {
      me:{...me,...this.person(state,context,user)},friends:this.friends(state,user).map(id=>this.person(state,context,id)),incoming:requests.filter(row=>row.to.id===user),outgoing:requests.filter(row=>row.from.id===user),
      groups:state.groups.filter(group=>group.members.includes(user)).map(group=>({...group,members:group.members.filter(id=>!this.blocked(state,user,id)).map(id=>this.person(state,context,id))})),
      polls:state.polls.filter(poll=>this.visiblePoll(state,context,poll,user)).map(poll=>this.poll(state,context,poll,user)).sort((a,b)=>Number(!a.closed&&!a.myVote&&a.owner.id!==user)>Number(!b.closed&&!b.myVote&&b.owner.id!==user)?-1:Number(!a.closed&&!a.myVote&&a.owner.id!==user)<Number(!b.closed&&!b.myVote&&b.owner.id!==user)?1:b.createdAt-a.createdAt),
      blocked:state.blocks.filter(([a])=>a===user).map(([,b])=>this.person(state,context,b)),
      notifications:state.notices.filter(notice=>notice.userId===user&&!this.blocked(state,user,notice.actor)&&(notice.kind==='request'?state.requests.some(row=>row.id===notice.targetId):state.polls.some(poll=>poll.id===notice.targetId&&this.visiblePoll(state,context,poll,user)))).slice(-100).reverse().map(notice=>({id:notice.id,kind:notice.kind,targetId:notice.targetId,read:notice.read,createdAt:notice.createdAt,text:notice.kind==='request'?`${this.person(state,context,notice.actor).name} gửi lời mời kết bạn`:notice.kind==='poll'?`${this.person(state,context,notice.actor).name} muốn xin ý kiến bạn`:'Có kết quả bình chọn'})),
      policies:state.policies.filter(policy=>policy.ownerId===user&&this.ownerOutfits(context,user).some(outfit=>outfit.id===policy.outfitId)),
      posts:state.posts.filter(post=>!this.person(state,context,post.ownerId).creator&&this.visiblePost(state,post,user)).map(post=>this.socialPost(state,context,post)).sort((a,b)=>b.createdAt-a.createdAt),
      creatorFeed:state.posts.filter(post=>this.person(state,context,post.ownerId).creator&&(post.ownerId===user||state.follows.some(([follower,creator])=>follower===user&&creator===post.ownerId))&&this.visiblePost(state,post,user)).map(post=>this.socialPost(state,context,post)).sort((a,b)=>b.createdAt-a.createdAt),
      creators:state.profiles.map(profile=>this.person(state,context,profile.id)).filter(person=>person.creator&&!this.blocked(state,user,person.id)).map(person=>({person,following:state.follows.some(([follower,creator])=>follower===user&&creator===person.id),followerCount:state.follows.filter(([,creator])=>creator===person.id).length})),
      followingIds:state.follows.filter(([follower])=>follower===user).map(([,creator])=>creator) }
    })
  }

  async search(user: string, query: string): Promise<SocialPerson[]> {
    const search = prepareSocialSearch(query)
    if (!search) return []
    await this.ensureMaintained(user)
    return this.read((state,context)=>{
      return state.profiles
        .filter(profile=>profile.id!==user&&!this.blocked(state,user,profile.id))
        .map(profile=>{
          const person=this.person(state,context,profile.id)
          return {person,score:socialSearchScore(person.username,person.name,search)}
        })
        .filter((result):result is {person:SocialPerson;score:number}=>result.score!==null)
        .sort((a,b)=>a.score-b.score||a.person.username.localeCompare(b.person.username,'vi'))
        .slice(0,20)
        .map(result=>result.person)
    })
  }
  async resolveInvite(user: string, code: string): Promise<SocialPerson> { await this.ensureMaintained(user); return this.read((state,context)=>{const profile=state.profiles.find(item=>item.inviteCode===code&&!this.blocked(state,user,item.id));return profile?this.person(state,context,profile.id):fail('Mã mời không còn hiệu lực.',404)}) }
  private canViewOutfit(state: State, context: Context, viewer: string, owner: string, outfitId: string) { if(viewer===owner)return true;if(!this.friend(state,viewer,owner))return false;const policy=state.policies.find(item=>item.ownerId===owner&&item.outfitId===outfitId);const visibility=policy?.visibility??state.profiles.find(profile=>profile.id===owner)?.defaultVisibility??'private';if(visibility==='friends')return true;if(policy?.visibility==='groups'&&state.groups.some(group=>policy.groupIds.includes(group.id)&&group.members.includes(owner)&&group.members.includes(viewer)))return true;return state.polls.some(poll=>poll.ownerId===owner&&poll.outfitIds.includes(outfitId)&&poll.recipients.includes(viewer)&&this.visiblePoll(state,context,poll,viewer)) }
  async profile(user: string, target: string) { await this.ensureMaintained(user); return this.read((state,context)=>{if(user!==target&&!this.friend(state,user,target))return fail('Hồ sơ không khả dụng.',404);return {person:this.person(state,context,target),outfits:this.ownerOutfits(context,target).filter(outfit=>this.canViewOutfit(state,context,user,target,outfit.id)).map(outfit=>({id:outfit.id,frontImageUrl:outfit.frontImageUrl,backImageUrl:outfit.backImageUrl,official:state.policies.some(policy=>policy.outfitId===outfit.id&&policy.official)}))}}) }
  async trackTemporaryImage(user: string, key: string): Promise<void> { await this.change(state=>{state.temporaryImages=state.temporaryImages.filter(item=>item.key!==key);state.temporaryImages.push({ownerId:user,key})}) }
  async canReadImage(user: string, key: string): Promise<boolean> { return this.read((state,context)=>{state.posts??=[];state.follows??=[];if(state.profiles.some(profile=>imageKeyFromUrl(profile.avatar)===key))return true;if(state.temporaryImages.some(item=>item.ownerId===user&&item.key===key))return true;if(state.posts.some(post=>post.imageUrls.some(url=>imageKeyFromUrl(url)===key)&&this.visiblePost(state,post,user)))return true;if(state.polls.some(poll=>poll.imageOptions?.some(option=>imageKeyFromUrl(option.imageUrl)===key)&&this.visiblePoll(state,context,poll,user)))return true;if(context.ownImageKeys.get(user)?.has(key))return true;for(const outfit of context.outfits)if((outfit.frontImageKey===key||outfit.backImageKey===key)&&this.canViewOutfit(state,context,user,outfit.ownerId,outfit.id))return true;return false}) }
  private sever(state: State,a:string,b:string){state.friends=state.friends.filter(([x,y])=>!((x===a&&y===b)||(x===b&&y===a)));state.requests=state.requests.filter(row=>!((row.from===a&&row.to===b)||(row.from===b&&row.to===a)));for(const group of state.groups){if(group.ownerId===a)group.members=group.members.filter(id=>id!==b);if(group.ownerId===b)group.members=group.members.filter(id=>id!==a)}for(const poll of state.polls){if(poll.ownerId===a){poll.recipients=poll.recipients.filter(id=>id!==b);delete poll.votes[b]}if(poll.ownerId===b){poll.recipients=poll.recipients.filter(id=>id!==a);delete poll.votes[a]}}}

  async act(user:string,action:string,body:Record<string,unknown>):Promise<SocialSnapshot>{
    await this.change((state,context)=>{this.seed(state,context);const me=state.profiles.find(profile=>profile.id===user)!;const target=typeof body.targetId==='string'?body.targetId:''
      if(action==='settings'){const username=str(body.username,40).toLowerCase();if(!/^[a-z0-9_]{3,40}$/.test(username))fail('Username cần 3–40 chữ thường, số hoặc dấu _.');if(state.profiles.some(profile=>profile.id!==user&&profile.username===username))fail('Username đã được sử dụng.',409);if(body.birthDate&&!me.birthDate){const date=str(body.birthDate,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||Date.parse(date)>Date.now()||Date.parse(date)<Date.parse('1900-01-01'))fail('Ngày sinh không hợp lệ.');me.birthDate=date}const policy=body.invitePolicy;if(policy!=='everyone'&&policy!=='known'&&policy!=='code')fail('Quyền lời mời không hợp lệ.');me.username=username;if(body.avatar!==undefined){const avatar=str(body.avatar,500);if(avatar&&!avatar.startsWith('/uploads/'))fail('Ảnh đại diện không hợp lệ.');me.avatar=avatar}me.invitePolicy=policy as SocialProfile['invitePolicy'];if(body.defaultVisibility!==undefined){if(body.defaultVisibility!=='private'&&body.defaultVisibility!=='friends')fail('Quyền xem mặc định không hợp lệ.');me.defaultVisibility=body.defaultVisibility as SocialProfile['defaultVisibility']}if(this.restricted(me)&&me.invitePolicy==='everyone')me.invitePolicy='known'
      }else if(action==='rotate-invite'){me.inviteCode=randomBytes(24).toString('base64url')
      }else if(action==='request'){const other=state.profiles.find(profile=>profile.id===target);if(!other||target===user||this.blocked(state,user,target))fail('Không thể gửi lời mời.');if(this.friend(state,user,target))fail('Hai bạn đã kết bạn.');if(state.requests.some(row=>(row.from===user&&row.to===target)||(row.from===target&&row.to===user)))fail('Đã có lời mời đang chờ.');const validCode=body.inviteCode===other!.inviteCode;const known=this.friends(state,user).some(id=>this.friend(state,target,id));if(!validCode&&(other!.invitePolicy==='code'||((this.restricted(other!)||other!.invitePolicy==='known')&&!known)))fail('Người này chỉ nhận lời mời có mã mời hoặc từ bạn chung.',403);if(state.notices.filter(notice=>notice.actor===user&&notice.kind==='request'&&notice.createdAt>Date.now()-86400000).length>=30)fail('Đã đạt giới hạn lời mời hôm nay.',429);const request={id:randomUUID(),from:user,to:target,createdAt:Date.now()};state.requests.push(request);this.notice(state,target,user,'request',request.id)
      }else if(action==='request-response'){const request=state.requests.find(row=>row.id===body.id);if(!request)fail('Lời mời không còn tồn tại.',404);if(body.decision==='cancel'){if(request!.from!==user)fail('Không có quyền.',403)}else{if(request!.to!==user)fail('Không có quyền.',403);if(body.decision!=='accept'&&body.decision!=='decline')fail('Thao tác không hợp lệ.')}if(body.decision==='accept'&&!this.blocked(state,request!.from,request!.to))state.friends.push([request!.from,request!.to]);state.requests=state.requests.filter(row=>row.id!==request!.id)
      }else if(action==='unfriend'||action==='block'||action==='unblock'||action==='report'){if(target===user||!state.profiles.some(profile=>profile.id===target))fail('Người dùng không hợp lệ.');if(action==='unfriend'||action==='block')this.sever(state,user,target);if(action==='block'&&!state.blocks.some(([a,b])=>a===user&&b===target))state.blocks.push([user,target]);if(action==='unblock')state.blocks=state.blocks.filter(([a,b])=>!(a===user&&b===target));if(action==='report'){const reason=str(body.reason,1000);if(reason.length<5)fail('Mô tả báo cáo ít nhất 5 ký tự.');state.reports.push({id:randomUUID(),from:user,target,reason,createdAt:Date.now()})}
      }else if(action==='group-save'){const name=str(body.name,60);if(!name)fail('Cần tên nhóm.');const members=ids(body.memberIds);if(members.some(id=>id!==user&&!this.friend(state,user,id)))fail('Chỉ thêm bạn bè vào nhóm.');const existing=state.groups.find(group=>group.id===body.id);if(body.id&&!existing)fail('Nhóm không còn tồn tại.',404);if(existing&&existing.ownerId!==user)fail('Chỉ chủ nhóm được chỉnh sửa.',403);if(existing){existing.name=name;existing.members=[user,...members.filter(id=>id!==user)]}else state.groups.push({id:randomUUID(),ownerId:user,name,members:[user,...members.filter(id=>id!==user)]})
      }else if(action==='group-leave'){const group=state.groups.find(item=>item.id===body.id&&item.members.includes(user));if(!group)fail('Nhóm không khả dụng.',404);if(group!.ownerId===user)state.groups=state.groups.filter(item=>item.id!==group!.id);else group!.members=group!.members.filter(id=>id!==user)
      }else if(action==='outfit-policy'){const outfitId=str(body.outfitId);if(!this.ownerOutfits(context,user).some(outfit=>outfit.id===outfitId))fail('Không tìm thấy outfit.',404);const visibility=body.visibility;if(visibility!=='private'&&visibility!=='friends'&&visibility!=='groups')fail('Quyền xem không hợp lệ.');const groupIds=ids(body.groupIds??[]);if(groupIds.some(id=>!state.groups.some(group=>group.id===id&&group.members.includes(user))))fail('Nhóm không hợp lệ.');const old=state.policies.find(policy=>policy.outfitId===outfitId);state.policies=state.policies.filter(policy=>policy.outfitId!==outfitId);state.policies.push({ownerId:user,outfitId,visibility:visibility as OutfitPolicy['visibility'],groupIds,official:old?.official??false});if(visibility==='private')state.polls=state.polls.filter(poll=>!(poll.ownerId===user&&poll.outfitIds.includes(outfitId)))
      }else if(action==='post-create'){const imageUrls=ids(body.imageUrls,3);if(!imageUrls.length||imageUrls.some(url=>!url.startsWith('/uploads/')))fail('Ảnh bài đăng không hợp lệ.');const visibility=body.visibility;if(visibility!=='private'&&visibility!=='friends'&&visibility!=='groups'&&visibility!=='public')fail('Quyền xem không hợp lệ.');const groupIds=ids(body.groupIds??[]);if(visibility==='groups'&&(!groupIds.length||groupIds.some(id=>!state.groups.some(group=>group.id===id&&group.members.includes(user)))))fail('Hãy chọn nhóm hợp lệ.');state.posts.push({id:randomUUID(),ownerId:user,caption:str(body.caption??'',500),imageUrls,visibility:visibility as SocialVisibility,groupIds,createdAt:Date.now()})
      }else if(action==='post-delete'){const post=state.posts.find(item=>item.id===body.id);if(!post)fail('Bài đăng không còn tồn tại.',404);if(post!.ownerId!==user)fail('Không có quyền xoá bài đăng.',403);state.posts=state.posts.filter(item=>item.id!==post!.id)
      }else if(action==='follow'||action==='unfollow'){const creator=this.person(state,context,target);if(target===user||!creator.creator||this.blocked(state,user,target))fail('Nhà sáng tạo không hợp lệ.',404);if(action==='follow'&&!state.follows.some(([follower,id])=>follower===user&&id===target))state.follows.push([user,target]);if(action==='unfollow')state.follows=state.follows.filter(([follower,id])=>!(follower===user&&id===target))
      }else if(action==='image-poll-create'){const imageUrls=ids(body.imageUrls,3);if(imageUrls.length<2||imageUrls.some(url=>!url.startsWith('/uploads/')))fail('Chọn 2–3 ảnh để tạo bình chọn.');const hours=Number(body.hours);if(![1,24,72].includes(hours))fail('Thời hạn không hợp lệ.');const visibility=body.visibility;if(visibility!=='friends'&&visibility!=='groups'&&visibility!=='public')fail('Quyền xem bình chọn không hợp lệ.');const groupIds=ids(body.groupIds??[]);if(visibility==='groups'&&(!groupIds.length||groupIds.some(id=>!state.groups.some(group=>group.id===id&&group.members.includes(user)))))fail('Hãy chọn nhóm hợp lệ.');const supplied=ids(body.recipientIds??[]);if(visibility==='friends'&&supplied.some(id=>!this.friend(state,user,id)))fail('Người nhận phải là bạn bè hiện tại.');const groupMembers=state.groups.filter(group=>groupIds.includes(group.id)&&group.members.includes(user)).flatMap(group=>group.members).filter(id=>id!==user);const publicFollowers=state.follows.filter(([,creator])=>creator===user).map(([follower])=>follower);const recipients=[...new Set(visibility==='public'?[...this.friends(state,user),...publicFollowers]:visibility==='groups'?groupMembers:supplied.length?supplied:this.friends(state,user))];if(!recipients.length)fail('Bình chọn cần ít nhất một người nhận được.');const options=imageUrls.map(imageUrl=>({id:randomUUID(),imageUrl}));const poll:Poll={id:randomUUID(),ownerId:user,title:str(body.title,120)||'Mình nên chọn bộ nào?',outfitIds:options.map(option=>option.id),imageOptions:options,visibility:visibility as SocialVisibility,groupIds,recipients,votes:{},createdAt:Date.now(),expiresAt:Date.now()+hours*3600000,closed:false,winnerId:null,notified:false};state.polls.push(poll);for(const id of recipients)this.notice(state,id,user,'poll',poll.id)
      }else if(action==='poll-create'){const outfitIds=ids(body.outfitIds,3);if(!outfitIds.length||outfitIds.some(id=>!this.ownerOutfits(context,user).some(outfit=>outfit.id===id)))fail('Chọn 1–3 outfit của bạn.');const recipients=ids(body.recipientIds);if(!recipients.length||recipients.some(id=>!this.friend(state,user,id)))fail('Người nhận phải là bạn bè hiện tại.');const hours=Number(body.hours);if(![1,24,72].includes(hours))fail('Thời hạn không hợp lệ.');const poll:Poll={id:randomUUID(),ownerId:user,title:str(body.title,120)||'Mình nên chọn bộ nào?',outfitIds,recipients,votes:{},createdAt:Date.now(),expiresAt:Date.now()+hours*3600000,closed:false,winnerId:null,notified:false};state.polls.push(poll);for(const id of recipients)this.notice(state,id,user,'poll',poll.id)
      }else if(['vote','poll-close','poll-delete','poll-winner'].includes(action)){const poll=state.polls.find(item=>item.id===body.id&&this.visiblePoll(state,context,item,user));if(!poll)throw new AuthError(404,'Bình chọn không khả dụng.');if(action==='vote'){if(poll.ownerId===user||!this.activeRecipients(state,poll).includes(user))fail('Bạn không nằm trong người nhận.',403);if(poll.closed||poll.expiresAt<=Date.now())fail('Bình chọn đã kết thúc.',409);const id=str(body.outfitId);if(!poll.outfitIds.includes(id))fail('Outfit không thuộc bình chọn.');poll.votes[user]=id;if(!state.notices.some(notice=>notice.userId===poll.ownerId&&notice.kind==='result'&&notice.targetId===poll.id&&!notice.read))this.notice(state,poll.ownerId,poll.ownerId,'result',poll.id)}else{if(poll.ownerId!==user)fail('Chỉ người tạo được thực hiện.',403);if(action==='poll-delete')state.polls=state.polls.filter(item=>item.id!==poll.id);if(action==='poll-close')poll.closed=true;if(action==='poll-winner'){if(!poll.closed&&poll.expiresAt>Date.now())fail('Đóng bình chọn trước khi lưu outfit thắng.');const counts=poll.outfitIds.map(id=>({id,count:Object.entries(poll.votes).filter(([voter,outfit])=>outfit===id&&this.friend(state,user,voter)).length}));const max=Math.max(...counts.map(item=>item.count));const id=str(body.outfitId);if(max===0||!counts.some(item=>item.id===id&&item.count===max))fail('Hãy chọn một outfit có nhiều phiếu nhất.');poll.winnerId=id;if(!poll.imageOptions?.length){const old=state.policies.find(item=>item.outfitId===id);if(old)old.official=true;else state.policies.push({ownerId:user,outfitId:id,visibility:'private',groupIds:[],official:true})}}}this.endExpired(state)
      }else if(action==='notification-read'){for(const notice of state.notices)if(notice.userId===user&&(!body.id||notice.id===body.id))notice.read=true}else fail('Thao tác không hợp lệ.')
    })
    return this.snapshot(user)
  }
}
