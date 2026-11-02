import { describe, expect, it } from 'vitest'
import { AuthService } from './auth-service.js'
import { AuthStore } from './auth-store.js'

describe('AuthService', () => {
  it('đăng ký, tạo session và xác thực bằng token', async () => {
    const store = new AuthStore(':memory:')
    const auth = new AuthService(store, 30)
    const result = await auth.register({
      displayName: 'Nguyễn An',
      email: 'AN@Example.com',
      password: 'mat-khau-an-toan',
    })

    expect(result.user.email).toBe('an@example.com')
    expect(auth.authenticate(result.token)?.id).toBe(result.user.id)
    auth.logout(result.token)
    expect(auth.authenticate(result.token)).toBeNull()
    store.close()
  })

  it('đăng nhập đúng mật khẩu và từ chối mật khẩu sai', async () => {
    const store = new AuthStore(':memory:')
    const auth = new AuthService(store)
    await auth.register({ displayName: 'Minh Anh', email: 'minh@example.com', password: 'password-123' })

    await expect(auth.login('minh@example.com', 'password-123')).resolves.toHaveProperty('token')
    await expect(auth.login('minh@example.com', 'wrong-password')).rejects.toMatchObject({
      statusCode: 401,
    })
    store.close()
  })

  it('không cho đăng ký email trùng hoặc mật khẩu ngắn', async () => {
    const store = new AuthStore(':memory:')
    const auth = new AuthService(store)
    await auth.register({ displayName: 'User One', email: 'user@example.com', password: 'password-123' })

    await expect(auth.register({ displayName: 'User Two', email: 'USER@example.com', password: 'password-456' })).rejects.toMatchObject({ statusCode: 409 })
    await expect(auth.register({ displayName: 'User Two', email: 'other@example.com', password: 'short' })).rejects.toMatchObject({ statusCode: 400 })
    store.close()
  })
})
