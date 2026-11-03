import {
  ArrowLeft,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Eye,
  FileText,
  Link2,
  PackageSearch,
  PenLine,
  Plus,
  Save,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { AppView } from '../navigation'
import type { AuthUser } from '../types/auth'

type StudioTab = 'overview' | 'content' | 'catalog' | 'earnings'
type KocDraft = {
  id: string
  title: string
  caption: string
  productUrl: string
  createdAt: string
}

const tabs: Array<{ id: StudioTab; label: string; icon: typeof Sparkles }> = [
  { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { id: 'content', label: 'Nội dung', icon: FileText },
  { id: 'catalog', label: 'Danh mục', icon: ShoppingBag },
  { id: 'earnings', label: 'Thu nhập', icon: CircleDollarSign },
]

const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

export function KocStudioPage({ user, onNavigate }: { user: AuthUser; onNavigate: (view: AppView) => void }) {
  const storageKey = `tryoh:koc-drafts:${user.id}`
  const [activeTab, setActiveTab] = useState<StudioTab>('overview')
  const [composerOpen, setComposerOpen] = useState(false)
  const [drafts, setDrafts] = useState<KocDraft[]>(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) as KocDraft[] : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(drafts))
  }, [drafts, storageKey])

  const profileProgress = useMemo(() => {
    const completed = [true, drafts.length > 0, false, false].filter(Boolean).length
    return Math.round((completed / 4) * 100)
  }, [drafts.length])

  const saveDraft = (draft: Omit<KocDraft, 'id' | 'createdAt'>) => {
    setDrafts(current => [{
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }, ...current])
    setComposerOpen(false)
    setActiveTab('content')
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="relative overflow-hidden rounded-[32px] border border-black/[0.06] bg-[linear-gradient(135deg,#19231f_0%,#2f4937_58%,#876c3e_100%)] p-6 text-white shadow-[0_24px_70px_rgba(22,35,28,0.2)] sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button onClick={() => onNavigate('fitting')} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/15 hover:text-white">
              <ArrowLeft size={14} /> Về phòng thử
            </button>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">
              <Sparkles size={13} /> Tryoh Creator
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">KOC Studio</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              Chuẩn bị nội dung, gắn sản phẩm và theo dõi hiệu quả trong một không gian riêng dành cho nhà sáng tạo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75">Giao diện thử nghiệm</span>
            <button onClick={() => setComposerOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#19231f] shadow-lg transition hover:-translate-y-0.5">
              <PenLine size={16} /> Tạo nội dung
            </button>
          </div>
        </div>
      </section>

      <nav className="scrollbar-none mt-5 flex gap-2 overflow-x-auto rounded-[22px] border border-black/[0.06] bg-panel/90 p-2 shadow-sm" aria-label="KOC Studio">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id} className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition ${activeTab === tab.id ? 'bg-ink text-white shadow-md' : 'text-ink/50 hover:bg-black/[0.04] hover:text-ink'}`}>
              <Icon size={15} /> {tab.label}
            </button>
          )
        })}
      </nav>

      <div key={activeTab} className="app-page-transition mt-5">
        {activeTab === 'overview' && (
          <Overview
            user={user}
            draftCount={drafts.length}
            progress={profileProgress}
            onCreate={() => setComposerOpen(true)}
            onOpenTab={setActiveTab}
          />
        )}
        {activeTab === 'content' && (
          <ContentPanel
            drafts={drafts}
            onCreate={() => setComposerOpen(true)}
            onDelete={id => setDrafts(current => current.filter(draft => draft.id !== id))}
          />
        )}
        {activeTab === 'catalog' && <CatalogPanel onGoWardrobe={() => onNavigate('wardrobe')} />}
        {activeTab === 'earnings' && <EarningsPanel />}
      </div>

      <DraftComposer open={composerOpen} onClose={() => setComposerOpen(false)} onSave={saveDraft} />
    </main>
  )
}

function Overview({ user, draftCount, progress, onCreate, onOpenTab }: {
  user: AuthUser
  draftCount: number
  progress: number
  onCreate: () => void
  onOpenTab: (tab: StudioTab) => void
}) {
  const metrics = [
    { label: 'Bài đã xuất bản', value: '0', note: 'Chưa nối kênh xuất bản', icon: FileText },
    { label: 'Lượt xem', value: '0', note: 'Sẽ lấy từ analytics', icon: Eye },
    { label: 'Đơn ghi nhận', value: '0', note: 'Chưa nối affiliate', icon: PackageSearch },
    { label: 'Hoa hồng', value: '—', note: 'Chưa có ledger thanh toán', icon: BadgeDollarSign },
  ]
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(metric => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className="rounded-[24px] border border-black/[0.06] bg-panel p-5 shadow-sm">
                <span className="grid size-10 place-items-center rounded-2xl bg-sage-100 text-sage-700"><Icon size={17} /></span>
                <p className="mt-5 text-2xl font-bold text-ink">{metric.value}</p>
                <p className="mt-1 text-xs font-bold text-ink/65">{metric.label}</p>
                <p className="mt-1 text-[10px] leading-4 text-ink/35">{metric.note}</p>
              </article>
            )
          })}
        </section>

        <section className="rounded-[28px] border border-black/[0.06] bg-panel p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage-700">Bắt đầu sáng tạo</p><h2 className="mt-1 font-display text-xl font-bold text-ink">Nội dung của bạn</h2></div>
            <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white"><Plus size={14} /> Tạo bản nháp</button>
          </div>
          {draftCount === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-black/10 bg-black/[0.015] px-6 py-10 text-center">
              <PenLine size={26} className="mx-auto text-ink/20" />
              <p className="mt-3 text-sm font-bold text-ink">Chưa có nội dung nào</p>
              <p className="mt-1 text-xs text-ink/40">Tạo bản nháp đầu tiên rồi chọn sản phẩm muốn gắn.</p>
            </div>
          ) : (
            <button onClick={() => onOpenTab('content')} className="mt-5 flex w-full items-center gap-4 rounded-3xl bg-sage-50 p-5 text-left">
              <span className="grid size-11 place-items-center rounded-2xl bg-white text-sage-700"><FileText size={18} /></span>
              <span className="flex-1"><span className="block text-sm font-bold text-ink">{draftCount} bản nháp</span><span className="block text-xs text-ink/40">Tiếp tục chỉnh sửa nội dung</span></span>
              <ChevronRight size={18} className="text-ink/30" />
            </button>
          )}
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-[28px] border border-black/[0.06] bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-amber-100 to-sage-100 text-lg font-bold text-sage-900">{user.displayName.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{user.displayName}</p><p className="text-xs text-ink/40">Hồ sơ nhà sáng tạo</p></div>
          </div>
          <div className="mt-5 flex items-center justify-between text-xs"><span className="font-semibold text-ink/55">Mức hoàn thiện</span><span className="font-bold text-sage-700">{progress}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.06]"><span className="block h-full rounded-full bg-sage-600 transition-[width]" style={{ width: `${progress}%` }} /></div>
        </section>
        <section className="rounded-[28px] border border-black/[0.06] bg-panel p-5 shadow-sm">
          <h2 className="text-sm font-bold text-ink">Việc cần hoàn thiện</h2>
          <ul className="mt-4 space-y-3 text-xs">
            <ChecklistItem done text="Tạo tài khoản Tryoh" />
            <ChecklistItem done={draftCount > 0} text="Tạo nội dung đầu tiên" />
            <ChecklistItem done={false} text="Xác minh hồ sơ KOC" />
            <ChecklistItem done={false} text="Kết nối catalog đối tác" />
          </ul>
        </section>
      </aside>
    </div>
  )
}

function ChecklistItem({ done, text }: { done: boolean; text: string }) {
  return <li className="flex items-center gap-3"><span className={`grid size-6 place-items-center rounded-full ${done ? 'bg-sage-100 text-sage-700' : 'bg-black/[0.04] text-ink/25'}`}>{done ? <CheckCircle2 size={14} /> : <span className="size-1.5 rounded-full bg-current" />}</span><span className={done ? 'font-medium text-ink/55' : 'text-ink/45'}>{text}</span></li>
}

function ContentPanel({ drafts, onCreate, onDelete }: { drafts: KocDraft[]; onCreate: () => void; onDelete: (id: string) => void }) {
  return (
    <section className="rounded-[28px] border border-black/[0.06] bg-panel p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage-700">Thư viện nội dung</p><h2 className="mt-1 font-display text-xl font-bold text-ink">Bản nháp của bạn</h2></div>
        <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-white"><Plus size={14} /> Bản nháp mới</button>
      </div>
      {drafts.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-black/10 px-6 py-14 text-center"><FileText size={28} className="mx-auto text-ink/20" /><p className="mt-3 text-sm font-bold text-ink">Chưa có bản nháp</p><p className="mt-1 text-xs text-ink/40">Nội dung lưu ở thiết bị này cho đến khi backend KOC được nối.</p></div>
      ) : (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {drafts.map(draft => (
            <article key={draft.id} className="rounded-3xl border border-black/[0.06] bg-white/70 p-5">
              <div className="flex items-start justify-between gap-4"><div className="min-w-0"><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-800">Bản nháp</span><h3 className="mt-3 truncate font-bold text-ink">{draft.title}</h3></div><button onClick={() => onDelete(draft.id)} className="grid size-8 place-items-center rounded-full text-ink/30 transition hover:bg-red-50 hover:text-red-600" aria-label={`Xoá ${draft.title}`}><Trash2 size={14} /></button></div>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink/45">{draft.caption || 'Chưa có mô tả.'}</p>
              {draft.productUrl && <p className="mt-3 flex items-center gap-1.5 truncate text-[10px] text-sage-700"><Link2 size={11} /> {draft.productUrl}</p>}
              <p className="mt-4 text-[10px] text-ink/30">Lưu {formatDate(draft.createdAt)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function CatalogPanel({ onGoWardrobe }: { onGoWardrobe: () => void }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-[28px] border border-black/[0.06] bg-panel p-6 shadow-sm">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-sage-100 text-sage-700"><ShoppingBag size={19} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage-700">Catalog</p><h2 className="font-display text-xl font-bold text-ink">Sản phẩm có thể gắn</h2></div></div>
        <div className="mt-6 rounded-3xl border border-dashed border-black/10 bg-black/[0.015] px-6 py-14 text-center"><PackageSearch size={30} className="mx-auto text-ink/20" /><p className="mt-3 text-sm font-bold text-ink">Chưa kết nối catalog đối tác</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-ink/40">Khi có API catalog hợp pháp, sản phẩm, biến thể, tồn kho và deep link sẽ xuất hiện tại đây.</p></div>
      </div>
      <aside className="rounded-[28px] border border-black/[0.06] bg-panel p-5 shadow-sm"><h3 className="text-sm font-bold text-ink">Dùng đồ trong tủ</h3><p className="mt-2 text-xs leading-5 text-ink/45">Bạn vẫn có thể chuẩn bị outfit và hình ảnh trước khi catalog KOC được kết nối.</p><button onClick={onGoWardrobe} className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-xs font-bold text-ink"><ShoppingBag size={14} /> Mở tủ đồ</button></aside>
    </section>
  )
}

function EarningsPanel() {
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <article className="rounded-[28px] border border-black/[0.06] bg-panel p-6 shadow-sm lg:col-span-2"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-800"><BadgeDollarSign size={20} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Thu nhập</p><h2 className="font-display text-xl font-bold text-ink">Chưa kích hoạt thanh toán</h2></div></div><p className="mt-5 max-w-2xl text-sm leading-7 text-ink/50">Số dư, giao dịch và yêu cầu rút tiền sẽ chỉ hiển thị sau khi có hệ thống attribution, ledger và quy trình đối soát thật.</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{['Đang chờ đối soát', 'Có thể rút', 'Đã thanh toán'].map(label => <div key={label} className="rounded-2xl bg-black/[0.025] p-4"><p className="text-xl font-bold text-ink">—</p><p className="mt-1 text-[10px] font-semibold text-ink/40">{label}</p></div>)}</div></article>
      <aside className="rounded-[28px] border border-black/[0.06] bg-panel p-5 shadow-sm"><h3 className="text-sm font-bold text-ink">Trước khi kích hoạt</h3><ul className="mt-4 space-y-3 text-xs leading-5 text-ink/50"><li>• Xác minh danh tính KOC</li><li>• Chốt ngưỡng rút và lịch thanh toán</li><li>• Kết nối đối tác affiliate</li><li>• Hoàn thiện điều khoản và thuế</li></ul></aside>
    </section>
  )
}

function DraftComposer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (draft: Omit<KocDraft, 'id' | 'createdAt'>) => void }) {
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [productUrl, setProductUrl] = useState('')
  useEffect(() => {
    if (!open) { setTitle(''); setCaption(''); setProductUrl('') }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={event => { event.preventDefault(); onSave({ title: title.trim(), caption: caption.trim(), productUrl: productUrl.trim() }) }} className="w-full max-w-xl rounded-[30px] bg-panel p-5 shadow-2xl sm:p-6" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage-700">Nội dung mới</p><h2 className="mt-1 font-display text-xl font-bold text-ink">Tạo bản nháp KOC</h2></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-black/[0.05] text-ink/50" aria-label="Đóng"><X size={17} /></button></div>
        <div className="mt-6 space-y-4">
          <label className="block text-xs font-bold text-ink/55">Tiêu đề<input autoFocus required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ví dụ: Outfit đi cà phê cuối tuần" className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400" /></label>
          <label className="block text-xs font-bold text-ink/55">Nội dung<textarea maxLength={1200} rows={5} value={caption} onChange={event => setCaption(event.target.value)} placeholder="Chia sẻ cách phối, cảm nhận và tình huống sử dụng…" className="mt-1.5 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400" /></label>
          <label className="block text-xs font-bold text-ink/55">Link sản phẩm (tuỳ chọn)<input type="url" value={productUrl} onChange={event => setProductUrl(event.target.value)} placeholder="https://…" className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-400" /></label>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] leading-4 text-ink/35">Bản nháp hiện chỉ lưu trên thiết bị này, chưa xuất bản công khai.</p><button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white"><Save size={15} /> Lưu bản nháp</button></div>
      </form>
    </div>
  )
}
