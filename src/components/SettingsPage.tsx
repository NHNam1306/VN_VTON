import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Moon,
  RotateCcw,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { AppView } from '../navigation'
import { authApi } from '../services/auth-api'
import type { AuthUser } from '../types/auth'

type SettingsPageProps = {
  user: AuthUser
  isLoggingOut: boolean
  onNavigate: (view: AppView) => void
  onLogout: () => void
  darkMode: boolean
  onDarkModeChange: (enabled: boolean) => void
  onReplayOnboarding: () => void
  onUserUpdate: (user: AuthUser) => void
}

type Message = { type: 'success' | 'error'; text: string } | null

const fieldClass = 'mt-1.5 w-full rounded-2xl border border-black/[0.09] bg-white px-4 py-3 text-sm font-medium text-ink outline-none transition focus:border-sage-500 focus:ring-2 focus:ring-sage-400/20 dark:bg-black/15'
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#16171b] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40'

function Feedback({ message }: { message: Message }) {
  if (!message) return null
  return (
    <p className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${message.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
      {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {message.text}
    </p>
  )
}

export function SettingsPage({
  user,
  isLoggingOut,
  onNavigate,
  onLogout,
  darkMode,
  onDarkModeChange,
  onReplayOnboarding,
  onUserUpdate,
}: SettingsPageProps) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [savingName, setSavingName] = useState(false)
  const [nameMessage, setNameMessage] = useState<Message>(null)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailMessage, setEmailMessage] = useState<Message>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<Message>(null)

  const saveName = async (event: FormEvent) => {
    event.preventDefault()
    const value = displayName.trim()
    if (value.length < 2) {
      setNameMessage({ type: 'error', text: 'Tên hiển thị cần ít nhất 2 ký tự.' })
      return
    }
    setSavingName(true)
    setNameMessage(null)
    try {
      const updated = await authApi.updateProfile({ displayName: value })
      onUserUpdate(updated)
      setDisplayName(updated.displayName)
      setNameMessage({ type: 'success', text: 'Đã cập nhật tên hiển thị.' })
    } catch (cause) {
      setNameMessage({ type: 'error', text: cause instanceof Error ? cause.message : 'Không thể cập nhật tên.' })
    } finally {
      setSavingName(false)
    }
  }

  const saveEmail = async (event: FormEvent) => {
    event.preventDefault()
    setSavingEmail(true)
    setEmailMessage(null)
    try {
      const updated = await authApi.changeEmail({ newEmail: newEmail.trim(), password: emailPassword })
      onUserUpdate(updated)
      setNewEmail('')
      setEmailPassword('')
      setEmailMessage({ type: 'success', text: 'Đã cập nhật địa chỉ email.' })
    } catch (cause) {
      setEmailMessage({ type: 'error', text: cause instanceof Error ? cause.message : 'Không thể đổi email.' })
    } finally {
      setSavingEmail(false)
    }
  }

  const savePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu mới cần ít nhất 8 ký tự.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Hai mật khẩu mới chưa trùng nhau.' })
      return
    }
    setSavingPassword(true)
    setPasswordMessage(null)
    try {
      const text = await authApi.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage({ type: 'success', text })
    } catch (cause) {
      setPasswordMessage({ type: 'error', text: cause instanceof Error ? cause.message : 'Không thể đổi mật khẩu.' })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-start gap-4">
        <button type="button" onClick={() => onNavigate('profile')} className="mt-1 grid size-10 shrink-0 place-items-center rounded-full border border-black/[0.08] bg-white text-ink/60 shadow-xs transition hover:bg-sage-50" aria-label="Quay lại trang cá nhân"><ArrowLeft size={17} /></button>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sage-700"><Settings size={13} /> Trung tâm cài đặt</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">Cài đặt tài khoản</h1>
          <p className="mt-2 text-sm text-ink/45">Quản lý thông tin đăng nhập, bảo mật và trải nghiệm ứng dụng.</p>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <SettingsCard icon={UserRound} title="Tên hiển thị" description="Tên này xuất hiện trên hồ sơ, bình chọn và nội dung bạn chia sẻ.">
          <form onSubmit={(event) => void saveName(event)}>
            <label className="text-xs font-bold text-ink/55">Tên của bạn
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value.slice(0, 50))} minLength={2} maxLength={50} required className={fieldClass} />
            </label>
            <Feedback message={nameMessage} />
            <button type="submit" disabled={savingName || displayName.trim() === user.displayName} className={`${buttonClass} mt-4`}>{savingName && <Loader2 size={13} className="animate-spin" />} Lưu tên</button>
          </form>
        </SettingsCard>

        <SettingsCard icon={Mail} title="Địa chỉ email" description={`Email hiện tại: ${user.email}`}>
          <form onSubmit={(event) => void saveEmail(event)}>
            <label className="text-xs font-bold text-ink/55">Email mới
              <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required autoComplete="email" className={fieldClass} />
            </label>
            <label className="mt-3 block text-xs font-bold text-ink/55">Mật khẩu hiện tại
              <input type="password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} required autoComplete="current-password" className={fieldClass} />
            </label>
            <Feedback message={emailMessage} />
            <button type="submit" disabled={savingEmail || !newEmail || !emailPassword} className={`${buttonClass} mt-4`}>{savingEmail && <Loader2 size={13} className="animate-spin" />} Đổi email</button>
          </form>
        </SettingsCard>

        <SettingsCard icon={KeyRound} title="Mật khẩu" description="Dùng mật khẩu mới tối thiểu 8 ký tự và không chia sẻ với người khác.">
          <form onSubmit={(event) => void savePassword(event)}>
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setShowPasswords((value) => !value)} className="flex items-center gap-1.5 text-[10px] font-semibold text-ink/45 hover:text-ink">{showPasswords ? <EyeOff size={12} /> : <Eye size={12} />}{showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button>
            </div>
            <label className="text-xs font-bold text-ink/55">Mật khẩu hiện tại
              <input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" className={fieldClass} />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-ink/55">Mật khẩu mới<input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required autoComplete="new-password" className={fieldClass} /></label>
              <label className="text-xs font-bold text-ink/55">Nhập lại mật khẩu<input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required autoComplete="new-password" className={fieldClass} /></label>
            </div>
            <Feedback message={passwordMessage} />
            <button type="submit" disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword} className={`${buttonClass} mt-4`}>{savingPassword && <Loader2 size={13} className="animate-spin" />} Lưu mật khẩu</button>
          </form>
        </SettingsCard>

        <SettingsCard icon={darkMode ? Moon : Sun} title="Giao diện & hướng dẫn" description="Điều chỉnh cách ứng dụng hiển thị trên thiết bị này.">
          <div className="divide-y divide-black/[0.06]">
            <div className="flex items-center justify-between gap-4 py-2">
              <div><p className="text-sm font-bold text-ink">Chế độ tối</p><p className="mt-1 text-[11px] text-ink/40">Giảm độ sáng giao diện trong môi trường tối.</p></div>
              <button type="button" role="switch" aria-checked={darkMode} onClick={() => onDarkModeChange(!darkMode)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${darkMode ? 'bg-sage-700' : 'bg-black/15'}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} /></button>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div><p className="text-sm font-bold text-ink">Xem lại hướng dẫn</p><p className="mt-1 text-[11px] text-ink/40">Mở lại quy trình thiết lập ban đầu.</p></div>
              <button type="button" onClick={onReplayOnboarding} className="inline-flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-sage-50"><RotateCcw size={13} /> Mở hướng dẫn</button>
            </div>
          </div>
        </SettingsCard>
      </section>

      <section className="mt-5 flex flex-col gap-4 rounded-[26px] border border-red-100 bg-red-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-sm font-bold text-red-900">Phiên đăng nhập</h2><p className="mt-1 text-xs text-red-900/55">Đăng xuất khỏi thiết bị hiện tại. Dữ liệu của bạn vẫn được giữ nguyên.</p></div>
        <button type="button" onClick={onLogout} disabled={isLoggingOut} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50">{isLoggingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />} Đăng xuất</button>
      </section>
    </main>
  )
}

function SettingsCard({ icon: Icon, title, description, children }: { icon: typeof Settings; title: string; description: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[26px] border border-black/[0.06] bg-panel p-5 shadow-xs sm:p-6">
      <div className="mb-5 flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sage-100 text-sage-800"><Icon size={18} /></span>
        <div><h2 className="font-display text-base font-bold text-ink">{title}</h2><p className="mt-1 text-xs leading-5 text-ink/42">{description}</p></div>
      </div>
      {children}
    </article>
  )
}
