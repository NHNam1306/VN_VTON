import type { GarmentCategory } from '../domain/garment.js'
import type { SubscriptionPlanId } from '../plans/types.js'

/** Where the reference garment of a live preview comes from. */
export type LivePreviewSource = 'wardrobe' | 'upload'

export type LivePreviewSessionRecord = {
  id: string
  userId: string
  planId: SubscriptionPlanId | 'admin'
  source: LivePreviewSource
  garmentId: string | null
  category: GarmentCategory
  seconds: number
  tokensIssued: number
  createdAt: string
}

export type NewLivePreviewSession = Omit<LivePreviewSessionRecord, 'tokensIssued' | 'createdAt'>

export type LivePreviewStatus = {
  /** False when the server has no Decart key: clients hide the feature. */
  enabled: boolean
  /** True when the current plan includes at least one session per window. */
  included: boolean
  unlimited: boolean
  sessionSeconds: number
  limit: number
  used: number
  remaining: number | null
  windowDays: number
  /** When the oldest session in the window stops counting; null if none is counted. */
  nextResetAt: string | null
}

export type LivePreviewStartResponse = {
  session: { id: string; model: string; seconds: number; tokenWindowEndsAt: string }
  reference: { prompt: string; imageBase64: string | null; mimeType: string | null }
  status: LivePreviewStatus
}

export type LivePreviewTokenResponse = {
  apiKey: string
  expiresAt: string
  model: string
  seconds: number
}

export class LivePreviewError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly publicMessage: string,
  ) {
    super(publicMessage)
  }
}
