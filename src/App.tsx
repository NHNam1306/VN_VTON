import { ArrowRight, ChevronRight, LayoutGrid, LoaderCircle, Shirt, Sparkles, WandSparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AuthPage } from './components/AuthPage'
import { Header } from './components/Header'
import { OutfitHistory } from './components/OutfitHistory'
import { PersonPanel } from './components/PersonPanel'
import { ProfilePage } from './components/ProfilePage'
import { SocialPage } from './components/social/SocialPage'
import { ResultStage } from './components/ResultStage'
import { UploadGarmentModal } from './components/UploadGarmentModal'
import { WardrobePanel } from './components/WardrobePanel'
import { useTryOnGeneration } from './hooks/useTryOnGeneration'
import { appViewPaths, resolveAppView, type AppView } from './navigation'
import { authApi } from './services/auth-api'
import { garmentApi } from './services/garment-api'
import { personApi } from './services/person-api'
import { useFittingRoomStore } from './store/useFittingRoomStore'
import type { AuthUser } from './types/auth'

type FittingRoomAppProps = {
  user: AuthUser
  onLoggedOut: () => void
}

const runViewTransition = (update: () => void) => {
  update()
}

function FittingRoomApp({ user, onLoggedOut }: FittingRoomAppProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [activeView, setActiveView] = useState<AppView>(() => resolveAppView(window.location.pathname) ?? 'feed')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const activeCategory = useFittingRoomStore((state) => state.activeCategory)
  const garments = useFittingRoomStore((state) => state.garments)
  const outfit = useFittingRoomStore((state) => state.outfit)
  const setGarments = useFittingRoomStore((state) => state.setGarments)
  const addGarment = useFittingRoomStore((state) => state.addGarment)
  const setLoading = useFittingRoomStore((state) => state.setLoadingGarments)
  const setError = useFittingRoomStore((state) => state.setWardrobeError)
  const setPersonImage = useFittingRoomStore((state) => state.setPersonImage)
  const resetWorkspace = useFittingRoomStore((state) => state.resetWorkspace)
  const generation = useTryOnGeneration()
  const selectedCount = [
    outfit.tops,
    outfit.outerwear,
    outfit.bottoms,
    outfit.shoes,
    ...outfit.accessories,
  ].filter(Boolean).length

  const navigate = useCallback((view: AppView) => {
    const nextPath = appViewPaths[view]
    if (window.location.pathname !== nextPath) window.history.pushState(null, '', nextPath)
    setActiveView(view)
    if (window.scrollY > 120) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    const initialView = resolveAppView(window.location.pathname)
    if (!initialView) window.history.replaceState(null, '', appViewPaths.feed)
    const handlePopState = () => {
      setActiveView(resolveAppView(window.location.pathname) ?? 'feed')
      if (window.scrollY > 120) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const logout = async () => {
    setIsLoggingOut(true)
    try {
      await authApi.logout()
      resetWorkspace()
      onLoggedOut()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể đăng xuất.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    const loadWardrobe = async () => {
      setLoading(true)
      setError(null)
      try {
        const [savedGarments, personImage] = await Promise.all([
          garmentApi.list(),
          personApi.get(),
        ])
        setGarments(savedGarments)
        setPersonImage(personImage)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Không thể tải tủ đồ.')
      } finally {
        setLoading(false)
      }
    }
    void loadWardrobe()
  }, [setError, setGarments, setLoading, setPersonImage])

  return (
    <div className="min-h-screen bg-[#f6f5f1] text-ink bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(215,223,212,0.45),transparent_70%),radial-gradient(circle_at_bottom_right,rgba(235,230,220,0.5),transparent_50%)]">
      <Header
        activeView={activeView}
        historyCount={generation.history.length}
        selectedCount={selectedCount}
        onViewChange={navigate}
        user={user}
        isLoggingOut={isLoggingOut}
        onLogout={() => void logout()}
      />

      <div key={activeView} className="app-page-transition">
        {(activeView === 'feed' || activeView === 'friends') && <SocialPage mode={activeView} onCreateOutfit={() => navigate('fitting')} />}
        {activeView === 'wardrobe' && (
          <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <section className="mb-5 flex flex-col gap-5 rounded-[28px] border border-black/[0.06] bg-panel/80 px-5 py-6 shadow-[0_14px_45px_rgba(40,54,47,0.055)] backdrop-blur-md sm:px-7 lg:flex-row lg:items-end lg:justify-between">
              <div>

                <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Tủ đồ kỹ thuật số</h2>
                <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-6 text-ink/50">Thêm sản phẩm theo từng nhóm, sau đó chọn tối đa một món cho mỗi lớp</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-5 rounded-2xl border border-black/[0.06] bg-white/80 px-4 py-2.5 shadow-xs backdrop-blur-sm">
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-ink/35">Đã lưu</p><p className="mt-0.5 text-lg font-bold text-ink">{garments.length}</p></div>
                  <div className="h-8 w-px bg-black/[0.07]" />
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-ink/35">Đang chọn</p><p className="mt-0.5 text-lg font-bold text-sage-700">{selectedCount > 5 ? selectedCount : `${selectedCount}/5`}</p></div>
                </div>
                <button type="button" onClick={() => navigate('fitting')} className="flex items-center justify-center gap-2 rounded-2xl bg-[#16171b] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(22,23,27,0.22)] transition hover:-translate-y-0.5 hover:bg-black">
                  Sang phòng thử <ArrowRight size={16} />
                </button>
              </div>
            </section>
            <WardrobePanel mode="page" onAddGarment={() => setIsUploadOpen(true)} />
          </main>
        )}

        {activeView === 'fitting' && (
          <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            <section className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink/45">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  STUDIO SESSION · THỬ ĐỒ
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Phòng thử đồ ảo</h2>
                <p className="mt-1.5 text-xs sm:text-sm leading-6 text-ink/50 max-w-xl">Phối trang phục theo phong cách của bạn</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('wardrobe')}
                className="group flex items-center gap-2.5 self-start rounded-full border border-black/[0.08] bg-white/85 px-4 py-2 text-xs sm:text-sm font-semibold text-ink shadow-xs backdrop-blur-md transition-all hover:border-black/20 hover:bg-white hover:shadow-md sm:self-auto"
              >
                <Shirt size={15} className="text-ink/60 transition-transform group-hover:scale-110" />
                <span>Chỉnh bộ đồ</span>
                <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-bold text-ink">
                  {selectedCount > 5 ? selectedCount : `${selectedCount}/5`}
                </span>
              </button>
            </section>

            {selectedCount === 0 && (
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs sm:text-sm text-amber-950/80 shadow-xs backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 place-items-center rounded-xl bg-amber-100 text-amber-800 shrink-0 font-bold text-xs">!</span>
                  <span>Chưa có món đồ nào được chọn</span>
                </div>
                <button type="button" onClick={() => navigate('wardrobe')} className="flex items-center gap-1.5 self-start font-bold text-amber-900 transition hover:underline sm:self-auto">
                  Đến tủ đồ <ChevronRight size={15} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:h-[calc(100dvh-250px)] lg:min-h-[620px] lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-h-0">
                <ResultStage states={generation.states} onRegenerate={generation.regenerate} />
              </div>
              <div className="min-h-0">
                <PersonPanel
                  onGenerate={generation.generateAll}
                  onClearResults={generation.clearResults}
                  onClearAllResults={generation.clearAllResults}
                  isGenerating={generation.isGenerating}
                />
              </div>
            </div>
          </main>
        )}

        {activeView === 'outfits' && (
          <OutfitHistory
            outfits={generation.history}
            isLoading={generation.isHistoryLoading}
            error={generation.historyError}
            onDelete={generation.deleteOutfit}
            onBack={() => navigate('fitting')}
          />
        )}

        {activeView === 'profile' && (
          <ProfilePage
            user={user}
            garmentCount={garments.length}
            outfitCount={generation.history.length}
            isLoggingOut={isLoggingOut}
            onNavigate={navigate}
            onLogout={() => void logout()}
          />
        )}
      </div>

      <UploadGarmentModal
        open={isUploadOpen}
        defaultCategory={activeCategory}
        onClose={() => setIsUploadOpen(false)}
        onSaved={addGarment}
      />
    </div>
  )
}

function App() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)
  const [startupError, setStartupError] = useState<string | null>(null)

  useEffect(() => {
    authApi.me()
      .then(setUser)
      .catch((error: unknown) => {
        setStartupError(error instanceof Error ? error.message : 'Không thể kiểm tra phiên đăng nhập.')
        setUser(null)
      })
  }, [])

  if (user === undefined) {
    return <div className="grid min-h-screen place-items-center bg-canvas"><div className="text-center text-ink/40"><span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-ink text-white"><Sparkles size={20} /></span><LoaderCircle size={20} className="mx-auto animate-spin" /><p className="mt-3 text-xs font-semibold">Đang mở phòng thử…</p></div></div>
  }

  if (!user) {
    return <><AuthPage onAuthenticated={(authenticatedUser) => { setStartupError(null); setUser(authenticatedUser) }} />{startupError && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-600 px-4 py-2 text-xs text-white shadow-lg">{startupError}</div>}</>
  }

  return <FittingRoomApp user={user} onLoggedOut={() => setUser(null)} />
}

export default App
