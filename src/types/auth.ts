export type AuthUser = {
  id: string
  email: string
  displayName: string
  createdAt: string
  role: 'user' | 'koc' | 'moderator' | 'admin'
  status: 'active' | 'suspended'
}
