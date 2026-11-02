import type { Garment, GarmentCategory } from '../types/fitting-room'

type GarmentListResponse = { items: Garment[] }

export type CreateGarmentInput = {
  name: string
  category: GarmentCategory
  frontOriginal: File
  frontProcessed: Blob
  backOriginal: File | null
  backProcessed: Blob | null
}

const parseError = async (response: Response) => {
  try {
    const data = await response.json() as { message?: string }
    return data.message ?? 'Yêu cầu không thành công.'
  } catch {
    return 'Yêu cầu không thành công.'
  }
}

export type AiExtractedGarment = {
  id: string
  category: GarmentCategory
  name: string
  description: string
  studioImageUrl: string
  isAiGenerated: boolean
}

export type AiExtractResponse = {
  items: AiExtractedGarment[]
}

export const garmentApi = {
  async list(): Promise<Garment[]> {
    const response = await fetch('/api/garments')
    if (!response.ok) throw new Error(await parseError(response))
    return ((await response.json()) as GarmentListResponse).items
  },

  async aiExtract(
    file: File,
    defaultCategory: GarmentCategory,
    options?: { extractOutfit?: boolean; extractAccessories?: boolean },
  ): Promise<AiExtractResponse> {
    const form = new FormData()
    form.set('file', file)
    form.set('category', defaultCategory)
    if (options?.extractOutfit) {
      form.set('extractOutfit', 'true')
    }
    if (options?.extractAccessories) {
      form.set('extractAccessories', 'true')
    }
    const response = await fetch('/api/garments/ai-extract', { method: 'POST', body: form })
    if (!response.ok) throw new Error(await parseError(response))
    return (await response.json()) as AiExtractResponse
  },

  async create(input: CreateGarmentInput): Promise<Garment> {
    const form = new FormData()
    form.set('name', input.name)
    form.set('category', input.category)
    form.set('frontOriginal', input.frontOriginal)
    form.set('frontProcessed', input.frontProcessed, 'front-removed.png')
    if (input.backOriginal && input.backProcessed) {
      form.set('backOriginal', input.backOriginal)
      form.set('backProcessed', input.backProcessed, 'back-removed.png')
    }

    const response = await fetch('/api/garments', { method: 'POST', body: form })
    if (!response.ok) throw new Error(await parseError(response))
    return response.json() as Promise<Garment>
  },

  async update(id: string, input: { name?: string; category?: GarmentCategory }): Promise<Garment> {
    const response = await fetch(`/api/garments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error(await parseError(response))
    return response.json() as Promise<Garment>
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/garments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error(await parseError(response))
  },
}
