import { useState } from 'react'
import { ImageIcon, Lock, Users, Layers } from 'lucide-react'
import type { SocialSnapshot, SharedOutfit } from '../../../server/social/types'
import type { Act } from './SocialPage'

export function SharingPanel({ data, outfits, act }: { data: SocialSnapshot; outfits: SharedOutfit[]; act: Act }) {
  return (
    <div className="rounded-[22px] border border-black/[0.07] bg-white/80 p-5 shadow-sm backdrop-blur-sm">
      <h2 className="mb-1 text-sm font-bold text-ink">Quyền xem outfit</h2>
      <p className="mb-4 text-xs leading-relaxed text-ink/45">
        Outfit chưa đặt riêng sẽ dùng quyền mặc định trong hồ sơ của bạn. Bình chọn chia sẻ riêng với người nhận đã chọn.
        Chuyển về riêng tư cũng xoá bình chọn chứa outfit đó.
      </p>
      {outfits.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <ImageIcon size={28} className="text-ink/20" />
          <p className="text-sm text-ink/40">Tạo và lưu outfit ở Phòng thử để chia sẻ.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map(o => <Policy key={o.id} outfit={o} data={data} act={act} />)}
        </div>
      )}
    </div>
  )
}

function Policy({ outfit, data, act }: { outfit: SharedOutfit; data: SocialSnapshot; act: Act }) {
  const policy = data.policies.find(p => p.outfitId === outfit.id)
  const [visibility, setVisibility] = useState(policy?.visibility ?? data.me.defaultVisibility)
  const [groups, setGroups] = useState(policy?.groupIds ?? [])

  const visibilityIcon = {
    private: <Lock size={11} />,
    friends: <Users size={11} />,
    groups: <Layers size={11} />,
  }[visibility]

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-black/[0.07] bg-sage-50/50 p-3">
      <div className="relative overflow-hidden rounded-xl bg-[#f1f0eb]">
        <img src={outfit.frontImageUrl} alt="Outfit của bạn" className="h-44 w-full object-contain" />
        {policy?.official && (
          <span className="absolute bottom-2 left-2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[9px] font-bold text-white">★ Outfit chính thức</span>
        )}
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium text-ink/40">Ai được xem?</label>
        <select
          value={visibility}
          onChange={e => setVisibility(e.target.value as typeof visibility)}
          className="w-full rounded-xl border border-black/[0.09] bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:ring-2 focus:ring-sage-400"
        >
          <option value="private">🔒 Chỉ mình tôi</option>
          <option value="friends">👥 Bạn bè</option>
          <option value="groups">🗂 Nhóm đã chọn</option>
        </select>
      </div>

      {visibility === 'groups' && data.groups.length > 0 && (
        <div className="flex flex-col gap-1">
          {data.groups.map(g => (
            <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-sage-100 transition">
              <input
                type="checkbox"
                checked={groups.includes(g.id)}
                onChange={() => setGroups(groups.includes(g.id) ? groups.filter(id => id !== g.id) : [...groups, g.id])}
                className="accent-sage-700"
              />
              <span className="font-medium text-ink">{g.name}</span>
            </label>
          ))}
        </div>
      )}

      <button
        onClick={() => void act('outfit-policy', { outfitId: outfit.id, visibility, groupIds: groups })}
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#16171b] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-black"
      >
        {visibilityIcon} Lưu quyền xem
      </button>
    </article>
  )
}
