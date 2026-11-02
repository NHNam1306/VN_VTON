import pg from 'pg'

const { Pool } = pg

export type PostgresPool = pg.Pool

const readDatabaseCa = (): string | undefined => {
  const encoded = process.env.DATABASE_CA_CERT_BASE64?.trim()
  if (!encoded) return undefined
  const certificate = Buffer.from(encoded, 'base64').toString('utf8').trim()
  if (!certificate.includes('-----BEGIN CERTIFICATE-----') || !certificate.includes('-----END CERTIFICATE-----')) {
    throw new Error('DATABASE_CA_CERT_BASE64 không chứa certificate PEM hợp lệ.')
  }
  return certificate
}

export const createPostgresPool = (connectionString: string): PostgresPool => {
  if (!connectionString.trim()) throw new Error('DATABASE_URL chưa được cấu hình.')
  const url = new URL(connectionString)
  const ca = readDatabaseCa()

  // Khi truyền TLS options trực tiếp, phải bỏ các tham số SSL khỏi URL vì
  // pg-connection-string có thể ghi đè object `ssl` và làm mất CA đã cấu hình.
  if (ca) {
    url.searchParams.delete('sslmode')
    url.searchParams.delete('sslrootcert')
    url.searchParams.delete('uselibpqcompat')
  } else if (!url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'verify-full')
  }
  return new Pool({
    connectionString: url.toString(),
    ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}
