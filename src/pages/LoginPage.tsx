import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppMark } from '@/components/app-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  authenticateMock,
  createMockSession,
  mockAuthEnabled,
  mockCredentials,
} from '@/features/auth/mock-auth'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(mockAuthEnabled ? mockCredentials.email : '')
  const [password, setPassword] = useState(mockAuthEnabled ? mockCredentials.password : '')
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)

    if (!mockAuthEnabled) {
      setNotice('Sign in will be connected after the real Auth API is available.')
      return
    }

    setIsSubmitting(true)
    await new Promise((resolve) => window.setTimeout(resolve, 300))

    if (!authenticateMock(email, password)) {
      setNotice('Email or password does not match the test account.')
      setIsSubmitting(false)
      return
    }

    createMockSession()
    await navigate('/chat', { replace: true })
  }

  return (
    <main className="safe-top safe-bottom flex min-h-dvh bg-background px-page py-4">
      <div className="mx-auto flex w-full max-w-sm flex-col">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <div className="my-auto py-12">
          <div className="mb-10 flex items-center gap-3">
            <AppMark />
            <span className="font-display text-sm font-semibold tracking-tight">Quiet</span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-[var(--font-size-title)] font-semibold leading-tight tracking-[var(--letter-spacing-title)]">
              Welcome back.
            </h1>
            <p className="mt-3 text-sm text-text-secondary">Sign in with your email to continue.</p>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
            {mockAuthEnabled ? (
              <div className="rounded-lg bg-surface-subtle px-4 py-3 text-xs leading-5 text-text-secondary">
                <p className="font-semibold text-foreground">Mock mode</p>
                <p>Email: {mockCredentials.email}</p>
                <p>Password: {mockCredentials.password}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setNotice(null)
                }}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <span className="inline-flex min-h-touch items-center text-xs font-medium text-text-tertiary">
                  Forgot password?
                </span>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setNotice(null)
                }}
                disabled={isSubmitting}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>

            {notice ? (
              <p role="status" className="text-sm leading-6 text-warning">
                {notice}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </main>
  )
}
