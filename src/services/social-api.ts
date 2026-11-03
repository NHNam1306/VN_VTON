import type { SocialPerson, SocialSnapshot, SharedOutfit } from '../../server/social/types'
import { apiFetch } from './api-client'
async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await apiFetch('/api/social' + path, body ? { method: 'POST', headers: {'Content-Type':'application/json'}, body:JSON.stringify(body) } : { cache:'no-store' })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message ?? 'Không thể kết nối.')
  return data as T
}
export const socialApi = {
  snapshot: () => request<SocialSnapshot>(''),
  act: (action: string, body: Record<string, unknown>) => request<SocialSnapshot>('/'+action,body),
  uploadAvatar: async (file: File) => {
    const form = new FormData()
    form.set('avatar', file)
    const response = await apiFetch('/api/social/avatar', { method: 'POST', body: form })
    const data = await response.json() as SocialSnapshot | { message?: string }
    if (!response.ok) throw new Error('message' in data && data.message ? data.message : 'Không thể cập nhật ảnh đại diện.')
    return data as SocialSnapshot
  },
  search: (q: string) => request<SocialPerson[]>('/search?q='+encodeURIComponent(q)),
  invite: (code: string) => request<SocialPerson>('/invite?code='+encodeURIComponent(code)),
  profile: (id: string) => request<{person:SocialPerson;outfits:SharedOutfit[]}>('/profile/'+encodeURIComponent(id)),
}
