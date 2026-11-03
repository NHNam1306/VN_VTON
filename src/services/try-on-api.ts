import { applyOutfitCustomizations, removeOutfitCustomization } from './outfit-customizations'
import type { SavedOutfit, TryOnAngle, TryOnResult } from '../types/fitting-room'
import { apiFetch } from './api-client'

const parseError = async (response: Response) => {
  try {
    const data = await response.json() as { message?: string }
    return data.message ?? 'Không thể tạo ảnh.'
  } catch {
    return 'Không thể tạo ảnh.'
  }
}

export const tryOnApi = {
  async listResults(): Promise<TryOnResult[]> {
    const response = await fetch('/api/generations/results')
    if (!response.ok) throw new Error(await parseError(response))
    return ((await response.json()) as { items: TryOnResult[] }).items
  },

  async generateAngle(angle: TryOnAngle, garmentIds: string[], preservePose = true, privacyConfirmed = false): Promise<TryOnResult> {
    const response = await apiFetch(`/api/generations/angles/${angle}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        garmentIds,
        privacyConfirmed,
        preservePose,
      }),
    })
    if (!response.ok) throw new Error(await parseError(response))
    return response.json() as Promise<TryOnResult>
  },

  async listOutfits(): Promise<SavedOutfit[]> {
    const response = await fetch('/api/generations/outfits')
    if (!response.ok) throw new Error(await parseError(response))
    const items = ((await response.json()) as { items: SavedOutfit[] }).items
    return applyOutfitCustomizations(items)
  },

  async deleteOutfit(id: string): Promise<void> {
    const response = await apiFetch(`/api/generations/outfits/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error(await parseError(response))
    removeOutfitCustomization(id)
  },
}
