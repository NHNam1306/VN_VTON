import { createClient, type User } from '@supabase/supabase-js'
import type { AuthBackend, AuthResult } from './auth-backend.js'
import { AuthError } from './auth-service.js'
import type { PublicUser } from './auth-store.js'

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email ?? '',
  displayName: typeof user.user_metadata.display_name === 'string'
    ? user.user_metadata.display_name
    : (user.email?.split('@')[0] ?? 'Người dùng'),
  createdAt: user.created_at,
})

const validate = (email: string, displayName: string, password: string): void => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new AuthError(400, 'Email không hợp lệ.')
  }
  if (displayName.length < 2 || displayName.length > 50) {
    throw new AuthError(400, 'Tên hiển thị phải từ 2 đến 50 ký tự.')
  }
  if (password.length < 8 || password.length > 128) {
    throw new AuthError(400, 'Mật khẩu phải từ 8 đến 128 ký tự.')
  }
}

export class SupabaseAuthService implements AuthBackend {
  private readonly client

  constructor(
    private readonly url: string,
    private readonly publishableKey: string,
    private readonly appBaseUrl: string,
  ) {
    if (!url || !publishableKey) throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_PUBLISHABLE_KEY.')
    if (!appBaseUrl) throw new Error('Thiếu APP_BASE_URL cho luồng khôi phục mật khẩu.')
    this.client = this.createAuthClient()
  }

  private createAuthClient() {
    return createClient(this.url, this.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
  }

  async register(input: { email: string; displayName: string; password: string; legacyClaimToken?: string }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const displayName = input.displayName.trim()
    validate(email, displayName, input.password)
    const { data, error } = await this.client.auth.signUp({
      email,
      password: input.password,
      options: { data: { display_name: displayName } },
    })
    if (error) {
      const duplicate = /already|registered|exists/i.test(error.message)
      throw new AuthError(duplicate ? 409 : 400, duplicate ? 'Email này đã được sử dụng.' : error.message)
    }
    if (!data.user || !data.session) {
      throw new AuthError(403, 'Tài khoản đã được tạo. Hãy xác minh email rồi đăng nhập.')
    }
    return this.fromSession(data.user, data.session.access_token, data.session.refresh_token, data.session.expires_at)
  }

  async login(emailInput: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: emailInput.trim().toLowerCase(),
      password,
    })
    if (error || !data.user || !data.session) throw new AuthError(401, 'Email hoặc mật khẩu không đúng.')
    return this.fromSession(data.user, data.session.access_token, data.session.refresh_token, data.session.expires_at)
  }

  async requestPasswordReset(emailInput: string): Promise<void> {
    const email = emailInput.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new AuthError(400, 'Email không hợp lệ.')
    }
    const redirectTo = new URL('/reset-password', this.appBaseUrl).toString()
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw new AuthError(400, 'Chưa thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.')
  }

  async resetPassword(input: { accessToken: string; refreshToken: string; password: string }): Promise<AuthResult> {
    if (input.password.length < 8 || input.password.length > 128) {
      throw new AuthError(400, 'Mật khẩu phải từ 8 đến 128 ký tự.')
    }
    if (!input.accessToken || !input.refreshToken) {
      throw new AuthError(400, 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')
    }

    // Dùng client riêng cho mỗi request để recovery session không bị chia sẻ giữa người dùng.
    const recoveryClient = this.createAuthClient()
    const { data: sessionData, error: sessionError } = await recoveryClient.auth.setSession({
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
    })
    if (sessionError || !sessionData.user || !sessionData.session) {
      throw new AuthError(400, 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')
    }

    const { data, error } = await recoveryClient.auth.updateUser({ password: input.password })
    if (error || !data.user) {
      throw new AuthError(400, 'Không thể cập nhật mật khẩu. Hãy yêu cầu một liên kết mới.')
    }
    return this.fromSession(
      data.user,
      sessionData.session.access_token,
      sessionData.session.refresh_token,
      sessionData.session.expires_at,
    )
  }

  async authenticate(token: string | null): Promise<PublicUser | null> {
    if (!token) return null
    const { data, error } = await this.client.auth.getUser(token)
    return error || !data.user ? null : toPublicUser(data.user)
  }

  async refresh(refreshToken: string | null): Promise<AuthResult | null> {
    if (!refreshToken) return null
    const { data, error } = await this.client.auth.refreshSession({ refresh_token: refreshToken })
    if (error || !data.user || !data.session) return null
    return this.fromSession(data.user, data.session.access_token, data.session.refresh_token, data.session.expires_at)
  }

  async logout(_token: string | null): Promise<void> {
    // Cookie is authoritative for this backend. Supabase access tokens expire quickly;
    // clearing both HttpOnly cookies prevents this browser from reusing the session.
  }

  private fromSession(
    user: User,
    accessToken: string,
    refreshToken: string,
    expiresAt?: number,
  ): AuthResult {
    return {
      user: toPublicUser(user),
      token: accessToken,
      refreshToken,
      expiresAt: new Date((expiresAt ?? Math.floor(Date.now() / 1000) + 3600) * 1000),
    }
  }
}
