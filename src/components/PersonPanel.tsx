import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Maximize2,
  ShieldCheck,
  Shirt,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { personApi } from '../services/person-api'
import { processPersonImage, validatePersonImage } from '../services/person-image-processing'
import { useFittingRoomStore } from '../store/useFittingRoomStore'
import { garmentCategoryLabels, type GarmentCategory } from '../types/fitting-room'
import { ImageLightbox } from './ImageLightbox'

const categories = Object.keys(garmentCategoryLabels) as GarmentCategory[]

type PersonPanelProps = {
  onGenerate: () => Promise<void>
  onClearResults: () => void
  onClearAllResults: () => void
  isGenerating: boolean
}

export function PersonPanel({ onGenerate, onClearResults, onClearAllResults, isGenerating }: PersonPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [processingLabel, setProcessingLabel] = useState('Đang xử lý ảnh…')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const garments = useFittingRoomStore((state) => state.garments)
  const outfit = useFittingRoomStore((state) => state.outfit)
  const personImage = useFittingRoomStore((state) => state.personImage)
  const privacyConsent = useFittingRoomStore((state) => state.privacyConsent)
  const preservePoseFront = useFittingRoomStore((state) => state.preservePoseFront)
  const preservePoseBack = useFittingRoomStore((state) => state.preservePoseBack)
  const setPersonImage = useFittingRoomStore((state) => state.setPersonImage)
  const setPrivacyConsent = useFittingRoomStore((state) => state.setPrivacyConsent)
  const setPreservePoseFront = useFittingRoomStore((state) => state.setPreservePoseFront)
  const setPreservePoseBack = useFittingRoomStore((state) => state.setPreservePoseBack)
  const clearUserData = useFittingRoomStore((state) => state.clearUserData)
  const selectedCount = [
    outfit.tops,
    outfit.outerwear,
    outfit.bottoms,
    outfit.shoes,
    ...outfit.accessories,
  ].filter(Boolean).length
  const canGenerate = Boolean(personImage && privacyConsent && selectedCount > 0)

  const uploadPersonImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    const validationError = validatePersonImage(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setNotice(null)
    setIsProcessing(true)
    setProcessingLabel('Đang resize ảnh…')
    try {
      const processed = await processPersonImage(file)
      setProcessingLabel('Đang tải ảnh lên…')
      const saved = await personApi.upload(processed)
      setPersonImage(saved)
      onClearResults()
      setNotice('Đã resize ảnh về cạnh dài tối đa 1024px. Nền ảnh được giữ nguyên.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Không thể xử lý ảnh.')
    } finally {
      setIsProcessing(false)
      setProcessingLabel('Đang xử lý ảnh…')
    }
  }

  const deleteUserData = async () => {
    if (!window.confirm('Xoá ảnh của bạn và toàn bộ kết quả thử đồ? Hành động này không thể hoàn tác.')) return
    setIsDeleting(true)
    setError(null)
    try {
      await personApi.deleteAllUserData()
      clearUserData()
      onClearAllResults()
      setNotice('Đã xoá ảnh và toàn bộ kết quả của bạn.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không thể xoá dữ liệu.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-black/[0.06] bg-panel/85 shadow-[0_20px_50px_rgba(23,33,29,0.06)] backdrop-blur-md lg:h-full">
      <div className="border-b border-black/[0.05] px-6 pb-4 pt-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-ink">
            <span className="grid size-7 place-items-center rounded-lg bg-black/[0.04] text-ink/75">
              <UserRound size={15} aria-hidden="true" />
            </span>
            <h2 className="font-display text-base font-bold">Người mẫu | Bản thân</h2>
          </div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/35">STUDIO 4:5</span>
        </div>
        <p className="text-xs leading-5 text-ink/45">Ảnh toàn thân</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadPersonImage(event)} />
          {personImage ? (
            <div className="group relative overflow-hidden rounded-[24px] border border-black/[0.08] bg-[#eae7de]/80 shadow-xs">
              {/* Studio viewfinder marks */}
              <span className="viewfinder-corner-tl" />
              <span className="viewfinder-corner-tr" />
              <span className="viewfinder-corner-bl" />
              <span className="viewfinder-corner-br" />

              <button type="button" onClick={() => setIsPreviewOpen(true)} className="group/btn block w-full cursor-zoom-in focus-visible:outline-none" aria-label="Phóng to">
                <img src={personImage.imageUrl} alt="Ảnh toàn thân" className="aspect-[4/5] w-full object-contain transition-transform duration-300 group-hover/btn:scale-[1.01]" />
                <span className="absolute right-3.5 top-3.5 grid size-8 place-items-center rounded-xl bg-white/90 text-ink/70 opacity-80 shadow-xs backdrop-blur-md transition group-hover/btn:opacity-100 group-hover/btn:scale-105" aria-hidden="true"><Maximize2 size={14} /></span>
              </button>
              {isProcessing && <div className="absolute inset-0 z-10 grid place-items-center bg-[#16171b]/60 px-4 text-center text-white backdrop-blur-sm"><div><LoaderCircle size={24} className="mx-auto mb-2 animate-spin text-white" /><p className="text-xs font-bold">{processingLabel}</p></div></div>}

              <div className="absolute inset-x-3.5 bottom-3.5 flex gap-2">
                <button type="button" onClick={() => inputRef.current?.click()} disabled={isProcessing || isDeleting} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-black/[0.06] bg-white/95 px-3.5 py-2 text-xs font-bold text-ink shadow-xs backdrop-blur-md transition hover:bg-white hover:shadow-sm">
                  <Upload size={13} /> Đổi ảnh
                </button>
                <button type="button" onClick={() => void deleteUserData()} disabled={isDeleting} className="grid size-9 place-items-center rounded-full border border-black/[0.06] bg-white/95 text-red-600 shadow-xs backdrop-blur-md transition hover:bg-red-50" aria-label="Xoá ảnh và kết quả">
                  {isDeleting ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
              <span className="absolute left-3.5 top-3.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-0.5 font-mono text-[8.5px] font-bold text-white shadow-xs backdrop-blur-md">{personImage.width} × {personImage.height}</span>
            </div>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} disabled={isProcessing} className="group relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-[24px] border-2 border-dashed border-black/15 bg-black/[0.02] p-6 transition hover:border-black/30 hover:bg-black/[0.035] disabled:cursor-wait">
              <div className="text-center">
                <span className="mx-auto mb-3 grid size-13 place-items-center rounded-2xl border border-black/[0.08] bg-white text-ink shadow-xs transition-transform duration-300 group-hover:scale-110">
                  {isProcessing ? <LoaderCircle size={22} className="animate-spin text-ink" /> : <ImagePlus size={22} className="text-ink/65" />}
                </span>
                <p className="text-sm font-bold text-ink">{isProcessing ? processingLabel : 'Tải ảnh toàn thân mẫu'}</p>

              </div>
            </button>
          )}



          {error && <div className="mt-3.5 rounded-2xl border border-red-200 bg-red-50/80 px-3.5 py-2.5 text-xs leading-5 text-red-700" role="alert">{error}</div>}
          {notice && <div className="mt-3.5 rounded-2xl border border-sage-200 bg-sage-50/80 px-3.5 py-2.5 text-xs leading-5 text-sage-800" role="status">{notice}</div>}
        </div>

        <div className="mx-5 border-t border-black/[0.05] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-ink uppercase tracking-wider font-mono">
              <Shirt size={14} className="text-ink/50" /> BỘ HIỆN TẠI
            </div>
            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
              {selectedCount > 5 ? selectedCount : `${selectedCount}/5`}
            </span>
          </div>
          <div className="space-y-1.5">
            {categories.map((category) => {
              if (category === 'accessories') {
                if (outfit.accessories.length === 0) {
                  return (
                    <div key="accessories-empty" className="flex h-11 items-center gap-2.5 rounded-2xl border border-black/[0.04] bg-white/70 px-2.5 transition-all">
                      <span className="grid size-7 place-items-center rounded-xl border border-dashed border-black/15 text-[10px] font-bold text-ink/25">+</span>
                      <span className="text-xs font-medium text-ink/35">{garmentCategoryLabels.accessories}</span>
                      <span className="ml-auto text-[9.5px] font-mono text-ink/25">Trống</span>
                    </div>
                  )
                }
                return outfit.accessories.map((accId) => {
                  const garment = garments.find((item) => item.id === accId)
                  if (!garment) return null
                  return (
                    <div key={garment.id} className="flex h-11 items-center gap-2.5 rounded-2xl border border-black/[0.04] bg-white/70 px-2.5 transition-all">
                      <img src={garment.frontProcessedUrl} alt="" className="size-8 rounded-xl bg-[#f4f2ec] object-contain p-0.5" />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-ink">{garment.name}</span>
                      <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    </div>
                  )
                })
              }
              const garment = garments.find((item) => item.id === outfit[category])
              return (
                <div key={category} className="flex h-11 items-center gap-2.5 rounded-2xl border border-black/[0.04] bg-white/70 px-2.5 transition-all">
                  {garment ? (
                    <>
                      <img src={garment.frontProcessedUrl} alt="" className="size-8 rounded-xl bg-[#f4f2ec] object-contain p-0.5" />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-ink">{garment.name}</span>
                      <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="grid size-7 place-items-center rounded-xl border border-dashed border-black/15 text-[10px] font-bold text-ink/25">+</span>
                      <span className="text-xs font-medium text-ink/35">{garmentCategoryLabels[category]}</span>
                      <span className="ml-auto text-[9.5px] font-mono text-ink/25">Trống</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mx-5 mt-4 flex items-center justify-between rounded-2xl border border-black/[0.06] bg-black/[0.025] px-4 py-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={preservePoseFront}
              onChange={(event) => setPreservePoseFront(event.target.checked)}
              className="size-4 rounded border-black/20 text-ink focus:ring-ink"
            />
            <span>Giữ pose trước</span>
          </label>
          <div className="h-4 w-px bg-black/10" />
          <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={preservePoseBack}
              onChange={(event) => setPreservePoseBack(event.target.checked)}
              className="size-4 rounded border-black/20 text-ink focus:ring-ink"
            />
            <span>Giữ pose sau</span>
          </label>
        </div>

        <div className="mx-5 mt-3 rounded-2xl border border-black/[0.06] bg-black/[0.025] p-3.5">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-ink"><ShieldCheck size={14} className="text-ink/60" /> Bảo mật | Quyền riêng tư</div>
          <label className={'flex items-start gap-2.5 text-[11px] leading-5 ' + (personImage ? 'cursor-pointer text-ink/75' : 'cursor-not-allowed text-ink/35')}>
            <input
              type="checkbox"
              checked={privacyConsent}
              onChange={(event) => setPrivacyConsent(event.target.checked)}
              disabled={!personImage}
              className="mt-1 size-4 rounded border-black/20 text-ink focus:ring-ink"
            />
          </label>
        </div>
      </div>

      <div className="p-5 border-t border-black/[0.05] bg-white/50 backdrop-blur-sm">
        <button
          type="button"
          disabled={!canGenerate || isGenerating}
          onClick={() => void onGenerate()}
          className={
            'relative overflow-hidden group flex w-full items-center justify-center gap-2.5 rounded-2xl py-3.5 px-5 text-sm font-bold text-white transition-all duration-300 ' +
            (canGenerate && !isGenerating
              ? 'bg-gradient-to-r from-[#16171b] via-[#252831] to-[#16171b] shadow-[0_12px_28px_rgba(22,23,27,0.28)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(22,23,27,0.38)] active:translate-y-0'
              : 'bg-black/25 text-white/50 cursor-not-allowed shadow-none')
          }
        >
          {canGenerate && !isGenerating && (
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer-slow" />
          )}
          {isGenerating ? (
            <LoaderCircle size={18} className="animate-spin text-white" />
          ) : (
            <Sparkles size={17} className={canGenerate ? 'text-amber-300 animate-pulse' : 'text-white/40'} />
          )}
          <span className="tracking-wide">
            {isGenerating ? 'ĐANG TẠO ẢNH…' : 'BẮT ĐẦU THỬ ĐỒ'}
          </span>
        </button>
        <p className="mt-2 text-center text-[10px] leading-4 text-ink/40 font-medium">
          {!personImage ? 'Cần tải ảnh toàn thân trước.' : !privacyConsent ? 'Cần tích chọn xác nhận quyền riêng tư.' : selectedCount === 0 ? 'Cần chọn ít nhất 1 món đồ trong tủ đồ.' : 'Mỗi lượt tạo 1 ảnh độc lập.'}
        </p>
      </div>

      {personImage && (
        <ImageLightbox
          open={isPreviewOpen}
          src={personImage.imageUrl}
          alt="Phóng to"
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </aside>
  )
}
