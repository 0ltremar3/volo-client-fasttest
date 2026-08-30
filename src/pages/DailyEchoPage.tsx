import { useParams } from 'react-router-dom'

import { DailyEchoConversation } from '@/features/daily/daily-echo-conversation'

export function DailyEchoPage() {
  const { echoId = '' } = useParams()
  return <DailyEchoConversation echoId={echoId} />
}
