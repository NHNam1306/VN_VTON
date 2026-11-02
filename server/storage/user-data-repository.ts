import type { PersonImageRecord } from '../domain/person-image.js'
import type { SavedOutfitRecord } from '../domain/saved-outfit.js'
import type { TryOnResultRecord } from '../domain/try-on-result.js'

export type DeletedUserData = {
  personImageKey: string | null
  resultImageKeys: string[]
}

export interface UserDataRepository {
  getPersonImage(userId: string): PersonImageRecord | null
  upsertPersonImage(userId: string, record: PersonImageRecord): string | null
  listTryOnResults(userId: string): TryOnResultRecord[]
  upsertTryOnResult(userId: string, record: TryOnResultRecord): void
  listSavedOutfits(userId: string): SavedOutfitRecord[]
  findPendingOutfit(userId: string, frontImageUrl: string): SavedOutfitRecord | null
  saveOutfit(userId: string, record: SavedOutfitRecord): void
  deleteSavedOutfit(userId: string, id: string): SavedOutfitRecord | null
  isImageKeySaved(userId: string, key: string): boolean
  clearAllUserData(userId: string): DeletedUserData
  close(): void
}
