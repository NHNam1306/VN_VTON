import type { GarmentRecord, UpdateGarmentInput } from '../domain/garment.js'

export interface GarmentRepository {
  list(userId: string): GarmentRecord[]
  findById(userId: string, id: string): GarmentRecord | null
  create(garment: GarmentRecord): GarmentRecord
  update(userId: string, id: string, input: UpdateGarmentInput): GarmentRecord | null
  delete(userId: string, id: string): boolean
  close(): void
}
