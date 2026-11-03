import { ArrowLeft, CalendarDays, Images, LoaderCircle, Maximize2, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { socialApi } from '../services/social-api'
import { MAX_SAVED_OUTFITS, type SavedOutfit } from '../types/fitting-room'

type OutfitHistoryProps = {
  outfits: SavedOutfit[]
  isLoading: boolean
  error: string | null
  onDelete: (id: string) => Promise<void>
  onBack: () => void
}

const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

export function OutfitHistory({ outfits, isLoading, error, onDelete, onBack }: OutfitHistoryProps) {
  const [officialIds, setOfficialIds] = useState<string[]>([])
  useEffect(() => {
    let active = true
    void socialApi.snapshot().then(data => { if(active) setOfficialIds(data.policies.filter(p => p.official).map(p => p.outfitId)) }).catch(() => {})
    return () => { active = false }
  }, [])
  const [preview, setPreview] = useState<SavedOutfit | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const remove = async (outfit: SavedOutfit) => {
    if (!window.confirm('Xoá bộ ảnh này khỏi Bộ đồ của tôi?')) return
    setDeletingId(outfit.id)
    setDeleteError(null)
    try {
      await onDelete(outfit.id)
      if (preview?.id === outfit.id) setPreview(null)
    } catch (removeError) {
      setDeleteError(removeError instanceof Error ? removeError.message : 'Không thể xoá bộ ảnh.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="overflow-hidden rounded-[32px] border border-black/[0.065] bg-white/80 shadow-[0_20px_50px_rgba(23,33,29,0.06)] backdrop-blur-md">
        <div className="flex flex-col gap-4 border-b border-black/[0.055] px-6 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-8">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sage-800">
              <Images size={14} />
              <span>Atelier Lookbook · Thư viện cá nhân</span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Bộ đồ của tôi</h2>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-sage-800"><a href="/bang-tin?compose=1" className="underline">Xin ý kiến bạn bè →</a><a href="/ban-be?tab=sharing" className="underline">Quyền chia sẻ outfit</a></div>
            <p className="mt-2 max-w-xl text-xs leading-6 text-ink/50 sm:text-sm">
              Mỗi bộ ảnh thử đồ lưu trữ kết quả studio chân thực. Bạn có thể mở rộng xem ở độ phân giải gốc hoặc xoá bất cứ lúc nào.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="rounded-full border border-black/[0.07] bg-black/[0.035] px-3 py-2 text-xs font-bold text-ink/65">
              {outfits.length}/{MAX_SAVED_OUTFITS} bộ
            </span>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-xs font-bold text-ink shadow-sm transition hover:border-black/20 hover:bg-black/[0.02]"
            >
              <ArrowLeft size={15} />
              <span>Về phòng thử</span>
            </button>
          </div>
        </div>

        {(error || deleteError) && (
          <div className="mx-6 mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700 sm:mx-8">
            {deleteError ?? error}
          </div>
        )}

        <div className="min-h-[430px] p-6 sm:p-8">
          {isLoading ? (
            <div className="grid min-h-[360px] place-items-center text-ink/35">
              <LoaderCircle className="animate-spin" size={28} aria-label="Đang tải Bộ đồ của tôi" />
            </div>
          ) : outfits.length === 0 ? (
            <div className="grid min-h-[360px] place-items-center rounded-3xl border border-dashed border-black/10 bg-black/[0.015] p-8 text-center">
              <div>
                <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-black/[0.05] bg-white text-sage-800 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
                  <Sparkles size={24} />
                </span>
                <h3 className="text-base font-bold text-ink">Chưa có bộ ảnh nào</h3>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-ink/50 sm:text-sm">
                  Hãy chọn người mẫu và trang phục trong phòng thử đồ, sau đó bấm &ldquo;Bắt đầu thử đồ&rdquo; để lưu bộ ảnh đầu tiên.
                </p>
                <button
                  type="button"
                  onClick={onBack}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-sage-800"
                >
                  <Sparkles size={15} />
                  <span>Tạo bộ đầu tiên</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {outfits.map((outfit, index) => (
                <article
                  key={outfit.id}
                  className="group overflow-hidden rounded-3xl border border-black/[0.065] bg-white shadow-[0_12px_36px_rgba(40,54,47,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(40,54,47,0.12)]"
                >
                  {officialIds.includes(outfit.id) && <p className="bg-sage-100 px-4 py-2 text-xs font-bold text-sage-800">★ Outfit chính thức · Bạn bè đã bình chọn</p>}
                  <button
                    type="button"
                    onClick={() => setPreview(outfit)}
                    className="relative grid w-full grid-cols-2 gap-px overflow-hidden bg-black/[0.06] text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-sage-200"
                  >
                    {/* Front Angle */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#eeece6]">
                      <img
                        src={outfit.frontImageUrl}
                        alt="Ảnh mặt trước"
                        className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
                      />
                      <span className="viewfinder-corner-tl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      <span className="viewfinder-corner-tr opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      <span className="viewfinder-corner-bl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      <span className="viewfinder-corner-br opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      <span className="absolute left-3 top-3 rounded-full bg-ink/75 px-2.5 py-1 text-[9px] font-bold tracking-wider text-white backdrop-blur-md">
                        TRƯỚC
                      </span>
                    </div>

                    {/* Back Angle */}
                    <div className="relative grid aspect-[4/5] place-items-center overflow-hidden bg-[#eeece6]">
                      {outfit.backImageUrl ? (
                        <>
                          <img
                            src={outfit.backImageUrl}
                            alt="Ảnh mặt sau"
                            className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
                          />
                          <span className="viewfinder-corner-tl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                          <span className="viewfinder-corner-tr opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                          <span className="viewfinder-corner-bl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                          <span className="viewfinder-corner-br opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                          <span className="absolute left-3 top-3 rounded-full bg-ink/75 px-2.5 py-1 text-[9px] font-bold tracking-wider text-white backdrop-blur-md">
                            SAU
                          </span>
                        </>
                      ) : (
                        <div className="px-4 text-center">
                          <Images size={20} className="mx-auto mb-2 text-ink/20" />
                          <p className="text-[10px] font-semibold leading-4 text-ink/35">Chưa tạo ảnh sau</p>
                        </div>
                      )}
                    </div>

                    {/* Hover Zoom pill */}
                    <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink opacity-0 shadow-md backdrop-blur-md transition-all duration-200 group-hover:opacity-100">
                      <Maximize2 size={13} />

                    </span>
                  </button>

                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-display text-sm font-bold text-ink">
                          Bộ thử {outfits.length - index}
                        </p>
                        <span
                          className={
                            'rounded-full px-2 py-0.5 text-[9px] font-bold ' +
                            (outfit.backImageUrl ? 'bg-sage-100 text-sage-800' : 'bg-amber-100 text-amber-800')
                          }
                        >
                          {outfit.backImageUrl ? '2 góc đầy đủ' : '1 góc trước'}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink/40">
                        <CalendarDays size={12} />
                        <span>{formatDate(outfit.createdAt)}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void remove(outfit)}
                      disabled={deletingId === outfit.id}
                      className="grid size-9 shrink-0 place-items-center rounded-xl text-ink/30 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      aria-label="Xoá bộ ảnh"
                    >
                      {deletingId === outfit.id ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {preview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-xl"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setPreview(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Xem bộ ảnh"
            className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-[#16171b] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Atelier Preview</span>
                <span className="text-white/20">·</span>
                <span className="text-xs font-semibold text-white/80">{formatDate(preview.createdAt)}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="grid size-9 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/10">
              <div className="relative aspect-[4/5] bg-[#111215]">
                <img src={preview.frontImageUrl} alt="Ảnh mặt trước phóng to" className="h-full w-full object-contain" />
                <span className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                  GÓC TRƯỚC
                </span>
              </div>
              <div className="relative grid aspect-[4/5] place-items-center bg-[#111215]">
                {preview.backImageUrl ? (
                  <>
                    <img src={preview.backImageUrl} alt="Ảnh mặt sau phóng to" className="h-full w-full object-contain" />
                    <span className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                      GÓC SAU
                    </span>
                  </>
                ) : (
                  <div className="px-6 text-center text-white/40">
                    <Images size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-semibold">Chưa có ảnh mặt sau cho bộ này</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
