export type AuthUser = {
  id: string
  email: string
  displayName: string
  createdAt: string
  role: 'user' | 'koc' | 'moderator' | 'admin'
  status: 'active' | 'suspended'
  /** false: tài khoản chỉ đăng nhập bằng Google/Zalo, chưa có mật khẩu Fitsy. */
  hasPassword?: boolean
  /** Có giá trị khi tài khoản chỉ tồn tại qua Zalo: `email` là địa chỉ nội bộ, không phải email của người dùng. */
  externalProvider?: 'zalo'
}
