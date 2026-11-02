import type { MaybePromise } from '../storage/maybe-promise.js'
import type { SocialPerson, SocialSnapshot } from './types.js'

export interface SocialService {
  snapshot(userId: string): MaybePromise<SocialSnapshot>
  search(userId: string, query: string): MaybePromise<SocialPerson[]>
  resolveInvite(userId: string, code: string): MaybePromise<SocialPerson>
  profile(userId: string, targetId: string): MaybePromise<unknown>
  trackTemporaryImage(userId: string, key: string): MaybePromise<void>
  canReadImage(userId: string, key: string): MaybePromise<boolean>
  act(userId: string, action: string, body: Record<string, unknown>): MaybePromise<SocialSnapshot>
  close(): MaybePromise<void>
}
