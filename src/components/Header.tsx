import { Home, LogOut, Search, Shirt, Sparkles, UserRound, Users, MessageSquare } from 'lucide-react'
import { startTransition, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { appViewPaths, type AppView } from '../navigation'
import type { AuthUser } from '../types/auth'
import { NotificationBell } from './social/NotificationBell'

type HeaderProps = {
  activeView: AppView
  historyCount: number
  selectedCount: number
  onViewChange: (view: AppView) => void
  user: AuthUser
  isLoggingOut: boolean
  onLogout: () => void
}

const navigationItems: Array<{
  view: AppView
  label: string
  icon: typeof Home
}> = [
    { view: 'fitting', label: 'Phòng thử', icon: Home },
    { view: 'wardrobe', label: 'Tủ đồ', icon: Shirt },
    { view: 'outfits', label: 'Bộ sưu tập', icon: Search },
    { view: 'profile', label: 'Tài khoản', icon: UserRound },
    { view: 'feed', label: 'Bảng tin', icon: MessageSquare },
    { view: 'friends', label: 'Bạn bè', icon: Users },
  ]

export function Header({
  activeView,
  historyCount,
  selectedCount,
  onViewChange,
  user,
  isLoggingOut,
  onLogout,
}: HeaderProps) {
  const targetIndex = Math.max(0, navigationItems.findIndex((item) => item.view === activeView))

  const [slider, setSlider] = useState<{
    current: number
    from: number
    to: number
    dist: number
    isAnimating: boolean
    animKey: number
  }>({
    current: targetIndex,
    from: targetIndex,
    to: targetIndex,
    dist: 0,
    isAnimating: false,
    animKey: 0,
  })

  const prevTargetRef = useRef(targetIndex)
  useEffect(() => {
    if (prevTargetRef.current !== targetIndex) {
      const from = prevTargetRef.current
      prevTargetRef.current = targetIndex
      setSlider({
        current: targetIndex,
        from,
        to: targetIndex,
        dist: Math.abs(targetIndex - from),
        isAnimating: true,
        animKey: Date.now(),
      })
    }
  }, [targetIndex])

  const openView = (event: MouseEvent<HTMLAnchorElement>, view: AppView, index: number) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (index === slider.current && activeView === view) return

    const from = slider.current
    prevTargetRef.current = index

    setSlider({
      current: index,
      from,
      to: index,
      dist: Math.max(1, Math.abs(index - from)),
      isAnimating: true,
      animKey: Date.now(),
    })

    startTransition(() => {
      onViewChange(view)
    })
  }

  const handleAnimationEnd = () => {
    setSlider((prev) => ({
      ...prev,
      isAnimating: false,
    }))
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.055] bg-panel/90 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-3">
        <a href={appViewPaths.fitting} onClick={(event) => openView(event, 'fitting', 0)} className="group flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#16171b] to-[#2c2f38] text-white shadow-[0_8px_20px_rgba(22,23,27,0.22)] transition-transform duration-300 group-hover:scale-105">
            <Sparkles size={18} strokeWidth={2} className="text-amber-300" aria-hidden="true" />
          </span>
          <span>
            <span className="flex items-center gap-2">
              <span className="font-display text-lg font-bold tracking-tight text-ink">Fitting Room</span>
              <span className="rounded-full border border-black/[0.08] bg-black/[0.04] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-ink/70">Atelier Studio</span>
            </span>
            <span className="hidden text-[10px] font-medium text-ink/40 sm:block">Virtual Try-On · Studio Edition</span>
          </span>
        </a>

        {/* Capsule Navigation Bar */}
        <nav className="order-3 flex w-full justify-center lg:order-2 lg:w-auto" aria-label="Điều hướng chính">
          <div className="relative flex h-12 w-full max-w-[360px] items-center rounded-full border border-white/10 bg-[#16171a] p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.35)] sm:h-13 sm:w-[420px]">
            {/* Sliding translucent gray capsule box with stretch physics */}
            <span
              key={slider.animKey}
              className={'app-nav-slider ' + (slider.isAnimating ? 'is-animating' : '')}
              style={
                {
                  '--from-idx': slider.from,
                  '--to-idx': slider.to,
                  '--dist': slider.dist,
                  transform: slider.isAnimating
                    ? undefined
                    : `translate3d(${slider.current * 100}%, 0, 0)`,
                } as CSSProperties
              }
              onAnimationEnd={handleAnimationEnd}
              aria-hidden="true"
            />

            {/* 4 Tabs */}
            <div className="relative z-10 grid h-full w-full grid-cols-6">
              {navigationItems.map((item, index) => {
                const Icon = item.icon
                const isActive = activeView === item.view || (slider.isAnimating && slider.to === index)
                const count = item.view === 'outfits' ? historyCount : item.view === 'fitting' ? selectedCount : 0
                return (
                  <a
                    key={item.view}
                    href={appViewPaths[item.view]}
                    onClick={(event) => openView(event, item.view, index)}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={
                      'group flex h-full w-full items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ' +
                      (isActive
                        ? 'text-white'
                        : 'text-white/45 hover:text-white/80')
                    }
                  >
                    <span className="relative flex items-center justify-center">
                      <Icon
                        size={20}
                        strokeWidth={isActive ? 2.4 : 1.8}
                        className={
                          'transition-all duration-200 ' +
                          (isActive
                            ? 'scale-110 drop-shadow-[0_1px_4px_rgba(255,255,255,0.35)]'
                            : 'group-hover:scale-105')
                        }
                        aria-hidden="true"
                      />
                      {count > 0 && (
                        <span
                          className={
                            'absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold shadow-xs transition-transform duration-300 ' +
                            (isActive
                              ? 'bg-white text-[#16171a] ring-2 ring-[#16171a]'
                              : 'bg-white/90 text-[#16171a] ring-1 ring-[#16171a]')
                          }
                        >
                          {count}
                        </span>
                      )}
                    </span>
                    <span className="sr-only">{item.label}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="order-2 flex items-center gap-2.5 rounded-full border border-black/[0.06] bg-white/80 py-1 pl-1.5 pr-2 shadow-sm backdrop-blur-md lg:order-3">
          <NotificationBell />
          <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sage-100 to-sage-200 text-sage-900 font-bold text-xs shadow-xs">
            {user.displayName.trim().slice(0, 1).toUpperCase()}
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </span>
          <div className="hidden min-w-0 pr-1 sm:block">
            <p className="max-w-28 truncate text-[11px] font-bold text-ink leading-tight">{user.displayName}</p>
            <p className="max-w-28 truncate text-[8.5px] font-medium text-ink/40">{user.email}</p>
          </div>
          <button type="button" onClick={onLogout} disabled={isLoggingOut} className="grid size-7 shrink-0 place-items-center rounded-full text-ink/35 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={13} /></button>
        </div>
      </div>
    </header>
  )
}
