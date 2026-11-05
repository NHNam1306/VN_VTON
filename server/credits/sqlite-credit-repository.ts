import Database from 'better-sqlite3'
import type { CreditRepository } from './credit-repository.js'

export class SqliteCreditRepository implements CreditRepository {
  private readonly database: Database.Database

  constructor(databasePath: string) {
    this.database = new Database(databasePath)
    this.database.pragma('journal_mode = WAL')
    const columns = this.database.pragma('table_info(users)') as Array<{ name: string }>
    if (!columns.some((column) => column.name === 'credit_balance')) {
      this.database.exec('ALTER TABLE users ADD COLUMN credit_balance INTEGER NOT NULL DEFAULT 10')
    }
  }

  getBalance(userId: string): number | null {
    const row = this.database.prepare('SELECT credit_balance FROM users WHERE id = ?').get(userId) as
      | { credit_balance: number }
      | undefined
    return row?.credit_balance ?? null
  }

  tryConsume(userId: string, amount: number): number | null {
    const result = this.database.prepare(
      'UPDATE users SET credit_balance = credit_balance - ? WHERE id = ? AND credit_balance >= ?',
    ).run(amount, userId, amount)
    return result.changes === 1 ? this.getBalance(userId) : null
  }

  refund(userId: string, amount: number): number | null {
    const result = this.database.prepare(
      'UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?',
    ).run(amount, userId)
    return result.changes === 1 ? this.getBalance(userId) : null
  }

  close(): void {
    this.database.close()
  }
}
