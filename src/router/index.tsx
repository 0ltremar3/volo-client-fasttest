import { createBrowserRouter } from 'react-router-dom'

import { HomeRedirect, ProtectedAppShell } from '@/components/layout/route-boundaries'
import { ChatPage } from '@/pages/ChatPage'
import { ConversationsPage } from '@/pages/ConversationsPage'
import { DebugPage } from '@/pages/DebugPage'
import { InsightsPage } from '@/pages/InsightsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ReviewPage } from '@/pages/ReviewPage'

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
      { path: '/chat', element: <ChatPage /> },
      { path: '/conversations', element: <ConversationsPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '/insights', element: <InsightsPage /> },
      { path: '/debug', element: <DebugPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
