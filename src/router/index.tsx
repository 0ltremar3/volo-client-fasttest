import { createBrowserRouter } from 'react-router-dom'

import { HomeRedirect, ProtectedAppShell } from '@/components/layout/route-boundaries'
import { ChatPage } from '@/pages/ChatPage'
import { DailyPage } from '@/pages/DailyPage'
import { DebugPage } from '@/pages/DebugPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomeRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedAppShell />,
    children: [
      { path: '/daily', element: <DailyPage /> },
      { path: '/chat', element: <ChatPage /> },
      { path: '/debug', element: <DebugPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
