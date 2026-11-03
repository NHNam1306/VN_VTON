export type AppView = 'wardrobe' | 'fitting' | 'outfits' | 'profile' | 'settings' | 'feed' | 'friends' | 'koc' | 'admin'

export const appViewPaths: Record<AppView, string> = {
  wardrobe: '/tu-do',
  fitting: '/phong-thu',
  outfits: '/bo-do-cua-toi',
  profile: '/tai-khoan',
  settings: '/cai-dat',
  feed: '/bang-tin',
  friends: '/ban-be',
  koc: '/koc',
  admin: '/admin',
}

export const resolveAppView = (pathname: string): AppView | null => {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return (Object.entries(appViewPaths).find(([, path]) => path === normalized)?.[0] as AppView | undefined) ?? null
}
