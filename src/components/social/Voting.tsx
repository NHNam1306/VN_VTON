import { useState } from 'react'
import { Clock, ChevronRight, Star, Trophy, Users, Send, X, Plus } from 'lucide-react'
import type { SharedOutfit, SocialPoll, SocialSnapshot } from '../../../server/social/types'
import type { Act } from './SocialPage'

const btnBase = 'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition'
const btnPrimary = `${btnBase} bg-[#16171b] text-white hover:bg-black shadow-sm`
const btnGhost = `${btnBase} border border-black/[0.09] bg-white/70 text-ink/60 hover:bg-white hover:text-ink`
const btnSuccess = `${btnBase} border border-sage-300 bg-sage-50 text-sage-800 hover:bg-sage-100`

export function PollComposer({ data, outfits, act, onDone, onCreateOutfit }: { data: SocialSnapshot; outfits: SharedOutfit[]; act: Act; onDone: () => void; onCreateOutfit: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [people, setPeople] = useState<string[]>([])
  const [hours, setHours] = useState(24)
  const [title, setTitle] = useState('')
  const [review, setReview] = useState(false)
  const recipients = data.friends.filter(f => people.includes(f.id))

  return (
    <div className="mb-6 rounded-[22px] border border-black/[0.07] bg-white/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">Hỏi những người hiểu gu của bạn</h2>
        <button onClick={onDone} className="grid size-7 place-items-center rounded-full text-ink/35 hover:bg-black/[0.06] transition" aria-label="Đóng">
          <X size={15} />
        </button>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-ink/45">Chọn 1–3 outfit. Người nhận thấy tên và lựa chọn của nhau sau khi bỏ phiếu.</p>

      {review ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-sage-50 border border-sage-200 p-4 text-sm">
            <h3 className="font-bold text-ink mb-1">{title || 'Mình nên chọn bộ nào?'}</h3>
            <p className="text-xs text-ink/50">{selected.length} outfit · {hours} giờ</p>
            <p className="mt-2 text-xs"><span className="font-semibold text-ink">Chỉ những người này được xem: </span>{recipients.map(p => p.name).join(', ')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void act('poll-create', { outfitIds: selected, recipientIds: recipients.map(p => p.id), title, hours }).then(ok => { if (ok) onDone() })} className={btnPrimary}>
              <Send size={13} /> Gửi bình chọn
            </button>
            <button className={btnGhost} onClick={() => setReview(false)}>Sửa lại</button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-ink/50 mb-1">Câu hỏi</label>
            <input value={title} maxLength={120} placeholder="Mình nên chọn bộ nào?" onChange={e => setTitle(e.target.value)} className="w-full rounded-xl border border-black/[0.09] bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400 placeholder:text-ink/25" />
          </div>

          {/* Outfit grid */}
          <div>
            <label className="block text-xs font-medium text-ink/50 mb-2">Chọn outfit (tối đa 3)</label>
            {outfits.length === 0 ? (
              <button onClick={onCreateOutfit} className={`${btnGhost} w-full justify-center py-6 border-dashed`}>
                <Plus size={14} /> Tạo outfit mới trong Phòng thử
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {outfits.map((o, i) => {
                  const checked = selected.includes(o.id)
                  return (
                    <label key={o.id} className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 transition ${checked ? 'border-sage-600 bg-sage-50' : 'border-black/[0.07] bg-sage-50/40 hover:border-sage-300'}`}>
                      <input type="checkbox" aria-label={`Outfit ${i + 1}`} checked={checked} disabled={!checked && selected.length >= 3} className="sr-only" onChange={() => setSelected(checked ? selected.filter(id => id !== o.id) : [...selected, o.id])} />
                      <img src={o.frontImageUrl} alt={`Outfit ${i + 1}`} className="h-40 w-full object-contain" />
                      {checked && (
                        <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-sage-600 text-white">
                          <Star size={10} fill="currentColor" />
                        </span>
                      )}
                      <p className="py-1.5 text-center text-[10px] font-semibold text-ink/50">Outfit {i + 1}</p>
                    </label>
                  )
                })}
              </div>
            )}
            {outfits.length > 0 && (
              <button className={`mt-2 ${btnGhost} text-[10px]`} onClick={onCreateOutfit}><Plus size={11} /> Thêm outfit mới</button>
            )}
          </div>

          {/* Recipients */}
          <div>
            <h3 className="text-xs font-medium text-ink/50 mb-2">Người nhận</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button className={btnGhost} onClick={() => setPeople(data.friends.map(f => f.id))}>Tất cả bạn bè</button>
              <button className={btnGhost} onClick={() => setPeople([])}>Bỏ chọn</button>
              {data.groups.length > 0 && (
                <select defaultValue="" onChange={e => { const group = data.groups.find(g => g.id === e.target.value); if (group) setPeople(group.members.filter(m => data.friends.some(f => f.id === m.id)).map(m => m.id)) }} className="rounded-full border border-black/[0.09] bg-white px-3 py-1.5 text-xs font-semibold text-ink/60 outline-none">
                  <option value="">Chọn nhóm…</option>
                  {data.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-0.5 max-h-40 overflow-auto">
              {data.friends.length === 0
                ? <p className="text-xs text-ink/40">Bạn cần <a href="/ban-be" className="font-semibold underline underline-offset-3">kết bạn</a> trước khi gửi.</p>
                : data.friends.map(f => (
                    <label key={f.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-sage-50 transition">
                      <input type="checkbox" checked={people.includes(f.id)} onChange={() => setPeople(people.includes(f.id) ? people.filter(id => id !== f.id) : [...people, f.id])} className="accent-sage-700" />
                      <span className="text-base">{f.avatar}</span>
                      <span className="text-sm font-medium text-ink">{f.name}</span>
                    </label>
                  ))
              }
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-ink/35">
              Ai được xem: {recipients.map(p => p.name).join(', ') || 'chưa chọn'}
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-ink/50 mb-1">Thời hạn</label>
            <select value={hours} onChange={e => setHours(Number(e.target.value))} className="rounded-xl border border-black/[0.09] bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400">
              <option value={1}>1 giờ</option>
              <option value={24}>24 giờ</option>
              <option value={72}>72 giờ</option>
            </select>
          </div>

          <button disabled={!selected.length || !recipients.length} onClick={() => setReview(true)} className={btnPrimary}>
            <ChevronRight size={14} /> Xem lại người nhận
          </button>
        </div>
      )}
    </div>
  )
}

export function PollCard({ poll, me, act, onZoom }: { poll: SocialPoll; me: string; act: Act; onZoom: (url: string) => void }) {
  const owner = poll.owner.id === me
  const show = owner || !!poll.myVote || poll.closed
  const total = poll.votes.length
  const maximum = Math.max(0, ...poll.outfits.map(o => poll.votes.filter(v => v.outfitId === o.id).length))
  const remaining = Math.max(0, Math.ceil((poll.expiresAt - Date.now()) / 60000))

  const remainingText = remaining >= 60
    ? `${Math.floor(remaining / 60)} giờ ${remaining % 60} phút`
    : `${remaining} phút`

  return (
    <article id={`poll-${poll.id}`} className="social-poll mb-5 rounded-[22px] border border-black/[0.07] bg-white/80 p-5 shadow-sm backdrop-blur-sm">
      {/* Header */}
      <header className="mb-4 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sage-100 to-sage-200 text-xl">
          {poll.owner.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{poll.owner.name}</p>
          <p className="flex items-center gap-1 text-xs text-ink/40">
            <Clock size={10} />
            {poll.closed ? 'Đã kết thúc' : `Còn ${remainingText}`}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
          poll.closed ? 'bg-amber-100 text-amber-700' : poll.myVote ? 'bg-sage-100 text-sage-700' : 'bg-blue-50 text-blue-600'
        }`}>
          {poll.closed ? 'Kết quả' : poll.myVote ? 'Đã chọn' : 'Chờ ý kiến'}
        </span>
      </header>

      <h2 className="mb-1 text-base font-bold text-ink">{poll.title}</h2>
      <p className="mb-4 text-xs text-ink/40">
        <a href={`/bang-tin?poll=${poll.id}`} className="underline underline-offset-3 hover:text-sage-700 transition">Mở bình chọn</a>
        {` · ${total} phiếu`}
      </p>

      {/* Vote strip */}
      <div className="social-vote-strip">
        {poll.outfits.map((o, i) => {
          const voters = poll.votes.filter(v => v.outfitId === o.id)
          const percent = total ? Math.round(voters.length / total * 100) : 0
          const isWinner = poll.winnerId === o.id
          const isSelected = poll.myVote === o.id

          return (
            <section key={o.id} className={`social-vote-option min-w-0 rounded-2xl border-2 p-3 transition ${isSelected ? 'border-sage-500 bg-sage-50/60' : 'border-black/[0.07] bg-sage-50/30'}`}>
              {/* Images */}
              <div className="social-image-pair mb-3 rounded-xl overflow-hidden">
                <button className="flex-1 border-0 bg-transparent p-0" onClick={() => onZoom(o.frontImageUrl)}>
                  <img src={o.frontImageUrl} alt={`Outfit ${i + 1} mặt trước`} className="h-52 w-full object-contain bg-[#f1f0eb] rounded-xl hover:opacity-90 transition" />
                </button>
                {o.backImageUrl && (
                  <button className="flex-1 border-0 bg-transparent p-0" onClick={() => onZoom(o.backImageUrl!)}>
                    <img src={o.backImageUrl} alt={`Outfit ${i + 1} mặt sau`} className="h-52 w-full object-contain bg-[#f1f0eb] rounded-xl hover:opacity-90 transition" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-bold text-ink">Phương án {i + 1}</h3>
                {isWinner && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700"><Trophy size={9} /> Chính thức</span>}
              </div>

              {!owner && !poll.closed && (
                <button
                  aria-pressed={isSelected}
                  onClick={() => void act('vote', { id: poll.id, outfitId: o.id })}
                  className={isSelected ? btnSuccess : btnGhost}
                >
                  {isSelected ? '✓ Đang chọn' : 'Chọn bộ này'}
                </button>
              )}

              {show && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink/60">
                    <span>{percent}%</span>
                    <span>{voters.length} phiếu</span>
                  </div>
                  <progress value={voters.length} max={Math.max(total, 1)} aria-label={`Kết quả phương án ${i + 1}`} className="w-full accent-sage-600 h-1.5 rounded-full" />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {voters.map(v => (
                      <span key={v.user.id} title={v.user.username} className="flex items-center gap-1 rounded-full border border-black/[0.06] bg-white px-2 py-0.5 text-[10px] text-ink/60">
                        {v.user.avatar} {v.user.name}
                      </span>
                    ))}
                  </div>
                  {owner && poll.closed && maximum > 0 && voters.length === maximum && (
                    <button className={`mt-2 ${btnSuccess}`} onClick={() => void act('poll-winner', { id: poll.id, outfitId: o.id })}>
                      <Trophy size={11} /> Lưu làm outfit chính thức
                    </button>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {!show && (
        <p className="mt-3 text-center text-xs text-ink/40">Bỏ phiếu để xem kết quả. Bạn có thể đổi lựa chọn trước khi hết hạn.</p>
      )}

      <details className="mt-4 text-xs">
        <summary className="cursor-pointer font-semibold text-ink/40 hover:text-ink transition list-none">
          <span className="flex items-center gap-1"><Users size={11} /> Người được xem · {poll.recipients.length}</span>
        </summary>
        <p className="mt-1.5 leading-relaxed text-ink/35">{poll.recipients.map(p => p.name).join(', ')}</p>
      </details>

      {owner && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer font-semibold text-ink/40 hover:text-ink transition list-none">Quản lý bình chọn</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {!poll.closed && (
              <button onClick={() => void act('poll-close', { id: poll.id })} className={btnGhost}>Đóng bình chọn ngay</button>
            )}
            <button className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition" onClick={() => void act('poll-delete', { id: poll.id })}>
              Xoá bình chọn và kết quả
            </button>
          </div>
        </details>
      )}
    </article>
  )
}
