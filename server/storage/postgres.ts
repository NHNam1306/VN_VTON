import pg from 'pg'

const { Pool } = pg

export type PostgresPool = pg.Pool

export const createPostgresPool = (connectionString: string): PostgresPool => {
  if (!connectionString.trim()) throw new Error('DATABASE_URL chưa được cấu hình.')
  const url = new URL(connectionString)
  if (!url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'require')
  return new Pool({
    connectionString: url.toString(),
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}
