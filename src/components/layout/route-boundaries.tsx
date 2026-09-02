import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'

import { hasAccessToken } from '@/api/auth-session'
import { authApi } from '@/api/volo'
import { AppShell } from '@/components/layout/app-shell'
import { hasMockSession, mockAuthEnabled } from '@/features/auth/mock-auth'

export function HomeRedirect() {
  if (mockAuthEnabled) {
    return <Navigate to={hasMockSession() ? '/daily' : '/login'} replace />
  }
  return <Navigate to={hasAccessToken() ? '/daily' : '/login'} replace />
}

export function ProtectedAppShell() {
  if (mockAuthEnabled && !hasMockSession()) {
    return <Navigate to="/login" replace />
  }

  if (!mockAuthEnabled) {
    if (!hasAccessToken()) return <Navigate to="/login" replace />
    return <RealSessionBoundary />
  }

  return <AppShell />
}

function RealSessionBoundary() {
  const { t } = useTranslation('common')
  const session = useQuery({ queryKey: ['me'], queryFn: authApi.me, retry: false })
  if (session.isPending) {
    return (
      <div className="app-canvas grid min-h-dvh place-items-center text-sm text-text-secondary">
        {t('session.opening')}
      </div>
    )
  }
  if (session.isError) return <Navigate to="/login" replace />
  return <AppShell />
}
