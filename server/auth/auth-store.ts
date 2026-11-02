import Database from 'better-sqlite3'

export type AuthUser = {
  id: string
  email: string
  displayName: string
  passwordHash: string
  passwordSalt: string
  createdAt: string
}

export type PublicUser = Pick<AuthUser, 'id' | 'email' | 'displayName' | 'createdAt'>

export class AuthStore {
  private readonly database: Database.Database

  constructor(databasePath: string) {
    this.database = new Database(databasePath)
    this.database.pragma('journal_mode = WAL')
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
    `)
  }

  countUsers(): number {
    return (this.database.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count
  }

  createUser(user: AuthUser): PublicUser {
    this.database.prepare(`
      INSERT INTO users (id, email, display_name, password_hash, password_salt, created_at)
      VALUES (@id, @email, @displayName, @passwordHash, @passwordSalt, @createdAt)
    `).run(user)
    const { passwordHash: _hash, passwordSalt: _salt, ...publicUser } = user
    return publicUser
  }

  findUserByEmail(email: string): AuthUser | null {
    return this.fromRow(this.database.prepare('SELECT * FROM users WHERE email = ?').get(email))
  }

  findUserById(id: string): PublicUser | null {
    const user = this.fromRow(this.database.prepare('SELECT * FROM users WHERE id = ?').get(id))
    if (!user) return null
    const { passwordHash: _hash, passwordSalt: _salt, ...publicUser } = user
    return publicUser
  }

  createSession(tokenHash: string, userId: string, expiresAt: string): void {
    this.database.prepare(`
      INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(tokenHash, userId, expiresAt, new Date().toISOString())
  }

  findUserBySession(tokenHash: string): PublicUser | null {
    const row = this.database.prepare(`
      SELECT users.* FROM auth_sessions
      JOIN users ON users.id = auth_sessions.user_id
      WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?
    `).get(tokenHash, new Date().toISOString())
    const user = this.fromRow(row)
    if (!user) return null
    const { passwordHash: _hash, passwordSalt: _salt, ...publicUser } = user
    return publicUser
  }

  deleteSession(tokenHash: string): void {
    this.database.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(tokenHash)
  }

  deleteExpiredSessions(): void {
    this.database.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(new Date().toISOString())
  }

  claimLegacyData(userId: string): void {
    const tables = ['garments', 'person_image', 'try_on_images', 'saved_outfits']
    const transaction = this.database.transaction(() => {
      for (const table of tables) {
        const exists = this.database.prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        ).get(table)
        if (exists) this.database.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id = 'legacy'`).run(userId)
      }
    })
    transaction()
  }

  close(): void {
    this.database.close()
  }

  private fromRow(row: unknown): AuthUser | null {
    if (!row) return null
    const value = row as Record<string, string>
    return {
      id: value.id!,
      email: value.email!,
      displayName: value.display_name!,
      passwordHash: value.password_hash!,
      passwordSalt: value.password_salt!,
      createdAt: value.created_at!,
    }
  }
}

