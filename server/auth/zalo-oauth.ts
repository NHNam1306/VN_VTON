import { createHash, randomBytes } from 'node:crypto'
import { AuthError } from './auth-service.js'

const AUTHORIZE_ENDPOINT = 'https://oauth.zaloapp.com/v4/permission'
const TOKEN_ENDPOINT = 'https://oauth.zaloapp.com/v4/access_token'
const PROFILE_ENDPOINT = 'https://graph.zalo.me/v2.0/me'
const REQUEST_TIMEOUT_MS = 10_000

export type ZaloOAuthConfig = {
  appId: string
  appSecret: string
  /** Must match a Redirect URI registered on the Zalo app, exactly. */
  redirectUri: string
  fetchImpl?: typeof fetch
}

/** The person as Zalo knows them. Zalo never returns an email address. */
export type ZaloProfile = {
  id: string
  name: string
}

const SIGN_IN_FAILED = 'Không thể đăng nhập bằng Zalo. Vui lòng thử lại.'
const UNREACHABLE = 'Không kết nối được tới Zalo. Vui lòng thử lại sau.'

/**
 * Zalo's authorization-code flow (Login v4), run by this server.
 *
 * Unlike Google, Zalo is not a provider Supabase can verify for us: there is no ID
 * token to hand over. This server authenticates the person against Zalo and then
 * asks the auth backend for a session for that Zalo id
 * (`AuthBackend.signInWithExternalIdentity`).
 *
 * Quirks worth remembering: the app secret travels in a `secret_key` header rather
 * than the body, the id token endpoint is a plain form POST, and Graph reports
 * failures with HTTP 200 and a non-zero `error` field.
 */
export class ZaloOAuth {
  private readonly fetch: typeof fetch

  constructor(private readonly config: ZaloOAuthConfig) {
    const fetchImpl = config.fetchImpl ?? fetch
    this.fetch = (input, init) => fetchImpl(input, {
      ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]) : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  }

  get redirectUri(): string {
    return this.config.redirectUri
  }

  /** The PKCE secret for one sign-in; it stays on this server until the code comes back. */
  createVerifier(): string {
    // base64url output uses only unreserved characters, as Zalo requires (43..128 of them).
    return randomBytes(48).toString('base64url')
  }

  authorizationUrl(state: string, codeVerifier: string): string {
    const url = new URL(AUTHORIZE_ENDPOINT)
    url.searchParams.set('app_id', this.config.appId)
    url.searchParams.set('redirect_uri', this.config.redirectUri)
    url.searchParams.set('state', state)
    url.searchParams.set('code_challenge', createHash('sha256').update(codeVerifier).digest('base64url'))
    return url.toString()
  }

  /** Redeems the authorization code and returns a Zalo access token. */
  async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    let response: Response
    try {
      response = await this.fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          secret_key: this.config.appSecret,
        },
        body: new URLSearchParams({
          code,
          app_id: this.config.appId,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }).toString(),
      })
    } catch {
      throw new AuthError(502, UNREACHABLE)
    }
    const body = await response.json().catch(() => null) as {
      access_token?: string
      error?: number | string
      error_name?: string
      error_description?: string
      error_reason?: string
    } | null
    if (!response.ok || !body?.access_token) {
      console.warn('[auth.zalo] token exchange failed', {
        status: response.status,
        error: body?.error,
        name: body?.error_name,
        description: body?.error_description ?? body?.error_reason,
      })
      throw new AuthError(400, SIGN_IN_FAILED)
    }
    return body.access_token
  }

  /** Reads the Zalo id and display name the person granted access to. */
  async fetchProfile(accessToken: string): Promise<ZaloProfile> {
    const url = new URL(PROFILE_ENDPOINT)
    url.searchParams.set('fields', 'id,name')
    let response: Response
    try {
      response = await this.fetch(url.toString(), {
        method: 'GET',
        headers: { access_token: accessToken },
      })
    } catch {
      throw new AuthError(502, UNREACHABLE)
    }
    const body = await response.json().catch(() => null) as {
      id?: string
      name?: string
      error?: number | string
      message?: string
    } | null
    // Graph answers 200 with `error` set when the token is wrong or expired.
    const failed = body?.error !== undefined && body.error !== 0 && body.error !== '0'
    if (!response.ok || failed || !body?.id) {
      console.warn('[auth.zalo] profile request failed', { status: response.status, error: body?.error, message: body?.message })
      throw new AuthError(400, SIGN_IN_FAILED)
    }
    return { id: String(body.id), name: typeof body.name === 'string' ? body.name.trim().slice(0, 50) : '' }
  }
}

export const createZaloOAuth = (redirectUri: string, fetchImpl?: typeof fetch): ZaloOAuth | null => {
  const appId = process.env.ZALO_APP_ID?.trim()
  const appSecret = process.env.ZALO_APP_SECRET?.trim()
  if (!appId || !appSecret) return null
  return new ZaloOAuth({ appId, appSecret, redirectUri, fetchImpl })
}
