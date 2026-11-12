import type { GarmentCategory } from './fitting-room'

export type LivePreviewStatus = {
  enabled: boolean
  included: boolean
  unlimited: boolean
  sessionSeconds: number
  limit: number
  used: number
  remaining: number | null
  windowDays: number
  nextResetAt: string | null
}

export type LivePreviewStartRequest =
  | { source: 'wardrobe'; garmentId: string }
  | { source: 'upload'; category: GarmentCategory }

export type LivePreviewStartResponse = {
  session: { id: string; model: string; seconds: number; tokenWindowEndsAt: string }
  reference: { prompt: string; imageBase64: string | null; mimeType: string | null }
  status: LivePreviewStatus
}

export type LivePreviewToken = { apiKey: string; expiresAt: string; model: string; seconds: number }
