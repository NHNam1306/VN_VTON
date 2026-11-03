import { randomUUID } from 'node:crypto'
import type { PublicUser } from '../auth/auth-store.js'
import { AuthError } from '../auth/auth-service.js'
import type { AdminRepository } from './admin-repository.js'
import type { AdminAuditEntry, AdminUser, UserRole, UserStatus } from './types.js'

const roles:UserRole[]=['user','koc','moderator','admin']
const statuses:UserStatus[]=['active','suspended']

export class AdminService{
  private readonly bootstrapAdmins:Set<string>
  constructor(private readonly repository:AdminRepository,adminEmails:string[]){
    this.bootstrapAdmins=new Set(adminEmails.map(email=>email.trim().toLowerCase()).filter(Boolean))
  }
  async resolveAuthenticatedUser(user:PublicUser):Promise<PublicUser>{
    const resolved=await this.repository.syncUser(user,this.bootstrapAdmins.has(user.email.toLowerCase()))
    if(resolved.status==='suspended')throw new AuthError(403,'Tài khoản đã bị tạm khoá. Vui lòng liên hệ quản trị viên.')
    return{id:resolved.id,email:resolved.email,displayName:resolved.displayName,createdAt:resolved.createdAt,role:resolved.role,status:resolved.status}
  }
  private canRead(user:PublicUser){if(user.role!=='admin'&&user.role!=='moderator')throw new AuthError(403,'Bạn không có quyền truy cập khu vực quản trị.')}
  private requireAdmin(user:PublicUser){if(user.role!=='admin')throw new AuthError(403,'Chỉ quản trị viên được thực hiện thao tác này.')}
  async summary(actor:PublicUser){this.canRead(actor);return this.repository.summary()}
  async users(actor:PublicUser,query:{search?:string;role?:string;status?:string}){
    this.canRead(actor)
    const role=query.role&&roles.includes(query.role as UserRole)?query.role as UserRole:undefined
    const status=query.status&&statuses.includes(query.status as UserStatus)?query.status as UserStatus:undefined
    return this.repository.listUsers({search:query.search?.trim().slice(0,100),role,status})
  }
  async audit(actor:PublicUser){this.requireAdmin(actor);return this.repository.listAudit(100)}
  async updateUser(actor:PublicUser,targetId:string,input:{role?:unknown;status?:unknown}):Promise<AdminUser>{
    this.requireAdmin(actor)
    if(actor.id===targetId)throw new AuthError(400,'Không thể tự thay đổi quyền hoặc trạng thái của chính mình.')
    const role=input.role===undefined?undefined:roles.includes(input.role as UserRole)?input.role as UserRole:null
    const status=input.status===undefined?undefined:statuses.includes(input.status as UserStatus)?input.status as UserStatus:null
    if(role===null||status===null||(!role&&!status))throw new AuthError(400,'Thay đổi role hoặc trạng thái không hợp lệ.')
    const before=await this.repository.getUser(targetId)
    if(!before)throw new AuthError(404,'Không tìm thấy người dùng.')
    if(before.role==='admin'&&(role&&role!=='admin'||status==='suspended')&&await this.repository.countAdmins()<=1)throw new AuthError(409,'Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.')
    const updated=await this.repository.updateUser(targetId,{role:role??undefined,status:status??undefined})
    if(!updated)throw new AuthError(404,'Không tìm thấy người dùng.')
    const now=new Date().toISOString()
    const entries:AdminAuditEntry[]=[]
    if(role&&role!==before.role)entries.push({id:randomUUID(),actorId:actor.id,actorEmail:actor.email,action:'user.role_changed',targetId,details:{from:before.role,to:role},createdAt:now})
    if(status&&status!==before.status)entries.push({id:randomUUID(),actorId:actor.id,actorEmail:actor.email,action:'user.status_changed',targetId,details:{from:before.status,to:status},createdAt:now})
    for(const entry of entries)await this.repository.addAudit(entry)
    return updated
  }
  close(){return this.repository.close()}
}
