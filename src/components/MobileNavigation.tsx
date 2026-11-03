import { BadgeDollarSign, Camera, Home, MessageSquare, Plus, Shirt, Sparkles, UserRound, X } from 'lucide-react'
import type { AppView } from '../navigation'

export function MobileNavigation({ activeView, onNavigate, onQuickAction }: { activeView: AppView; onNavigate: (view: AppView) => void; onQuickAction: () => void }) {
  const items: Array<{ view: AppView; label: string; icon: typeof Home }> = [
    { view: 'feed', label: 'Trang chủ', icon: Home },
    { view: 'wardrobe', label: 'Tủ đồ', icon: Shirt },
    { view: 'fitting', label: 'Phòng thử', icon: Sparkles },
    { view: 'profile', label: 'Hồ sơ', icon: UserRound },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-panel/95 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(23,33,29,0.1)] backdrop-blur-xl lg:hidden" aria-label="Điều hướng di động">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end">
        {items.slice(0, 2).map(item => <NavItem key={item.view} {...item} active={activeView === item.view} onClick={() => onNavigate(item.view)} />)}
        <button onClick={onQuickAction} className="-mt-8 mx-auto grid size-14 place-items-center rounded-full border-4 border-canvas bg-ink text-white shadow-lg" aria-label="Tạo mới"><Plus size={24} /></button>
        {items.slice(2).map(item => <NavItem key={item.view} {...item} active={activeView === item.view} onClick={() => onNavigate(item.view)} />)}
      </div>
    </nav>
  )
}

function NavItem({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Home; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition ${active ? 'text-sage-700' : 'text-ink/40'}`} aria-current={active ? 'page' : undefined}><Icon size={20} strokeWidth={active ? 2.5 : 1.8} /><span>{label}</span></button>
}

export function QuickActionSheet({ open, onClose, onUpload, onOutfit, onPoll, onKoc }: { open: boolean; onClose: () => void; onUpload: () => void; onOutfit: () => void; onPoll: () => void; onKoc: () => void }) {
  if (!open) return null
  const actions = [
    { title: 'Thêm món đồ', description: 'Chụp hoặc chọn ảnh trang phục', icon: Camera, action: onUpload },
    { title: 'Tạo outfit', description: 'Phối đồ trong phòng thử', icon: Sparkles, action: onOutfit },
    { title: 'Xin ý kiến bạn bè', description: 'Tạo bình chọn riêng tư', icon: MessageSquare, action: onPoll },
    { title: 'KOC Studio', description: 'Chuẩn bị nội dung và sản phẩm', icon: BadgeDollarSign, action: onKoc },
  ]
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/35 p-3 backdrop-blur-sm lg:items-center lg:justify-center" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label="Tạo mới" className="w-full rounded-[28px] bg-panel p-5 shadow-2xl lg:max-w-md" onClick={event => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage-700">Tạo mới</p><h2 className="mt-1 font-display text-xl font-bold text-ink">Bạn muốn làm gì?</h2></div><button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-black/[0.05] text-ink/50"><X size={17} /></button></div>
        <div className="space-y-2">{actions.map(({ title, description, icon: Icon, action }) => <button key={title} onClick={() => { onClose(); action() }} className="flex w-full items-center gap-4 rounded-2xl border border-black/[0.06] bg-white/70 p-4 text-left transition hover:border-sage-300 hover:bg-sage-50"><span className="grid size-11 place-items-center rounded-2xl bg-sage-100 text-sage-700"><Icon size={19} /></span><span><span className="block text-sm font-bold text-ink">{title}</span><span className="mt-0.5 block text-xs text-ink/45">{description}</span></span></button>)}</div>
      </section>
    </div>
  )
}
