import { describe, expect, it } from 'vitest'

import type { SessionThread, VoloSession } from '@/api/volo'
import { overlayResumedCoachSession } from '@/features/coach/coach-session-query'

const completedSession: VoloSession = {
  id: 'session-1',
  kind: 'volo_coach',
  title: 'Hydration',
  topic: 'Hydration',
  status: 'completed',
  related_move_id: null,
  related_local_date: null,
  scheduled_at: null,
  schedule_timezone: 'Asia/Shanghai',
  schedule_state: null,
  activated_at: '2026-09-03T02:00:00.000Z',
  last_active_at: '2026-09-03T02:10:00.000Z',
  ended_at: '2026-09-03T02:10:00.000Z',
}

const cachedThread: SessionThread = {
  session: completedSession,
  messages: [
    {
      id: 'message-1',
      role: 'assistant',
      body: 'What feels worth looking at?',
      sequence: 1,
      client_temp_id: null,
      created_at: '2026-09-03T02:00:01.000Z',
    },
  ],
  cards: [],
}

describe('overlayResumedCoachSession', () => {
  it('keeps a freshly ended Coach thread from remaining read-only after Move rethink', () => {
    const resumed = overlayResumedCoachSession(cachedThread, {
      id: 'session-1',
      status: 'ongoing',
      related_move_id: 'move-1',
      related_local_date: '2026-09-03',
      ended_at: null,
    })

    expect(cachedThread.session.status === 'ongoing').toBe(false)
    expect(resumed?.session.status).toBe('ongoing')
    expect(resumed?.session.related_move_id).toBe('move-1')
    expect(resumed?.session.ended_at).toBeNull()
    expect(resumed?.messages).toEqual(cachedThread.messages)
  })

  it('does not replace a different cached session', () => {
    expect(
      overlayResumedCoachSession(cachedThread, {
        id: 'session-2',
        status: 'ongoing',
        related_move_id: 'move-1',
        related_local_date: '2026-09-03',
        ended_at: null,
      }),
    ).toBe(cachedThread)
  })
})
