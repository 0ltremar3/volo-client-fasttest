import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import backIcon from '@/assets/account/back.svg'
import confirmIcon from '@/assets/account/confirm.svg'
import { authApi, type AccountMe, type AccountProfile } from '@/api/volo'
import { LanguageToggle } from '@/components/language-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mockAuthEnabled, mockCredentials } from '@/features/auth/mock-auth'

const mockAccount: AccountMe = {
  account: { email: mockCredentials.email },
  profile: {
    display_name: 'Demo',
    age_range: null,
    current_status: null,
    goal_clarity: null,
    onboarding_goal_text: null,
  },
}

export function AccountPage() {
  const account = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: !mockAuthEnabled,
  })
  const data = mockAuthEnabled ? mockAccount : account.data

  if (!data && account.isPending) return <AccountSkeleton />
  if (!data) return <AccountError onRetry={() => void account.refetch()} />

  return <AccountForm key={data.profile.display_name} account={data} />
}

function AccountForm({ account }: { account: AccountMe }) {
  const { t } = useTranslation('account')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const inputId = useId()
  const [name, setName] = useState(account.profile.display_name)
  const [savedName, setSavedName] = useState(account.profile.display_name)
  const normalizedName = name.trim()
  const changed = normalizedName !== savedName
  const initial = normalizedName.charAt(0).toLocaleUpperCase() || '?'
  const updateProfile = useMutation({
    mutationFn: () =>
      mockAuthEnabled
        ? Promise.resolve({ ...account.profile, display_name: normalizedName })
        : authApi.updateProfile(normalizedName),
    onSuccess: (profile: AccountProfile) => {
      setName(profile.display_name)
      setSavedName(profile.display_name)
      queryClient.setQueryData<AccountMe>(['me'], (current) =>
        current ? { ...current, profile } : current,
      )
    },
  })

  return (
    <form
      className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[var(--account-background)] text-[var(--coach-ink)]"
      onSubmit={(event) => {
        event.preventDefault()
        if (changed && !updateProfile.isPending) updateProfile.mutate()
      }}
    >
      <header className="safe-top grid h-[106px] shrink-0 grid-cols-[44px_1fr_44px] items-end px-[14px] pb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full p-1.5 hover:bg-black/5"
          onClick={() => void navigate(-1)}
          aria-label={t('back')}
        >
          <img src={backIcon} alt="" width="32" height="32" className="size-8 dark:invert" />
        </Button>
        <h1 className="flex h-11 items-center justify-center text-center text-base font-semibold">
          {t('title')}
        </h1>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="rounded-full p-[7px] hover:bg-transparent"
          disabled={!changed || updateProfile.isPending}
          aria-label={updateProfile.isPending ? t('savingName') : t('saveName')}
        >
          <img src={confirmIcon} alt="" width="30" height="30" className="size-[30px]" />
        </Button>
      </header>

      <main className="mx-auto flex w-[calc(100%-40px)] max-w-[350px] flex-1 flex-col">
        <div className="mt-[54px] flex h-[82px] items-start justify-center" aria-hidden="true">
          <div className="grid size-[72px] place-items-center rounded-full bg-[var(--account-avatar)] font-display text-[28px] font-semibold text-[var(--coach-on-dark)]">
            {initial}
          </div>
        </div>

        <section className="mt-[74px] overflow-hidden rounded-[20px] bg-[var(--account-surface)]">
          <div className="px-4 py-3.5">
            <label
              htmlFor={inputId}
              className="block cursor-text text-[11px] text-[var(--coach-text-secondary)]"
            >
              {t('nickname')}
            </label>
            <Input
              id={inputId}
              value={name}
              maxLength={120}
              onChange={(event) => {
                setName(event.target.value)
                if (updateProfile.isError) updateProfile.reset()
              }}
              aria-describedby={
                updateProfile.isError ? `${inputId}-hint ${inputId}-error` : `${inputId}-hint`
              }
              className="min-h-0 rounded-none border-0 bg-transparent px-0 py-1 text-[15px] font-medium shadow-none focus-visible:border-transparent focus-visible:shadow-none md:text-[15px]"
            />
            <p id={`${inputId}-hint`} className="text-[11px] text-[var(--coach-text-secondary)]">
              {t('tapToEdit')}
            </p>
            {updateProfile.isError ? (
              <p id={`${inputId}-error`} className="mt-1 text-xs text-danger" role="alert">
                {t('saveError')}
              </p>
            ) : null}
          </div>

          <div className="h-px bg-[var(--coach-border)]" />

          <div className="px-4 py-3.5">
            <p className="text-[11px] text-[var(--coach-text-secondary)]">{t('email')}</p>
            <p className="mt-1 break-words text-[15px] font-medium">{account.account.email}</p>
            <p className="mt-1 text-[11px] text-[var(--coach-text-secondary)]">{t('cantChange')}</p>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-[20px] bg-[var(--account-surface)] px-4 py-3.5">
          <p className="text-[11px] text-[var(--coach-text-secondary)]">
            {tCommon('language.label')}
          </p>
          <LanguageToggle variant="segmented" className="mt-3" />
        </section>

        {mockAuthEnabled ? (
          <p className="mt-3 text-center text-xs text-[var(--coach-text-secondary)]">
            {t('mockReset')}
          </p>
        ) : null}
      </main>
    </form>
  )
}

function AccountSkeleton() {
  const { t } = useTranslation('account')
  return (
    <div
      className="min-h-dvh bg-[var(--account-background)] px-5 pt-[calc(env(safe-area-inset-top)+62px)]"
      aria-label={t('loading')}
      role="status"
    >
      <div className="mx-auto h-5 w-24 animate-pulse rounded bg-[var(--coach-border)] motion-reduce:animate-none" />
      <div className="mx-auto mt-[78px] size-[72px] animate-pulse rounded-full bg-[var(--coach-border)] motion-reduce:animate-none" />
      <div className="mx-auto mt-[74px] h-[170px] max-w-[350px] animate-pulse rounded-[20px] bg-[var(--account-surface)] motion-reduce:animate-none" />
    </div>
  )
}

function AccountError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('account')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--account-background)] px-5 text-center">
      <div>
        <h1 className="text-base font-semibold">{t('openErrorTitle')}</h1>
        <p className="mt-2 text-sm text-[var(--coach-text-secondary)]">{t('openErrorBody')}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button type="button" variant="ghost" onClick={() => void navigate(-1)}>
            {tCommon('actions.back')}
          </Button>
          <Button type="button" onClick={onRetry}>
            {tCommon('actions.tryAgain')}
          </Button>
        </div>
      </div>
    </div>
  )
}
