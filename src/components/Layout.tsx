import { BookOpen, ClipboardCheck, Home, Share2, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { IS_DEMO, SITE_TITLE } from '../lib/config'

const NAV = [
  { to: '/', label: '首頁', icon: Home, end: true },
  { to: '/learn', label: '教材', icon: BookOpen, end: false },
  { to: '/quiz', label: '測驗', icon: ClipboardCheck, end: false },
  { to: '/share', label: '分享', icon: Share2, end: false },
]

export function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <ShieldCheck className="size-6 shrink-0 text-brand-700" aria-hidden />
          <NavLink to="/" className="truncate text-base font-bold text-slate-900">
            {SITE_TITLE}
          </NavLink>
        </div>
        {IS_DEMO && (
          <div className="bg-amber-100 px-4 py-1.5 text-center text-sm text-amber-900" role="status">
            示範模式：測驗成績不會儲存
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
        aria-label="主要導覽"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                    isActive ? 'text-brand-700' : 'text-slate-500'
                  }`
                }
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
