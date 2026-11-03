import type { PublicUser } from './auth-store.js'
import type { MaybePromise } from '../storage/maybe-promise.js'

export type AuthResult = {
  user: PublicUser
  token: string
  refreshToken?: string
  expiresAt: Date
}

export interface AuthBackend {
  register(input: {
    email: string
    displayName: string
    password: string
    legacyClaimToken?: string
  }): Promise<AuthResult>
  login(email: string, password: string): Promise<AuthResult>
  resendSignupConfirmation?(email: string): Promise<void>
  requestPasswordReset?(email: string): Promise<void>
  resetPassword?(input: {
    accessToken: string
    refreshToken: string
    password: string
  }): Promise<AuthResult>
  authenticate(token: string | null): MaybePromise<PublicUser | null>
  refresh?(refreshToken: string | null): Promise<AuthResult | null>
  logout(token: string | null): MaybePromise<void>
  updateProfile?(userId: string, input: { displayName: string }, token?: string | null): Promise<PublicUser>
  changeEmail?(userId: string, input: { newEmail: string; password: string }, token?: string | null): Promise<PublicUser>
  changePassword?(userId: string, input: { currentPassword: string; newPassword: string }, token?: string | null): Promise<void>
}
