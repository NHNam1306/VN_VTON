import type { HTMLAttributes } from 'react'

type BrandMarkProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string
}

export function BrandMark({ className = '', label, ...props }: BrandMarkProps) {
  return (
    <span
      {...props}
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-[30%] bg-gradient-to-br from-[#111719] via-[#18201f] to-[#2d332f] shadow-[0_10px_24px_rgba(17,23,25,0.22)] ring-1 ring-white/10 ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 48 48" className="size-[72%]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M23.8 15.7c0-3.1 2.1-5.5 5.2-5.5 2.7 0 4.8 1.9 4.8 4.4 0 3.4-3.5 4.8-6.2 6.4"
          stroke="#F6D25F"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="m24 18.2-14 13c-1.6 1.5-.5 4.2 1.7 4.2h24.6c2.2 0 3.3-2.7 1.7-4.2l-10.4-9.6"
          stroke="#F6D25F"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M15.2 34.9h17.6" stroke="#DCEAD8" strokeWidth="2.3" strokeLinecap="round" />
        <path
          d="M38.4 7.2v5.2M35.8 9.8H41"
          stroke="#DCEAD8"
          strokeWidth="2"
          strokeLinecap="round"
        />
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
    <span className={`inline-flex items-center gap-3 ${className}`} aria-label="Tryoh">
      <BrandMark className={markClassName} />
      <span
        className={`font-display text-xl font-extrabold tracking-[-0.04em] ${inverse ? 'text-white' : 'text-ink'} ${wordmarkClassName}`}
      >
        Tryoh
      </span>
    </span>
  )
}
