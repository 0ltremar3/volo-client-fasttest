import { createBrowserRouter } from 'react-router-dom'

import { HomeRedirect, ProtectedAppShell } from '@/components/layout/route-boundaries'
import { ChatPage } from '@/pages/ChatPage'
import { DailyPage } from '@/pages/DailyPage'
import { DebugPage } from '@/pages/DebugPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { DailyEchoPage } from '@/pages/DailyEchoPage'
import { ReviewDetailPage } from '@/pages/ReviewDetailPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { ScheduledCoachPage } from '@/pages/ScheduledCoachPage'

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
      { path: '/daily/echo/:echoId', element: <DailyEchoPage /> },
      { path: '/chat', element: <ChatPage /> },
      { path: '/chat/scheduled/:sessionId', element: <ScheduledCoachPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '/review/:sessionId', element: <ReviewDetailPage /> },
      { path: '/debug', element: <DebugPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
