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
  legacyDataClaimToken: process.env.LEGACY_DATA_CLAIM_TOKEN?.trim() || undefined,
}
