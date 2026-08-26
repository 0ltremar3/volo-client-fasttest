import { BarChart3, Bug, History, MessageCircle, NotebookText } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { AppMark } from '@/components/app-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navigation = [
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/conversations', label: 'History', icon: History },
  { to: '/review', label: 'Review', icon: NotebookText },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
] as const

const pageTitles: Record<string, string> = {
  '/chat': 'Chat',
  '/conversations': 'Conversations',
  '/review': 'Review',
  '/insights': 'Insights',
  '/debug': 'Debug',
}

export function AppShell() {
  const { pathname } = useLocation()
  const pageTitle = pageTitles[pathname] ?? 'Quiet'

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="safe-top sticky top-0 z-30 border-b border-border-subtle bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-header w-full max-w-content items-center gap-3 px-page">
          <AppMark className="size-7 rounded-md p-1.5" />
          <p className="min-w-0 flex-1 truncate font-display text-sm font-semibold tracking-tight">
            {pageTitle}
          </p>
          <Button asChild variant="ghost" size="icon">
            <NavLink to="/debug" aria-label="Open debug page">
              <Bug />
            </NavLink>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col px-page pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)]">
        <Outlet />
      </main>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface/95 backdrop-blur-md"
        aria-label="Primary navigation"
      >
        <div className="mx-auto grid h-bottom-nav w-full max-w-content grid-cols-4 px-1">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md text-xs font-medium text-text-tertiary transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive && 'text-primary',
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
