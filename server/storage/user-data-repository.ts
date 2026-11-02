import type { PersonImageRecord } from '../domain/person-image.js'
import type { SavedOutfitRecord } from '../domain/saved-outfit.js'
import type { TryOnResultRecord } from '../domain/try-on-result.js'
import type { MaybePromise } from './maybe-promise.js'

export type DeletedUserData = {
  personImageKey: string | null
  resultImageKeys: string[]
}

export interface UserDataRepository {
  getPersonImage(userId: string): MaybePromise<PersonImageRecord | null>
  upsertPersonImage(userId: string, record: PersonImageRecord): MaybePromise<string | null>
  listTryOnResults(userId: string): MaybePromise<TryOnResultRecord[]>
  upsertTryOnResult(userId: string, record: TryOnResultRecord): MaybePromise<void>
  listSavedOutfits(userId: string): MaybePromise<SavedOutfitRecord[]>
  findPendingOutfit(userId: string, frontImageUrl: string): MaybePromise<SavedOutfitRecord | null>
  saveOutfit(userId: string, record: SavedOutfitRecord): MaybePromise<void>
  deleteSavedOutfit(userId: string, id: string): MaybePromise<SavedOutfitRecord | null>
  isImageKeySaved(userId: string, key: string): MaybePromise<boolean>
  clearAllUserData(userId: string): MaybePromise<DeletedUserData>
  close(): MaybePromise<void>
}
