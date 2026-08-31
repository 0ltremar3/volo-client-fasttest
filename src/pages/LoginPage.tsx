import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { AppMark } from '@/components/app-mark'
import { authApi } from '@/api/volo'
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
  const queryClient = useQueryClient()
  const [email, setEmail] = useState(mockAuthEnabled ? mockCredentials.email : '')
  const [password, setPassword] = useState(mockAuthEnabled ? mockCredentials.password : '')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)

    setIsSubmitting(true)
    try {
      if (mockAuthEnabled) {
        await new Promise((resolve) => window.setTimeout(resolve, 300))
        if (!authenticateMock(email, password)) {
          setNotice('Email or password does not match the test account.')
          return
        }
        createMockSession()
      } else if (!otpSent) {
        await authApi.sendOtp(email.trim())
        setOtpSent(true)
        setNotice('We sent a six-digit sign-in code to your email.')
        return
      } else {
        await authApi.signIn(email.trim(), otp.trim())
      }
      queryClient.removeQueries({ queryKey: ['me'] })
      await navigate('/daily', { replace: true })
    } catch {
      setNotice(otpSent ? 'That code is invalid or expired.' : 'We could not send a code yet.')
    } finally {
      setIsSubmitting(false)
    }
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

          <form method="post" onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
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
                <label
                  htmlFor={mockAuthEnabled ? 'password' : 'otp'}
                  className="text-sm font-medium"
                >
                  {mockAuthEnabled ? 'Password' : 'Sign-in code'}
                </label>
              </div>
              {mockAuthEnabled ? (
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
              ) : (
                <Input
                  id="otp"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={otpSent ? '6-digit code' : 'Request a code first'}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={!otpSent || isSubmitting}
                  required={otpSent}
                />
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait…'
                : !mockAuthEnabled && !otpSent
                  ? 'Send code'
                  : 'Sign in'}
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
