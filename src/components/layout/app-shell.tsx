import { Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="min-h-dvh bg-[var(--app-desktop-background)]">
      <main className="mx-auto flex min-h-dvh w-full max-w-none flex-col overflow-hidden bg-background shadow-[var(--app-frame-shadow)] min-[480px]:max-w-[390px]">
        <Outlet />
      </main>
    </div>
  )
}
