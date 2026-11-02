import type { GarmentCategory, GarmentRecord, UpdateGarmentInput } from '../domain/garment.js'
import type { GarmentRepository } from './garment-repository.js'
import type { PostgresPool } from './postgres.js'

type GarmentRow = {
  id: string
  user_id: string
  name: string
  category: GarmentCategory
  front_original_key: string
  front_processed_key: string
  back_original_key: string | null
  back_processed_key: string | null
  created_at: Date | string
}

const fromRow = (row: GarmentRow): GarmentRecord => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  category: row.category,
  frontOriginalKey: row.front_original_key,
  frontProcessedKey: row.front_processed_key,
  backOriginalKey: row.back_original_key,
  backProcessedKey: row.back_processed_key,
  createdAt: new Date(row.created_at).toISOString(),
})

export class PostgresGarmentRepository implements GarmentRepository {
  constructor(private readonly pool: PostgresPool) {}

  async list(userId: string): Promise<GarmentRecord[]> {
    const result = await this.pool.query<GarmentRow>(
      'SELECT * FROM garments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    )
    return result.rows.map(fromRow)
  }

  async findById(userId: string, id: string): Promise<GarmentRecord | null> {
    const result = await this.pool.query<GarmentRow>(
      'SELECT * FROM garments WHERE user_id = $1 AND id = $2 LIMIT 1',
      [userId, id],
    )
    return result.rows[0] ? fromRow(result.rows[0]) : null
  }

  async create(garment: GarmentRecord): Promise<GarmentRecord> {
    await this.pool.query(`
      INSERT INTO garments (
        id, user_id, name, category, front_original_key, front_processed_key,
        back_original_key, back_processed_key, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      garment.id, garment.userId, garment.name, garment.category,
      garment.frontOriginalKey, garment.frontProcessedKey,
      garment.backOriginalKey, garment.backProcessedKey, garment.createdAt,
    ])
    return garment
  }

  async update(userId: string, id: string, input: UpdateGarmentInput): Promise<GarmentRecord | null> {
    const result = await this.pool.query<GarmentRow>(`
      UPDATE garments
      SET name = COALESCE($3, name), category = COALESCE($4, category)
      WHERE user_id = $1 AND id = $2
      RETURNING *
    `, [userId, id, input.name ?? null, input.category ?? null])
    return result.rows[0] ? fromRow(result.rows[0]) : null
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM garments WHERE user_id = $1 AND id = $2', [userId, id])
    return (result.rowCount ?? 0) > 0
  }

  async close(): Promise<void> {}
}
