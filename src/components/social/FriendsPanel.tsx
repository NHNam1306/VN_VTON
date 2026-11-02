import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Search, UserPlus, Users, Link2, QrCode, Shield, Loader2, Check } from 'lucide-react'
import type { SocialSnapshot, SocialPerson } from '../../../server/social/types'
import { socialApi } from '../../services/social-api'
import type { Act } from './SocialPage'

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[22px] border border-black/[0.07] bg-white/80 p-5 backdrop-blur-sm shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function PersonRow({ person, action }: { person: SocialPerson; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-black/[0.05] last:border-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sage-100 to-sage-200 text-xl">
        {person.avatar}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{person.name}</p>
        <p className="truncate text-xs text-ink/40">@{person.username}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

export function FriendsPanel({ data, tab, act, onProfile }: { data: SocialSnapshot; tab: string; act: Act; onProfile: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SocialPerson[]>([])
  const [error, setError] = useState('')
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('invite') ?? '')
  const [qr, setQr] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [searching, setSearching] = useState(false)
  const link = location.origin + '/ban-be?invite=' + encodeURIComponent(data.me.inviteCode)

  useEffect(() => {
    void QRCode.toDataURL(link, { width: 200, margin: 2 }).then(setQr).catch(() => setError('Không thể tạo QR.'))
  }, [link])

  const search = async () => {
    setSearching(true)
    try { setResults(await socialApi.search(query)); setError('') } catch (e) { setError(String(e)) } finally { setSearching(false) }
  }

  const invite = async () => {
    try {
      let value = code.trim()
      if (value.includes('?')) value = new URL(value).searchParams.get('invite') ?? value
      const person = await socialApi.invite(value)
      await act('request', { targetId: person.id, inviteCode: value })
      setError('')
    } catch (e) { setError(String(e)) }
  }

  const btnBase = 'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition'
  const btnPrimary = `${btnBase} bg-[#16171b] text-white hover:bg-black shadow-sm`
  const btnGhost = `${btnBase} border border-black/[0.09] bg-white text-ink/60 hover:bg-sage-50 hover:text-ink`
  const btnDanger = `${btnBase} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>
      )}

      {/* FRIENDS tab */}
      {tab === 'friends' && (
        <>
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <Search size={15} className="text-ink/40" /> Tìm bạn theo username
            </h2>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void search() }}>
              <input
                aria-label="Username bạn bè"
                placeholder="@username"
                value={query}
                minLength={2}
                maxLength={40}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 min-w-0 rounded-xl border border-black/[0.09] bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400 placeholder:text-ink/30"
              />
              <button type="submit" disabled={searching} className={btnPrimary}>
                {searching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                Tìm
              </button>
            </form>
            {results.length > 0 && (
              <div className="mt-3 divide-y divide-black/[0.05]">
                {results.map(p => (
                  <PersonRow key={p.id} person={p} action={
                    data.friends.some(f => f.id === p.id)
                      ? <button onClick={() => onProfile(p.id)} className={btnGhost}>Xem hồ sơ</button>
                      : <button
                          disabled={data.incoming.some(r => r.from.id === p.id) || data.outgoing.some(r => r.to.id === p.id)}
                          onClick={() => void act('request', { targetId: p.id })}
                          className={btnPrimary}
                        >
                          <UserPlus size={12} /> Kết bạn
                        </button>
                  } />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-ink">
              <Users size={15} className="text-ink/40" /> Bạn bè
              <span className="ml-auto text-xs font-medium text-ink/35">{data.friends.length} người</span>
            </h2>
            {data.friends.length === 0
              ? <p className="mt-3 text-xs leading-relaxed text-ink/40">Chia sẻ mã mời để bắt đầu vòng kết nối.</p>
              : data.friends.map(p => (
                  <PersonRow key={p.id} person={p} action={
                    <button className={btnGhost} onClick={() => onProfile(p.id)}>Xem hồ sơ →</button>
                  } />
                ))
            }
          </Card>
        </>
      )}

      {/* REQUESTS tab */}
      {(tab === 'requests' || (code && tab === 'friends')) && (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Link2 size={15} className="text-ink/40" /> Kết nối bằng mã mời
          </h2>
          <label className="block text-xs font-medium text-ink/50 mb-1">Mã mời hoặc link của bạn bè</label>
          <input value={code} onChange={e => setCode(e.target.value)} className="mb-3 w-full rounded-xl border border-black/[0.09] bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400" />
          <button disabled={!code} onClick={() => void invite()} className={btnPrimary}>Gửi lời mời</button>
        </Card>
      )}

      {tab === 'requests' && (
        <Card>
          <h2 className="mb-3 text-sm font-bold text-ink">Đã nhận · {data.incoming.length}</h2>
          {data.incoming.length === 0
            ? <p className="text-xs text-ink/40">Không có lời mời nào.</p>
            : data.incoming.map(r => (
                <PersonRow key={r.id} person={r.from} action={
                  <div className="flex gap-1.5">
                    <button onClick={() => void act('request-response', { id: r.id, decision: 'accept' })} className={btnPrimary}><Check size={12} />Chấp nhận</button>
                    <button onClick={() => void act('request-response', { id: r.id, decision: 'decline' })} className={btnGhost}>Từ chối</button>
                  </div>
                } />
              ))
          }
          <h2 className="mb-3 mt-5 text-sm font-bold text-ink">Đã gửi · {data.outgoing.length}</h2>
          {data.outgoing.length === 0
            ? <p className="text-xs text-ink/40">Chưa có lời mời đang chờ.</p>
            : data.outgoing.map(r => (
                <PersonRow key={r.id} person={r.to} action={
                  <button onClick={() => void act('request-response', { id: r.id, decision: 'cancel' })} className={btnGhost}>Huỷ lời mời</button>
                } />
              ))
          }
        </Card>
      )}

      {/* GROUPS tab */}
      {tab === 'groups' && (
        <>
          <Card>
            <h2 className="mb-3 text-sm font-bold text-ink">{editing ? 'Chỉnh sửa nhóm' : 'Tạo nhóm riêng'}</h2>
            <form onSubmit={e => { e.preventDefault(); void act('group-save', { id: editing ?? undefined, name: groupName, memberIds: members }).then(ok => { if (ok) { setEditing(null); setGroupName(''); setMembers([]) } }) }}>
              <label className="block text-xs font-medium text-ink/50 mb-1">Tên nhóm</label>
              <input value={groupName} onChange={e => setGroupName(e.target.value)} required maxLength={60} className="mb-3 w-full rounded-xl border border-black/[0.09] bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400" />
              <p className="mb-2 text-xs text-ink/40">Thành viên là bạn bè của bạn:</p>
              <div className="flex flex-col gap-1 mb-3">
                {data.friends.map(p => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-sage-50 transition">
                    <input type="checkbox" checked={members.includes(p.id)} onChange={() => setMembers(members.includes(p.id) ? members.filter(id => id !== p.id) : [...members, p.id])} className="accent-sage-700" />
                    <span className="text-lg">{p.avatar}</span>
                    <span className="text-sm font-medium text-ink">{p.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button className={btnPrimary}>Lưu nhóm</button>
                {editing && <button type="button" className={btnGhost} onClick={() => { setEditing(null); setGroupName(''); setMembers([]) }}>Huỷ sửa</button>}
              </div>
            </form>
          </Card>
          {data.groups.map(g => (
            <Card key={g.id}>
              <h2 className="mb-1 text-sm font-bold text-ink">{g.name}</h2>
              <p className="mb-3 text-xs text-ink/45">{g.members.map(m => m.name).join(', ')}</p>
              <div className="flex flex-wrap gap-2">
                {g.ownerId === data.me.id && (
                  <button onClick={() => { setEditing(g.id); setGroupName(g.name); setMembers(g.members.filter(m => m.id !== data.me.id).map(m => m.id)) }} className={btnGhost}>Quản lý</button>
                )}
                <details className="inline">
                  <summary className="cursor-pointer text-xs font-semibold text-red-600 underline underline-offset-3 list-none">
                    {g.ownerId === data.me.id ? 'Giải tán nhóm' : 'Rời nhóm'}
                  </summary>
                  <p className="mt-2 mb-2 text-xs text-ink/40">Quyền chia sẻ qua nhóm sẽ bị thu hồi.</p>
                  <button onClick={() => void act('group-leave', { id: g.id })} className={btnDanger}>Xác nhận</button>
                </details>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* SETTINGS tab */}
      {tab === 'settings' && (
        <>
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
              <QrCode size={15} className="text-ink/40" /> QR &amp; link mời cá nhân
            </h2>
            {qr && <img src={qr} alt="Mã QR kết bạn" width={160} height={160} className="mx-auto mb-4 rounded-2xl border border-black/[0.07] p-2 bg-white" />}
            <label className="block text-xs font-medium text-ink/50 mb-1">Link mời</label>
            <input value={link} readOnly onFocus={e => e.target.select()} className="mb-3 w-full rounded-xl border border-black/[0.09] bg-sage-50 px-3 py-2 text-xs text-ink/60 outline-none" />
            <p className="mb-3 text-[10px] leading-relaxed text-ink/35">Chỉ gửi cho người quen. Link localhost chỉ hoạt động trên máy bạn.</p>
            <div className="flex gap-2">
              <button onClick={() => void navigator.clipboard.writeText(link).catch(() => setError('Hãy chọn và sao chép link phía trên.'))} className={btnPrimary}><Link2 size={12} /> Sao chép</button>
              <button className={btnGhost} onClick={() => void act('rotate-invite', {})}>Đổi mã mời</button>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
              <Shield size={15} className="text-ink/40" /> Hồ sơ &amp; quyền riêng tư
            </h2>
            <form key={data.me.id} onSubmit={e => { e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); void act('settings', values) }} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-ink/50 mb-1">Username</label>
                <input name="username" defaultValue={data.me.username} pattern="[a-z0-9_]{3,40}" required className="w-full rounded-xl border border-black/[0.09] bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/50 mb-1">Avatar (emoji)</label>
                <input name="avatar" defaultValue={data.me.avatar} maxLength={8} className="w-full rounded-xl border border-black/[0.09] bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/50 mb-1">Ngày sinh (riêng tư, chỉ khai một lần)</label>
                <input type="date" name="birthDate" defaultValue={data.me.birthDate ?? ''} disabled={!!data.me.birthDate} max={new Date().toISOString().slice(0, 10)} className="w-full rounded-xl border border-black/[0.09] bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/50 mb-1">Ai được gửi lời mời?</label>
                <select name="invitePolicy" defaultValue={data.me.invitePolicy} className="w-full rounded-xl border border-black/[0.09] bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400">
                  <option value="known">Bạn chung hoặc có mã mời</option>
                  <option value="code">Chỉ người có mã mời</option>
                  <option value="everyone">Mọi người (18+)</option>
                </select>
              </div>
              <p className="text-[10px] leading-relaxed text-ink/35">Chưa khai tuổi hoặc dưới 18: luôn cần bạn chung hoặc mã mời.</p>
              <button className={btnPrimary + ' self-start'}>Lưu cài đặt</button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-bold text-ink">Danh sách đã chặn</h2>
            {data.blocked.length === 0
              ? <p className="text-xs text-ink/40">Chưa chặn ai.</p>
              : data.blocked.map(p => (
                  <PersonRow key={p.id} person={p} action={
                    <button onClick={() => void act('unblock', { targetId: p.id })} className={btnGhost}>Bỏ chặn</button>
                  } />
                ))
            }
          </Card>
        </>
      )}
    </div>
  )
}
