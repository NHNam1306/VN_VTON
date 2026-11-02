import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type ImageLightboxProps = {
  open: boolean
  src: string
  alt: string
  onClose: () => void
}

export function ImageLightbox({ open, src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/80 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section role="dialog" aria-modal="true" aria-label="Xem ảnh phóng to" className="relative flex max-h-[94vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-[28px] bg-[#eeece6] shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-2xl bg-white/90 text-ink shadow-sm backdrop-blur-md transition hover:bg-white" aria-label="Đóng">
          <X size={18} />
        </button>
        <img src={src} alt={alt} className="max-h-[92vh] max-w-full object-contain" />
      </section>
    </div>,
    document.body,
  )
}
