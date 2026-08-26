import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-page text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-primary">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-text-secondary">The address does not match a page.</p>
        <Button asChild className="mt-6">
          <Link to="/chat">Open chat</Link>
        </Button>
      </div>
    </main>
  )
}
