import {
  AlertTriangle,
  Check,
  CheckSquare,
  ImagePlus,
  Layers,
  LoaderCircle,
  Maximize2,
  Sparkles,
  Square,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { normalizeBlob, type Category } from '../garment_normalizer'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { removeImageBackground, validateGarmentImage } from '../services/background-removal'
import { garmentApi, type AiExtractedGarment } from '../services/garment-api'
import type { Garment, GarmentCategory } from '../types/fitting-room'
import { garmentCategoryLabels } from '../types/fitting-room'

type UploadGarmentModalProps = {
  open: boolean
  defaultCategory: GarmentCategory
  onClose: () => void
  onSaved: (garment: Garment) => void
}

type Side = 'front' | 'back'

type MultiExtractedCard = {
  id: string
  category: GarmentCategory
  name: string
  description: string
  blob: Blob
  previewUrl: string
  selected: boolean
}

const normalizerCategoryMap: Record<GarmentCategory, Category> = {
  tops: 'top',
  outerwear: 'outerwear',
  bottoms: 'bottom',
  shoes: 'shoes',
  accessories: 'accessory',
}

const categoryExamples: Record<GarmentCategory, string> = {
  tops: 'Ví dụ: Áo cộc trắng',
  outerwear: 'Ví dụ: Áo khoác denim',
  bottoms: 'Ví dụ: Quần jeans xanh',
  shoes: 'Ví dụ: Sneaker trắng',
  accessories: 'Ví dụ: Túi da nâu',
}

function PreviewCard({
  label,
  url,
  emptyText,
  onZoom,
}: {
  label: string
  url: string | null
  emptyText: string
  onZoom?: () => void
}) {
  return (
    <div className="flex h-full min-h-[175px] min-w-0 flex-col">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/40">{label}</p>
      <div
        className={
          'group relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-black/[0.08] bg-[radial-gradient(circle_at_center,#ffffff_0%,#f1efe9_100%)] shadow-sm transition-all ' +
          (url ? 'cursor-zoom-in hover:border-black/25 hover:shadow-md' : '')
        }
        onClick={() => {
          if (url && onZoom) onZoom()
        }}
        title={url ? 'Xem ảnh phóng to' : undefined}
      >
        {url ? (
          <>
            <img
              src={url}
              alt={label}
              className="h-full w-full object-contain p-3.5 transition-transform duration-300 ease-out group-hover:scale-105"
            />
            <span className="viewfinder-corner-tl opacity-40" />
            <span className="viewfinder-corner-tr opacity-40" />
            <span className="viewfinder-corner-bl opacity-40" />
            <span className="viewfinder-corner-br opacity-40" />

            {/* Subtle Zoom button on hover */}
            <span className="pointer-events-none absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-sm backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
              <Maximize2 size={10} />
              <span>Phóng to</span>
            </span>
          </>
        ) : (
          <span className="px-4 text-center text-xs leading-5 text-ink/35">{emptyText}</span>
        )}
      </div>
    </div>
  )
}

export function UploadGarmentModal({ open, defaultCategory, onClose, onSaved }: UploadGarmentModalProps) {
  const [name, setName] = useState('')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [frontProcessed, setFrontProcessed] = useState<Blob | null>(null)
  const [backProcessed, setBackProcessed] = useState<Blob | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stepMessage, setStepMessage] = useState<string>('')
  const [isFluxRegenerated, setIsFluxRegenerated] = useState(false)
  const [extractedItems, setExtractedItems] = useState<MultiExtractedCard[]>([])
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const frontInput = useRef<HTMLInputElement>(null)
  const backInput = useRef<HTMLInputElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)

  const frontOriginalUrl = useObjectUrl(frontFile)
  const backOriginalUrl = useObjectUrl(backFile)
  const frontProcessedUrl = useObjectUrl(frontProcessed)
  const backProcessedUrl = useObjectUrl(backProcessed)

  const reset = useCallback(() => {
    setName('')
    setFrontFile(null)
    setBackFile(null)
    setFrontProcessed(null)
    setBackProcessed(null)
    setProgress(0)
    setStepMessage('')
    setIsFluxRegenerated(false)
    setExtractedItems([])
    setZoomImage(null)
    setError(null)
  }, [])

  const close = useCallback(() => {
    if (isRemoving || isSaving) return
    reset()
    onClose()
  }, [isRemoving, isSaving, onClose, reset])

  useEffect(() => {
    if (!open) return
    const focusTimer = window.setTimeout(() => nameInput.current?.focus(), 100)
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (zoomImage) {
          setZoomImage(null)
        } else {
          close()
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [close, open, zoomImage])

  if (!open) return null

  const pickFile = (side: Side, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    const validationError = validateGarmentImage(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    if (side === 'front') {
      setFrontFile(file)
      setFrontProcessed(null)
      setIsFluxRegenerated(false)
      setExtractedItems([])
    } else {
      setBackFile(file)
      setBackProcessed(null)
    }
  }

  const removeBackgrounds = async () => {
    if (!frontFile) {
      setError('Tải ảnh mặt trước trước khi tách nền.')
      return
    }
    setError(null)
    setIsRemoving(true)
    setProgress(5)

    try {
      // 1. Tách nền sơ bộ từ browser
      let baseForeground = frontFile as Blob
      try {
        baseForeground = await removeImageBackground(frontFile, (value) => {
          setProgress(Math.round(5 + value * 0.25)) // 5% - 30%
        })
      } catch (clientRemError) {
        console.warn('Client background removal error, continuing with server extraction:', clientRemError)
      }

      // 2. Gọi backend: AI tự động nhận diện tất cả món đồ có trong ảnh & gọi FLUX tái tạo ảnh studio
      setProgress(35)

      let aiItems: AiExtractedGarment[] = []
      let aiFailed = false
      try {
        const aiResponse = await garmentApi.aiExtract(frontFile, defaultCategory)
        aiItems = aiResponse.items
      } catch (aiErr) {
        aiFailed = true
        console.warn('AI FLUX extraction failed:', aiErr)
        setError(aiErr instanceof Error ? `FLUX AI: ${aiErr.message}` : 'Lỗi kết nối FLUX AI')
      }

      setProgress(75)

      if (aiItems.length > 1) {
        // Có NHIỀU đồ trong 1 ảnh (ví dụ: áo, quần, trang sức...)
        const multiCards: MultiExtractedCard[] = []
        for (const item of aiItems) {
          try {
            const resp = await fetch(item.studioImageUrl)
            const rawBlob = await resp.blob()
            let cleanedBlob = rawBlob
            try {
              const norm = await normalizeBlob(rawBlob, {
                category: normalizerCategoryMap[item.category] ?? 'top',
                scaleMode: 'fit',
              })
              cleanedBlob = norm.item
            } catch { }

            multiCards.push({
              id: item.id,
              category: item.category,
              name: item.name,
              description: item.description,
              blob: cleanedBlob,
              previewUrl: URL.createObjectURL(cleanedBlob),
              selected: true,
            })
          } catch (err) {
            console.warn('Failed to process item from multi-extract:', err)
          }
        }

        if (multiCards.length > 0) {
          setExtractedItems(multiCards)
          const matched = multiCards.find((c) => c.category === defaultCategory) ?? multiCards[0]
          setFrontProcessed(matched.blob)
          if (!name.trim()) setName(matched.name)
          setIsFluxRegenerated(true)
        }
      } else if (aiItems.length === 1) {
        // Chỉ có 1 món đồ: chỉ hiện đồ chính ở trên, xóa danh sách bên dưới
        setExtractedItems([])
        const single = aiItems[0]
        try {
          const resp = await fetch(single.studioImageUrl)
          const rawBlob = await resp.blob()
          try {
            const norm = await normalizeBlob(rawBlob, {
              category: normalizerCategoryMap[defaultCategory] ?? 'top',
              scaleMode: 'fit',
            })
            setFrontProcessed(norm.item)
          } catch {
            setFrontProcessed(rawBlob)
          }
          if (!name.trim()) setName(single.name)
          setIsFluxRegenerated(true)
        } catch {
          // Fallback to base foreground
          try {
            const norm = await normalizeBlob(baseForeground, {
              category: normalizerCategoryMap[defaultCategory] ?? 'top',
              scaleMode: 'fit',
            })
            setFrontProcessed(norm.item)
          } catch {
            setFrontProcessed(baseForeground)
          }
        }
      } else {
        // Fallback thuần nếu AI endpoint không trả về item
        try {
          const normFront = await normalizeBlob(baseForeground, {
            category: normalizerCategoryMap[defaultCategory] ?? 'top',
            scaleMode: 'fit',
          })
          setFrontProcessed(normFront.item)
        } catch {
          setFrontProcessed(baseForeground)
        }
      }

      // Xử lý mặt sau nếu người dùng tải lên
      if (backFile) {
        const rawBack = await removeImageBackground(backFile, (value) =>
          setProgress(85 + Math.round(value * 0.1)),
        )
        try {
          const normBack = await normalizeBlob(rawBack, {
            category: normalizerCategoryMap[defaultCategory] ?? 'top',
            scaleMode: 'fit',
          })
          setBackProcessed(normBack.item)
        } catch {
          setBackProcessed(rawBack)
        }
      }

      setProgress(100)
      setStepMessage(aiFailed ? 'Lỗi' : 'Thành công')
    } catch (processingError) {
      console.error(
        'Background removal failed:',
        processingError instanceof Error ? processingError.message : 'Unknown error',
      )
      setError('Không thể tách nền. Kiểm tra kết nối rồi thử lại.')
    } finally {
      setIsRemoving(false)
    }
  }

  const saveGarment = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Vui lòng đặt tên cho món đồ.')
      return
    }
    if (!frontFile || !frontProcessed) {
      setError('Cần ảnh mặt trước đã được tách nền.')
      return
    }
    if (backFile && !backProcessed) {
      setError('Ảnh mặt sau chưa được tách nền.')
      return
    }

    setError(null)
    setIsSaving(true)
    try {
      const garment = await garmentApi.create({
        name: name.trim(),
        category: defaultCategory,
        frontOriginal: frontFile,
        frontProcessed,
        backOriginal: backFile,
        backProcessed,
      })
      onSaved(garment)
      reset()
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu món đồ.')
    } finally {
      setIsSaving(false)
    }
  }

  const saveAllExtracted = async () => {
    const selected = extractedItems.filter((i) => i.selected)
    if (selected.length === 0) {
      setError('Vui lòng chọn ít nhất 1 món đồ để lưu.')
      return
    }
    if (!frontFile) {
      setError('Không tìm thấy ảnh gốc.')
      return
    }

    setError(null)
    setIsSaving(true)
    try {
      for (const item of selected) {
        const garment = await garmentApi.create({
          name: item.name.trim() || garmentCategoryLabels[item.category],
          category: item.category,
          frontOriginal: frontFile,
          frontProcessed: item.blob,
          backOriginal: null,
          backProcessed: null,
        })
        onSaved(garment)
      }
      reset()
      onClose()
    } catch (saveAllErr) {
      setError(saveAllErr instanceof Error ? saveAllErr.message : 'Không thể lưu các món đồ.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSelectCard = (id: string) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)),
    )
  }

  const updateCardName = (id: string, newName: string) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item)),
    )
  }

  const updateCardCategory = (id: string, newCat: GarmentCategory) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category: newCat } : item)),
    )
  }

  const applyCardToForm = (item: MultiExtractedCard) => {
    setName(item.name)
    setFrontProcessed(item.blob)
  }

  const categoryLabel = garmentCategoryLabels[defaultCategory]
  const categoryLabelLower = categoryLabel.toLocaleLowerCase('vi-VN')

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden border-0 bg-white/95 shadow-[0_30px_90px_rgba(23,33,29,0.28)] backdrop-blur-2xl sm:h-[840px] sm:max-h-[92dvh] sm:rounded-[36px] sm:border sm:border-white/60"
      >
        <form onSubmit={(event) => void saveGarment(event)} className="flex h-full flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between border-b border-black/[0.055] bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-8 sm:py-5">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sage-100 text-sage-800 shadow-[inset_0_0_0_1px_rgba(64,86,60,0.08)] sm:size-11">
                <ImagePlus size={20} />
              </span>
              <div className="min-w-0">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage-800">
                    Tủ đồ · {categoryLabel}
                  </span>
                </div>
                <h2 id="upload-title" className="font-display text-xl font-bold leading-tight text-ink sm:text-2xl">
                  Thêm {categoryLabelLower}
                </h2>
                <p className="mt-1 hidden text-xs text-ink/45 sm:block">
                  Ảnh rõ nét, phẳng và đủ sáng sẽ cho kết quả thử đồ studio chân thực nhất.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={isRemoving || isSaving}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-black/[0.06] bg-black/[0.02] text-ink/45 transition hover:bg-black/5 hover:text-ink disabled:opacity-30"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 items-stretch gap-4 overflow-y-auto overscroll-contain p-3 pb-6 sm:p-5 lg:grid-cols-[330px_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden">
            {/* Left Column: Form inputs and Action Buttons (LOCKED KHÔNG CHO SCROLL) */}
            <div className="flex h-auto shrink-0 flex-col justify-between space-y-3.5 overflow-visible rounded-3xl border border-black/[0.06] bg-[#faf9f6] p-4 shadow-[0_12px_34px_rgba(40,54,47,0.04)] sm:p-4.5 lg:h-full lg:overflow-hidden">
              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="garment-name" className="text-xs font-bold text-ink/75">
                      Tên {categoryLabelLower}
                    </label>
                    <span className="text-[10px] text-ink/35">{name.length}/80</span>
                  </div>
                  <input
                    ref={nameInput}
                    id="garment-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                    placeholder={categoryExamples[defaultCategory]}
                    className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs outline-none transition placeholder:text-ink/25 focus:border-sage-500 focus:ring-4 focus:ring-sage-100"
                  />
                </div>

                <div className="space-y-2">
                  <input
                    ref={frontInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => pickFile('front', event)}
                  />
                  <input
                    ref={backInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => pickFile('back', event)}
                  />
                  <p className="text-xs font-bold text-ink/75">Ảnh sản phẩm hoặc ảnh phối đồ</p>
                  <button
                    type="button"
                    onClick={() => frontInput.current?.click()}
                    className={
                      'flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sage-100 ' +
                      (frontFile
                        ? 'border-sage-400 bg-sage-50/70'
                        : 'border-black/10 bg-white hover:border-black/25')
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2.5 text-xs font-semibold text-ink">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sage-100 text-sage-700">
                        {frontFile ? <Check size={15} /> : <Upload size={14} />}
                      </span>
                      <span>
                        Mặt trước / Ảnh phối <span className="text-coral">*</span>
                        <span className="mt-0.5 block max-w-[145px] truncate text-[9px] font-normal text-ink/40">
                          {frontFile?.name ?? 'JPG, PNG hoặc WebP'}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold text-sage-700">
                      {frontFile ? 'Đổi ảnh' : 'Chọn ảnh'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => backInput.current?.click()}
                    className={
                      'flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sage-100 ' +
                      (backFile
                        ? 'border-sage-400 bg-sage-50/70'
                        : 'border-black/10 bg-white hover:border-black/25')
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2.5 text-xs font-semibold text-ink">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink/55">
                        {backFile ? <Check size={15} /> : <Upload size={14} />}
                      </span>
                      <span>
                        Mặt sau
                        <span className="mt-0.5 block max-w-[145px] truncate text-[9px] font-normal text-ink/40">
                          {backFile?.name ?? 'Không bắt buộc'}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold text-sage-700">
                      {backFile ? 'Đổi ảnh' : 'Chọn ảnh'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                {/* Nút Tách nền */}
                <button
                  type="button"
                  onClick={() => void removeBackgrounds()}
                  disabled={!frontFile || isRemoving || isSaving}
                  className={
                    'group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-3 text-xs font-bold text-white transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ' +
                    (isRemoving
                      ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 shadow-md cursor-wait before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent'
                      : 'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_8px_20px_rgba(99,102,241,0.22)] hover:opacity-95 hover:shadow-[0_10px_24px_rgba(99,102,241,0.32)]')
                  }
                >
                  {isRemoving ? (
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-1.5 rounded-full bg-white animate-bounce" />
                      </span>
                      <span className="tracking-wide">Đang tách nền…</span>
                    </div>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{frontProcessed ? 'Tách nền lại' : 'Tách nền'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: 4 preview cards filling the entire right frame (CHỈ SCROLL CỘT NÀY) */}
            <div className="flex h-auto min-w-0 flex-col space-y-4 overflow-visible pr-0 lg:h-full lg:overflow-y-auto lg:pr-1 scrollbar-thin">
              <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 sm:min-h-[360px] sm:gap-4">
                <PreviewCard
                  label="Trước · Gốc"
                  url={frontOriginalUrl}
                  emptyText="Chưa có ảnh"
                  onZoom={() => frontOriginalUrl && setZoomImage({ url: frontOriginalUrl, title: 'Trước · Gốc' })}
                />
                <PreviewCard
                  label="Trước · Đã tách"
                  url={frontProcessedUrl}
                  emptyText="Bấm “Tách nền”"
                  onZoom={() => frontProcessedUrl && setZoomImage({ url: frontProcessedUrl, title: 'Trước · Đã tách' })}
                />
                <PreviewCard
                  label="Sau · Gốc"
                  url={backOriginalUrl}
                  emptyText="Không bắt buộc"
                  onZoom={() => backOriginalUrl && setZoomImage({ url: backOriginalUrl, title: 'Sau · Gốc' })}
                />
                <PreviewCard
                  label="Sau · Đã tách"
                  url={backProcessedUrl}
                  emptyText="Không bắt buộc"
                  onZoom={() => backProcessedUrl && setZoomImage({ url: backProcessedUrl, title: 'Sau · Đã tách' })}
                />
              </div>

              {/* Multi-Garment Detected List (If photo contains multiple items like shirt, pants, shoes) */}
              {extractedItems.length > 1 && (
                <div className="rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/50 p-4 sm:p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 pb-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm">
                        <Layers size={18} />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-ink">
                          Phát hiện {extractedItems.length} món đồ trong ảnh
                        </h4>
                        <p className="text-[11px] text-ink/55">
                          Mỗi món đã được tạo ảnh studio riêng biệt. Bạn có thể kiểm tra ảnh, sửa tên và lưu vào tủ đồ:
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void saveAllExtracted()}
                      disabled={isSaving || extractedItems.filter((i) => i.selected).length === 0}
                      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:opacity-95 hover:shadow-lg disabled:opacity-40"
                    >
                      {isSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
                      <span>
                        Lưu tất cả ({extractedItems.filter((i) => i.selected).length}) món vào tủ đồ
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {extractedItems.map((item, idx) => {
                      const isCurrentPrimary =
                        frontProcessed === item.blob || (!frontProcessed && (item.category === defaultCategory || idx === 0))
                      return (
                        <div
                          key={item.id}
                          className={
                            'group relative flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-200 ' +
                            (item.selected
                              ? 'border-violet-300 bg-white shadow-sm ring-1 ring-violet-200/50 hover:shadow-md'
                              : 'border-black/[0.08] bg-white/70 opacity-60 hover:opacity-90')
                          }
                        >
                          {/* Top Hero Image Showcase (Rõ nét, rộng rãi, chuẩn studio) */}
                          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-b border-black/[0.06] bg-[radial-gradient(circle_at_center,#ffffff_0%,#f5f4ef_100%)] p-3">
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="size-full object-contain drop-shadow-sm transition-transform duration-300 ease-out group-hover:scale-105 cursor-zoom-in"
                              onClick={() => setZoomImage({ url: item.previewUrl, title: item.name })}
                              title="Nhấn để xem ảnh phóng to"
                            />

                            {/* Viewfinder corner accents */}
                            <span className="viewfinder-corner-tl opacity-30" />
                            <span className="viewfinder-corner-tr opacity-30" />
                            <span className="viewfinder-corner-bl opacity-30" />
                            <span className="viewfinder-corner-br opacity-30" />

                            {/* Selection Checkbox (Góc trên trái) */}
                            <button
                              type="button"
                              onClick={() => toggleSelectCard(item.id)}
                              className="absolute left-2.5 top-2.5 z-10 grid size-7 place-items-center rounded-xl bg-white/90 shadow-sm backdrop-blur-md transition hover:scale-105"
                              aria-label="Chọn món đồ"
                              title={item.selected ? 'Bỏ chọn món này' : 'Chọn món này để lưu'}
                            >
                              {item.selected ? (
                                <span className="grid size-5 place-items-center rounded-lg bg-violet-600 text-white shadow-xs">
                                  <Check size={13} strokeWidth={3} />
                                </span>
                              ) : (
                                <span className="size-5 rounded-lg border-2 border-black/20 bg-white" />
                              )}
                            </button>

                            {/* Nút phóng to ảnh (Góc trên phải, hover hiện lên) */}
                            <button
                              type="button"
                              onClick={() => setZoomImage({ url: item.previewUrl, title: item.name })}
                              className="absolute right-2.5 top-2.5 z-10 grid size-7 place-items-center rounded-xl bg-black/60 text-white opacity-0 shadow-sm backdrop-blur-md transition-all duration-200 group-hover:opacity-100 hover:bg-black/80"
                              title="Phóng to ảnh"
                              aria-label="Phóng to ảnh"
                            >
                              <Maximize2 size={13} />
                            </button>

                            {/* Status badge (Góc dưới trái) */}
                            <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5">
                              {isCurrentPrimary ? (
                                <span className="flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
                                  <Sparkles size={11} />
                                  <span>Đồ chính ở trên</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white/90 shadow-sm backdrop-blur-md">
                                  <span>{garmentCategoryLabels[item.category]}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Thông tin & Tên món đồ (Hiển thị đầy đủ chữ, không bị cắt cụt) */}
                          <div className="flex flex-1 flex-col justify-between p-3.5 space-y-3">
                            <div className="space-y-2.5">
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink/45">
                                  Tên món đồ
                                </label>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateCardName(item.id, e.target.value)}
                                  placeholder="Tên món đồ..."
                                  className="w-full rounded-xl border border-black/10 bg-black/[0.02] px-3 py-1.5 text-xs font-bold text-ink outline-none transition placeholder:text-ink/25 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
                                  title={item.name}
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink/45">
                                  Phân loại tủ đồ
                                </label>
                                <select
                                  value={item.category}
                                  onChange={(e) => updateCardCategory(item.id, e.target.value as GarmentCategory)}
                                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/80 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                                >
                                  {Object.entries(garmentCategoryLabels).map(([catKey, label]) => (
                                    <option key={catKey} value={catKey}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Nút hành động chính */}
                            <div className="pt-1">
                              {isCurrentPrimary ? (
                                <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50/80 py-2 text-[11px] font-bold text-violet-700">
                                  <Check size={13} strokeWidth={2.5} />
                                  <span>Đang chọn hiển thị ở trên</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => applyCardToForm(item)}
                                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white py-2 text-[11px] font-bold text-ink/75 shadow-xs transition hover:border-violet-400 hover:bg-violet-600 hover:text-white"
                                >
                                  <Sparkles size={12} />
                                  <span>Chọn làm ảnh chính</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div
                  className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
                  role="alert"
                >
                  {error}
                </div>
              )}
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.055] bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-8 sm:py-4">
            <p className="hidden text-xs text-ink/40 sm:block">
              Ảnh đã tách nền sẽ được dùng để phối vào cơ thể ở phòng thử đồ.
            </p>
            <div className="ml-auto flex w-full items-center gap-2 sm:w-auto sm:gap-3">
              <button
                type="button"
                onClick={close}
                disabled={isRemoving || isSaving}
                className="flex-1 rounded-full px-5 py-3 text-xs font-bold text-ink/60 transition hover:bg-black/5 hover:text-ink sm:flex-none sm:py-2.5"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={!frontProcessed || isRemoving || isSaving}
                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-xs font-bold text-white shadow-[0_10px_24px_rgba(23,33,29,0.18)] transition hover:-translate-y-0.5 hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:min-w-36 sm:flex-none sm:px-6"
              >
                {isSaving && <LoaderCircle size={15} className="animate-spin" />}
                <span>{isSaving ? 'Đang lưu' : `Lưu ${categoryLabelLower}`}</span>
              </button>
            </div>
          </footer>
        </form>
      </section>

      {/* Lightbox Modal: Phóng to ảnh khi nhấn vào bất kỳ ảnh nào */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-3 sm:p-8 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`Phóng to ${zoomImage.title}`}
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#161616]/95 p-4 shadow-2xl backdrop-blur-2xl sm:max-h-[92dvh] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-3 flex w-full items-center justify-between gap-3 border-b border-white/10 pb-3 text-white">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-white/10 text-white shadow-inner">
                  <ZoomIn size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white tracking-wide truncate">{zoomImage.title}</p>
                  <p className="text-[11px] text-white/50 truncate">
                    {name.trim() || categoryLabel} · Kích thước xem đầy đủ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                aria-label="Đóng phóng to"
              >
                <X size={18} />
              </button>
            </header>

            {/* Image Preview Container */}
            <div className="relative flex max-h-[72dvh] w-full items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_center,#262626_0%,#0f0f0f_100%)] p-3 shadow-inner sm:p-4">
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                className="max-h-[68dvh] w-auto max-w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] select-none"
              />
            </div>

            <div className="mt-3 flex w-full items-center justify-between text-[11px] text-white/40">
              <span>Nhấn ESC hoặc bấm ra ngoài để đóng</span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-1.5 font-bold text-white/90 transition hover:bg-white/20"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
