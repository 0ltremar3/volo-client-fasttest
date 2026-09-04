import { useState, type FormEvent, type MouseEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { AppMark } from '@/components/app-mark'
import { authApi } from '@/api/volo'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  authenticateMock,
  createMockSession,
  mockAuthEnabled,
  mockCredentials,
} from '@/features/auth/mock-auth'
import { normalizeLoginEmail, useOtpSendCooldown } from '@/features/auth/otp-send-cooldown'

type LoginNotice = 'codeSent' | 'invalidCredentials' | 'invalidCode' | 'sendFailed'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState(mockAuthEnabled ? mockCredentials.email : '')
  const [password, setPassword] = useState(mockAuthEnabled ? mockCredentials.password : '')
  const [otp, setOtp] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [notice, setNotice] = useState<LoginNotice | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { tryBeginSend, markSent, releaseSend, remainingSeconds, wasSent } = useOtpSendCooldown()

  const otpSent = wasSent(email)
  const cooldownRemaining = remainingSeconds(email)
  const canSendCode = cooldownRemaining === 0

  async function sendCode() {
    const sentEmail = email.trim()
    if (!tryBeginSend(sentEmail)) return
    try {
      await authApi.sendOtp(sentEmail)
      markSent(sentEmail)
      setOtp('')
      setNotice('codeSent')
    } catch (error) {
      releaseSend(sentEmail)
      throw error
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)

    setIsSubmitting(true)
    try {
      if (mockAuthEnabled) {
        await new Promise((resolve) => window.setTimeout(resolve, 300))
        if (!authenticateMock(email, password)) {
          setNotice('invalidCredentials')
          return
        }
        createMockSession(rememberMe)
      } else if (!otpSent) {
        await sendCode()
        return
      } else {
        await authApi.signIn(email.trim(), otp.trim(), rememberMe)
      }
      queryClient.removeQueries({ queryKey: ['me'] })
      await navigate('/daily', { replace: true })
    } catch {
      setNotice(otpSent ? 'invalidCode' : 'sendFailed')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (isSubmitting || !canSendCode) return
    setNotice(null)
    setIsSubmitting(true)
    try {
      await sendCode()
    } catch {
      setNotice('sendFailed')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleEmailChange(nextEmail: string) {
    if (normalizeLoginEmail(nextEmail) !== normalizeLoginEmail(email)) {
      setOtp('')
    }
    setEmail(nextEmail)
    setNotice(null)
  }

  const submitLabel = isSubmitting
    ? t('pleaseWait')
    : !mockAuthEnabled && !otpSent
      ? canSendCode
        ? t('sendCode')
        : t('sendCodeIn', { seconds: cooldownRemaining })
      : t('signIn')

  return (
    <main className="safe-top safe-bottom flex min-h-dvh bg-background px-page py-4">
      <div className="mx-auto flex w-full max-w-sm flex-col">
        <div className="flex justify-end gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <div className="my-auto py-12">
          <div className="mb-10 flex items-center gap-3">
            <AppMark />
            <span className="font-display text-sm font-semibold tracking-tight">VOLO</span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-[var(--font-size-title)] font-semibold leading-tight tracking-[var(--letter-spacing-title)]">
              {t('welcome')}
            </h1>
            <p className="mt-3 text-sm text-text-secondary">{t('subtitle')}</p>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
            {mockAuthEnabled ? (
              <div className="rounded-lg bg-surface-subtle px-4 py-3 text-xs leading-5 text-text-secondary">
                <p className="font-semibold text-foreground">{t('mockMode')}</p>
                <p>
                  {t('email')}: {mockCredentials.email}
                </p>
                <p>
                  {t('password')}: {mockCredentials.password}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t('email')}
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(event) => handleEmailChange(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex min-h-touch items-center justify-between gap-4">
                <label
                  htmlFor={mockAuthEnabled ? 'password' : 'otp'}
                  className="text-sm font-medium"
                >
                  {mockAuthEnabled ? t('password') : t('signInCode')}
                </label>
                {!mockAuthEnabled && otpSent ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 tabular-nums"
                    disabled={isSubmitting || !canSendCode}
                    onClick={(event) => void handleResend(event)}
                    aria-live="polite"
                  >
                    {canSendCode ? t('resendCode') : t('resendIn', { seconds: cooldownRemaining })}
                  </Button>
                ) : null}
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
                  placeholder={otpSent ? t('otpPlaceholder') : t('otpDisabledPlaceholder')}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={!otpSent || isSubmitting}
                  required={otpSent}
                />
              )}
            </div>

            <label className="flex min-h-touch cursor-pointer items-center gap-3 text-xs font-normal text-text-secondary">
              <span className="relative grid size-5 shrink-0 place-items-center">
                <input
                  type="checkbox"
                  className="peer size-5 appearance-none rounded-[5px] border border-input bg-surface shadow-none transition-[background-color,border-color,box-shadow] checked:border-primary checked:bg-primary focus-visible:border-primary focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50"
                  checked={rememberMe}
                  disabled={isSubmitting}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <Check
                  className="pointer-events-none absolute size-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </span>
              {t('rememberMe')}
            </label>

            <Button
              type="submit"
              className="w-full tabular-nums"
              disabled={isSubmitting || (!mockAuthEnabled && !otpSent && !canSendCode)}
            >
              {submitLabel}
            </Button>

            {notice ? (
              <p role="status" className="text-sm leading-6 text-warning">
                {t(notice)}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </main>
  )
}
