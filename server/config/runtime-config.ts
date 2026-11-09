const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const optionalPositiveInteger = (value: string | undefined): number | undefined => {
  if (value === undefined || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export const runtimeConfig = {
  authSessionDays: positiveInteger(process.env.AUTH_SESSION_DAYS, 30),
  secureCookies: process.env.COOKIE_SECURE === undefined
    ? process.env.NODE_ENV === 'production'
    : process.env.COOKIE_SECURE === 'true',
  trustProxyHops: optionalPositiveInteger(process.env.TRUST_PROXY_HOPS),
  aiRequestsPerWindow: positiveInteger(process.env.AI_REQUESTS_PER_15_MIN, 10),
  aiRequestWindowMs: 15 * 60 * 1000,
  // Total AI requests (extract + generation) allowed per rolling day across all users; unset disables.
  aiDailyRequestLimit: optionalPositiveInteger(process.env.AI_DAILY_REQUEST_LIMIT),
  apiRequestsPerMinute: positiveInteger(process.env.API_REQUESTS_PER_MINUTE, 600),
  apiBurst: positiveInteger(process.env.API_RATE_LIMIT_BURST, 120),
  // Shared ceiling per IP across all sessions; defaults to 4x the per-session limit.
  apiIpRequestsPerMinute: positiveInteger(
    process.env.API_IP_REQUESTS_PER_MINUTE,
    positiveInteger(process.env.API_REQUESTS_PER_MINUTE, 600) * 4,
  ),
  apiIpBurst: positiveInteger(
    process.env.API_IP_RATE_LIMIT_BURST,
    positiveInteger(process.env.API_RATE_LIMIT_BURST, 120) * 4,
  ),
  authLoginAccountPerWindow: positiveInteger(process.env.AUTH_LOGIN_ACCOUNT_PER_15_MIN, 10),
  authLoginIpPerWindow: positiveInteger(process.env.AUTH_LOGIN_IP_PER_15_MIN, 60),
  authRegisterIpPerHour: positiveInteger(process.env.AUTH_REGISTER_IP_PER_HOUR, 20),
  passwordResetAccountPerWindow: positiveInteger(process.env.AUTH_RESET_ACCOUNT_PER_15_MIN, 5),
  passwordResetIpPerWindow: positiveInteger(process.env.AUTH_RESET_IP_PER_15_MIN, 30),
  legacyDataClaimToken: process.env.LEGACY_DATA_CLAIM_TOKEN?.trim() || undefined,
  adminEmails: (process.env.ADMIN_EMAILS ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean),
}
