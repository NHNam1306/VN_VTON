import type { HTMLAttributes } from 'react'

type BrandMarkProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string
}

export function BrandMark({ className = '', label, ...props }: BrandMarkProps) {
  return (
    <span
      {...props}
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[30%] bg-[#141A3C] shadow-[0_10px_24px_rgba(20,26,60,0.22)] ring-1 ring-white/10 ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 64 64" className="size-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 17.5h19.5a3 3 0 0 1 0 6H27.5v6h10a3 3 0 0 1 0 6h-10v8.5a3.25 3.25 0 0 1-6.5 0z" fill="#FFFFFF" />
        <path d="M47 11.5l1.6 4.4 4.4 1.6-4.4 1.6L47 23.5l-1.6-4.4-4.4-1.6 4.4-1.6z" fill="#FF5A6E" />
      </svg>
    </span>
  )
}

type BrandLogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  inverse?: boolean
}

export function BrandLogo({
  className = '',
  markClassName = 'size-10',
  wordmarkClassName = '',
  inverse = false,
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`} aria-label="Fitsy">
      <BrandMark className={markClassName} />
      <span
        className={`font-display text-xl font-extrabold tracking-[-0.04em] ${inverse ? 'text-white' : 'text-ink'} ${wordmarkClassName}`}
      >
        Fitsy<span aria-hidden="true" className="ml-0.5 align-super text-[0.55em] text-[#FF5A6E]">✦</span>
      </span>
    </span>
  )
}
