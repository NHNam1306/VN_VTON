import { ChevronRight, LayoutGrid, LoaderCircle, Shirt, Sparkles, WandSparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AuthPage } from './components/AuthPage'
import { AdminPage } from './components/admin/AdminPage'
import { Header } from './components/Header'
import { KocStudioPage } from './components/KocStudioPage'
import { MobileNavigation, QuickActionSheet } from './components/MobileNavigation'
import { OnboardingFlow } from './components/OnboardingFlow'
import { OutfitHistory } from './components/OutfitHistory'
import { PersonPanel } from './components/PersonPanel'
import { ProfilePage } from './components/ProfilePage'
import { SettingsPage } from './components/SettingsPage'
import { SocialPage } from './components/social/SocialPage'
import { ResultStage } from './components/ResultStage'
import { UploadGarmentModal } from './components/UploadGarmentModal'
import { WardrobePanel } from './components/WardrobePanel'
import { useTryOnGeneration } from './hooks/useTryOnGeneration'
import { appViewPaths, resolveAppView, type AppView } from './navigation'
import { authApi } from './services/auth-api'
import { garmentApi } from './services/garment-api'
import { personApi } from './services/person-api'
import { socialApi } from './services/social-api'
import { useFittingRoomStore } from './store/useFittingRoomStore'
import type { AuthUser } from './types/auth'
import { MAX_SELECTED_GARMENTS, MAX_WARDROBE_GARMENTS } from './types/fitting-room'

type FittingRoomAppProps = {
  user: AuthUser
  onLoggedOut: () => void
  onUserUpdate: (user: AuthUser) => void
}

const runViewTransition = (update: () => void) => {
  update()
}

function FittingRoomApp({ user, onLoggedOut, onUserUpdate }: FittingRoomAppProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false)
  const [composeSignal, setComposeSignal] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(() => window.localStorage.getItem(`tryoh:onboarding:${user.id}:v1`) !== 'complete')
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('tryoh:theme') === 'dark')
  const [activeView, setActiveView] = useState<AppView>(() => resolveAppView(window.location.pathname) ?? 'feed')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    window.localStorage.setItem('tryoh:theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    let current = true
    socialApi.snapshot()
      .then((snapshot) => {
        if (current) setAvatarUrl(snapshot.me.avatar.startsWith('/uploads/') ? snapshot.me.avatar : null)
      })
      .catch(() => { if (current) setAvatarUrl(null) })
    return () => { current = false }
  }, [user.id])

  const navigate = useCallback((view: AppView) => {
    const nextPath = appViewPaths[view]
    if (window.location.pathname !== nextPath) window.history.pushState(null, '', nextPath)
    setActiveView(view)
    if (window.scrollY > 120) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const openGarmentUpload = () => {
    if (garments.length >= MAX_WARDROBE_GARMENTS) {
      setError(`Tủ đồ chỉ lưu tối đa ${MAX_WARDROBE_GARMENTS} món. Hãy xoá bớt một món trước.`)
      navigate('wardrobe')
      return
    }
    setError(null)
    setIsUploadOpen(true)
  }

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

  const openPollComposer = () => {
    navigate('feed')
    setComposeSignal(value => value + 1)
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
    <div className="min-h-screen bg-canvas pb-24 text-ink bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(215,223,212,0.32),transparent_70%),radial-gradient(circle_at_bottom_right,rgba(235,230,220,0.35),transparent_50%)] lg:pb-0">
      <Header
        activeView={activeView}
        historyCount={generation.history.length}
        selectedCount={selectedCount}
        onViewChange={navigate}
        user={user}
        isLoggingOut={isLoggingOut}
        onLogout={() => void logout()}
        avatarUrl={avatarUrl}
      />

      <div key={activeView} className="app-page-transition">
        {(activeView === 'feed' || activeView === 'friends') && <SocialPage mode={activeView} composeSignal={composeSignal} onCreateOutfit={() => navigate('fitting')} />}
        {activeView === 'wardrobe' && (
          <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <WardrobePanel
              mode="page"
              onAddGarment={openGarmentUpload}
              onGoToFitting={() => navigate('fitting')}
            />
          </main>
        )}

        {activeView === 'fitting' && (
          <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            <section className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Phòng thử đồ ảo</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('wardrobe')}
                className="group flex items-center gap-2.5 self-start rounded-full border border-black/[0.08] bg-white/85 px-4 py-2 text-xs sm:text-sm font-semibold text-ink shadow-xs backdrop-blur-md transition-all hover:border-black/20 hover:bg-white hover:shadow-md sm:self-auto"
              >
                <Shirt size={15} className="text-ink/60 transition-transform group-hover:scale-110" />
                <span>Chọn đồ</span>
                <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-bold text-ink">
                  {selectedCount}/{MAX_SELECTED_GARMENTS}
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
              <div className="order-2 min-h-0 lg:order-1">
                <ResultStage states={generation.states} onRegenerate={generation.regenerate} />
              </div>
              <div className="order-1 min-h-0 lg:order-2">
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
            onUpdateOutfit={generation.updateOutfit}
            onBack={() => navigate('fitting')}
            onEditInFitting={(outfit) => {
              useFittingRoomStore.getState().loadOutfitGarments(outfit.garmentIds)
              navigate('fitting')
            }}
          />
        )}

        {activeView === 'koc' && <KocStudioPage user={user} onNavigate={navigate} />}
        {activeView === 'admin' && <AdminPage user={user} onNavigate={navigate} />}

        {activeView === 'profile' && (
          <ProfilePage
            user={user}
            garmentCount={garments.length}
            outfitCount={generation.history.length}
            onNavigate={navigate}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
          />
        )}
        {activeView === 'settings' && (
          <SettingsPage
            user={user}
            isLoggingOut={isLoggingOut}
            onNavigate={navigate}
            onLogout={() => void logout()}
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
            onReplayOnboarding={() => setShowOnboarding(true)}
            onUserUpdate={onUserUpdate}
          />
        )}
      </div>

      <UploadGarmentModal
        open={isUploadOpen}
        defaultCategory={activeCategory}
        onClose={() => setIsUploadOpen(false)}
        onSaved={addGarment}
      />
      <MobileNavigation activeView={activeView} onNavigate={navigate} onQuickAction={() => setIsQuickActionOpen(true)} />
      <QuickActionSheet
        open={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onUpload={openGarmentUpload}
        onOutfit={() => navigate('fitting')}
        onPoll={openPollComposer}
        onKoc={() => navigate('koc')}
      />
      {showOnboarding && (
        <OnboardingFlow
          user={user}
          hasGarments={garments.length > 0}
          onComplete={(destination) => {
            setShowOnboarding(false)
            if (destination === 'upload') openGarmentUpload()
            else navigate('fitting')
          }}
        />
      )}
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

  return <FittingRoomApp user={user} onLoggedOut={() => setUser(null)} onUserUpdate={(updated) => setUser(updated)} />
}

export default App
