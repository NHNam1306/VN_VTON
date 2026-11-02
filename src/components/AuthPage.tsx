import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { authApi } from '../services/auth-api'
import type { AuthUser } from '../types/auth'

type AuthMode = 'login' | 'register'

type AuthPageProps = {
  onAuthenticated: (user: AuthUser) => void
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
    setPassword('')
    setConfirmPassword('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'register' && password !== confirmPassword) {
      setError('Mật khẩu nhập lại chưa khớp.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const user = mode === 'login'
        ? await authApi.login({ email, password })
        : await authApi.register({ displayName, email, password })
      onAuthenticated(user)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể xác thực tài khoản.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-sage-100/80 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-20 size-[32rem] rounded-full bg-violet-100/65 blur-3xl" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[34px] border border-white/75 bg-panel shadow-[0_30px_90px_rgba(23,33,29,0.14)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden min-h-[650px] overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(169,190,163,0.32),transparent_36%),radial-gradient(circle_at_85%_80%,rgba(139,92,246,0.2),transparent_40%)]" />
          <div className="relative">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Sparkles size={22} /></span>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.22em] text-sage-300">Fitting Room</p>
            <h1 className="mt-3 max-w-md font-display text-4xl font-bold leading-[1.15]">Thử phong cách mới trên chính ảnh của bạn</h1>

          </div>

        </div>

        <div className="p-5 sm:p-9 lg:p-10">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-2xl bg-ink text-white"><Sparkles size={20} /></span>
            <div><p className="font-display text-lg font-bold text-ink">Fitting Room</p><p className="text-xs text-ink/40">Không gian thử đồ của bạn</p></div>
          </div>

          <div className="rounded-2xl bg-black/[0.04] p-1" role="tablist" aria-label="Đăng nhập hoặc đăng ký">
            <div className="grid grid-cols-2">
              <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => changeMode('login')} className={'rounded-xl px-4 py-2.5 text-sm transition ' + (mode === 'login' ? 'bg-white font-bold text-ink shadow-sm' : 'font-medium text-ink/40 hover:text-ink')}>Đăng nhập</button>
              <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => changeMode('register')} className={'rounded-xl px-4 py-2.5 text-sm transition ' + (mode === 'register' ? 'bg-white font-bold text-ink shadow-sm' : 'font-medium text-ink/40 hover:text-ink')}>Đăng ký</button>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage-700">{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}</p>
            <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-ink">{mode === 'login' ? 'Tiếp tục vào phòng thử' : 'Bắt đầu tủ đồ của riêng bạn'}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/45">{mode === 'login' ? 'Đăng nhập để xem lại ảnh và tủ đồ đã lưu.' : 'Dùng email và mật khẩu tối thiểu 8 ký tự.'}</p>
          </div>

          <form onSubmit={(event) => void submit(event)} className="mt-7 space-y-4">
            {mode === 'register' && (
              <label className="block"><span className="mb-2 block text-xs font-bold text-ink/65">Tên hiển thị</span><span className="relative block"><UserRound size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" /><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required minLength={2} maxLength={50} placeholder="Tên của bạn" className="w-full rounded-2xl border border-black/10 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-ink/25 focus:border-sage-500 focus:ring-4 focus:ring-sage-100" /></span></label>
            )}
            <label className="block"><span className="mb-2 block text-xs font-bold text-ink/65">Email</span><span className="relative block"><Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength={254} placeholder="ban@example.com" className="w-full rounded-2xl border border-black/10 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-ink/25 focus:border-sage-500 focus:ring-4 focus:ring-sage-100" /></span></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-ink/65">Mật khẩu</span><span className="relative block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} placeholder="Tối thiểu 8 ký tự" className="w-full rounded-2xl border border-black/10 bg-white py-3.5 pl-11 pr-12 text-sm outline-none transition placeholder:text-ink/25 focus:border-sage-500 focus:ring-4 focus:ring-sage-100" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-xl text-ink/30 hover:bg-black/5 hover:text-ink" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
            {mode === 'register' && (
              <label className="block"><span className="mb-2 block text-xs font-bold text-ink/65">Nhập lại mật khẩu</span><span className="relative block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" /><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Nhập lại mật khẩu" className="w-full rounded-2xl border border-black/10 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-ink/25 focus:border-sage-500 focus:ring-4 focus:ring-sage-100" /></span></label>
            )}

            {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700" role="alert">{error}</div>}

            <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,33,29,0.18)] transition hover:-translate-y-0.5 hover:bg-sage-700 disabled:cursor-wait disabled:opacity-50 disabled:hover:translate-y-0">
              {isSubmitting && <LoaderCircle size={17} className="animate-spin" />}
              {isSubmitting ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
