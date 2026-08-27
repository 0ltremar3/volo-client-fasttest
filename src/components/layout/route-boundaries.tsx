import { Navigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { hasMockSession, mockAuthEnabled } from '@/features/auth/mock-auth'

export function HomeRedirect() {
  const destination = mockAuthEnabled && hasMockSession() ? '/daily' : '/login'
  return <Navigate to={destination} replace />
}

export function ProtectedAppShell() {
  if (mockAuthEnabled && !hasMockSession()) {
    return <Navigate to="/login" replace />
  }

  return <AppShell />
}
