import { Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="min-h-dvh bg-[var(--coach-desktop-background)]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-background shadow-[var(--coach-frame-shadow)]">
        <Outlet />
      </main>
    </div>
  )
}
