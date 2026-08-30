import type { ReviewDetail, ReviewItem } from '@/api/volo'
import { mockSessions, moveCopy, previewMessages } from '@/features/coach/coach-model'
import { defaultDailyDate, getDailyRecord } from '@/features/daily/daily-model'

const todayValue = () => new Date().toLocaleDateString('en-CA')

function mockDate(label: string) {
  const today = new Date(`${todayValue()}T12:00:00`)
  if (label.startsWith('Today')) return todayValue()
  if (label.startsWith('Yesterday')) {
    today.setDate(today.getDate() - 1)
    return today.toLocaleDateString('en-CA')
  }
  const match = /([A-Z][a-z]{2}) (\d{1,2})/.exec(label)
  if (!match) return todayValue()
  const parsed = new Date(`${match[1]} ${match[2]}, ${today.getFullYear()} 12:00:00`)
  return parsed.toLocaleDateString('en-CA')
}

export function mockReviewItems(): ReviewItem[] {
  const coachItems: ReviewItem[] = mockSessions.map((session, index) => {
    const date = mockDate(session.date)
    return {
      id: session.id,
      type: 'coach',
      title: session.title,
      summary: session.preview,
      completed_at: `${date}T${String(10 + index).padStart(2, '0')}:30:00.000Z`,
      date,
      move_count: index === 0 ? 1 : 0,
      related_move_id: null,
    }
  })
  const record = getDailyRecord(defaultDailyDate)
  const echoItems: ReviewItem[] = record.echo
    ? [
        {
          id: `mock-echo-${defaultDailyDate}`,
          type: 'echo',
          title: 'Daily Echo',
          summary: record.echo.lead,
          completed_at: `${defaultDailyDate}T14:15:00.000Z`,
          date: defaultDailyDate,
          move_count: null,
          related_move_id: null,
        },
      ]
    : []
  const moveItems: ReviewItem[] = record.moves.slice(0, 1).map((move) => ({
    id: `mock-move-${move.id}`,
    type: 'move',
    title: move.source.replace(/^From\s+/, ''),
    summary: move.text,
    completed_at: `${defaultDailyDate}T21:00:00.000Z`,
    date: defaultDailyDate,
    move_count: 1,
    related_move_id: move.id,
  }))
  return [...coachItems, ...echoItems, ...moveItems]
}

export function mockReviewDetail(id: string): ReviewDetail | null {
  const coach = mockSessions.find((session) => session.id === id)
  if (coach) {
    return {
      id,
      type: 'coach',
      title: coach.title,
      completed_at: new Date().toISOString(),
      pause: { topic_to_explore: coach.title, takeaway: coach.preview },
      summary: null,
      takeaways: null,
      related_move_id: null,
      moves:
        coach.id === mockSessions[0]?.id
          ? [
              {
                id: 'mock-confirmed-move',
                description: moveCopy,
                revision: 1,
                source_session_id: coach.id,
                schedule: null,
              },
            ]
          : [],
      messages: coach.messages.map((message, index) => ({
        id: message.id,
        role: message.role === 'coach' ? 'assistant' : 'user',
        body: message.text,
        sequence: index + 1,
        created_at: new Date().toISOString(),
      })),
    }
  }
  const item = mockReviewItems().find((candidate) => candidate.id === id)
  if (!item) return null
  const record = getDailyRecord(defaultDailyDate)
  return {
    id,
    type: item.type,
    title: item.title,
    completed_at: item.completed_at,
    pause: item.type === 'move' ? { topic_to_explore: item.title, takeaway: item.summary } : null,
    summary: item.type === 'echo' ? item.summary : null,
    takeaways: item.type === 'echo' ? (record.echo ? [record.echo.takeaway] : null) : null,
    related_move_id: item.related_move_id,
    moves: [],
    messages: previewMessages.map((message, index) => ({
      id: message.id,
      role: message.role === 'coach' ? 'assistant' : 'user',
      body: message.text,
      sequence: index + 1,
      created_at: new Date().toISOString(),
    })),
  }
}
