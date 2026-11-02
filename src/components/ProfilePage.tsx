import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Images,
  LockKeyhole,
  LogOut,
  Mail,
  Shirt,
  UserRound,
} from 'lucide-react'
import type { AppView } from '../navigation'
import type { AuthUser } from '../types/auth'

type ProfilePageProps = {
  user: AuthUser
  garmentCount: number
  outfitCount: number
  isLoggingOut: boolean
  onNavigate: (view: AppView) => void
  onLogout: () => void
}

const formatJoinDate = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'long',
}).format(new Date(value))

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0]?.slice(0, 2) || 'AI').toUpperCase()
}

export function ProfilePage({
  user,
  garmentCount,
  outfitCount,
  isLoggingOut,
  onNavigate,
  onLogout,
}: ProfilePageProps) {
  const actions: Array<{
    view: AppView
    title: string
    description: string
    icon: typeof Shirt
  }> = [
      { view: 'wardrobe', title: 'Quản lý tủ đồ', description: garmentCount + ' món đã lưu', icon: Shirt },
      { view: 'outfits', title: 'Xem bộ đồ của tôi', description: outfitCount + ' bộ ảnh đã tạo', icon: Images },
    ]

  return (
    <main className="mx-auto w-full max-w-[1380px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sage-700"><UserRound size={14} /> Không gian cá nhân</div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Tài khoản của bạn</h2>
        <p className="mt-2 text-sm leading-6 text-ink/45">Thông tin | Hoạt động </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[30px] border border-black/[0.055] bg-panel shadow-soft">
          <div className="bg-[linear-gradient(135deg,#263523_0%,#40563c_55%,#668360_100%)] px-6 pb-16 pt-7 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Hồ sơ thành viên</p>
          </div>
          <div className="-mt-11 px-6 pb-6">
            <div className="grid size-[88px] place-items-center rounded-[26px] border-4 border-panel bg-sage-100 text-2xl font-bold text-sage-900 shadow-[0_12px_30px_rgba(23,33,29,0.18)]">
              {getInitials(user.displayName)}
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-display text-xl font-bold text-ink">{user.displayName}</h3>
                <CheckCircle2 size={16} className="shrink-0 text-sage-500" aria-label="Đang hoạt động" />
              </div>
              <p className="mt-1 flex items-center gap-2 text-xs text-ink/45"><Mail size={13} /> {user.email}</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-ink/40"><CalendarDays size={13} /> Tham gia {formatJoinDate(user.createdAt)}</p>
            </div>

            <div className="mt-6 rounded-2xl border border-sage-100 bg-sage-50/80 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-sage-900"><LockKeyhole size={14} /> Tài khoản được bảo vệ</div>
              <p className="mt-1.5 text-[11px] leading-5 text-sage-900/60">Dữ liệu tủ đồ và kết quả thử được tách riêng theo tài khoản đăng nhập.</p>
            </div>

            <button type="button" onClick={onLogout} disabled={isLoggingOut} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-40">
              <LogOut size={15} /> {isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </button>
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-[30px] border border-black/[0.055] bg-panel p-5 shadow-soft sm:p-6">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/35">Tổng quan</p>
              <h3 className="mt-1 font-display text-xl font-bold text-ink">Hoạt động của bạn</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/[0.05] bg-white/70 p-4">
                <span className="grid size-9 place-items-center rounded-xl bg-sage-100 text-sage-700"><Shirt size={16} /></span>
                <p className="mt-5 text-2xl font-bold text-ink">{garmentCount}</p>
                <p className="mt-1 text-xs font-medium text-ink/40">Món trong tủ</p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white/70 p-4">
                <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><Images size={16} /></span>
                <p className="mt-5 text-2xl font-bold text-ink">{outfitCount}</p>
                <p className="mt-1 text-xs font-medium text-ink/40">Bộ ảnh</p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-black/[0.055] bg-panel p-5 shadow-soft sm:p-6">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/35">Truy cập nhanh</p>
              <h3 className="mt-1 font-display text-xl font-bold text-ink">Tiếp tục công việc</h3>
            </div>
            <div className="divide-y divide-black/[0.055]">
              {actions.map((action) => {
                const Icon = action.icon
                return (
                  <button key={action.view} type="button" onClick={() => onNavigate(action.view)} className="group flex w-full items-center gap-4 py-4 text-left first:pt-2 last:pb-1">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-black/[0.035] text-ink/55 transition group-hover:bg-sage-100 group-hover:text-sage-700"><Icon size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{action.title}</span>
                      <span className="mt-0.5 block text-xs text-ink/40">{action.description}</span>
                    </span>
                    <ArrowRight size={16} className="text-ink/20 transition group-hover:translate-x-1 group-hover:text-sage-700" />
                  </button>
                )
              })}
            </div>
          </section>

          <section className="flex items-start gap-3 rounded-[24px] border border-violet-100 bg-violet-50/70 p-4 text-violet-950/65">
            <LockKeyhole size={18} className="mt-0.5 shrink-0 text-violet-700" />
            <div>
              <p className="text-xs font-bold text-violet-950">Quyền riêng tư hình ảnh</p>
              <p className="mt-1 text-[11px] leading-5">Ảnh chỉ được gửi tới nhà cung cấp khi bạn xác nhận quyền riêng tư và bấm tạo ảnh. Bạn có thể xoá ảnh cá nhân cùng kết quả tại Phòng thử.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
