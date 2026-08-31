export type CoachScreen = 'welcome' | 'schedule' | 'home' | 'conversation'

export type MockCoachHomeState = {
  hasCurrentSession: boolean
  hasScheduledSession: boolean
}

const mockCoachHomeKey = 'volo.mock.coach.home'
const defaultMockCoachHome: MockCoachHomeState = {
  hasCurrentSession: true,
  hasScheduledSession: true,
}

export function parseMockCoachHomeState(value: string | null): MockCoachHomeState {
  if (!value) return defaultMockCoachHome
  try {
    const parsed = JSON.parse(value) as Partial<MockCoachHomeState>
    if (
      typeof parsed.hasCurrentSession === 'boolean' &&
      typeof parsed.hasScheduledSession === 'boolean'
    ) {
      return {
        hasCurrentSession: parsed.hasCurrentSession,
        hasScheduledSession: parsed.hasScheduledSession,
      }
    }
  } catch {
    // Invalid dev-only state falls back to the stable fixture.
  }
  return defaultMockCoachHome
}

export function readMockCoachHomeState() {
  if (typeof window === 'undefined') return defaultMockCoachHome
  return parseMockCoachHomeState(window.sessionStorage.getItem(mockCoachHomeKey))
}

export function writeMockCoachHomeState(value: MockCoachHomeState) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(mockCoachHomeKey, JSON.stringify(value))
}

export type CoachMessage = {
  id: string
  role: 'coach' | 'user'
  text: string
}

export type CoachSession = {
  id: string
  title: string
  date: string
  preview: string
  messages: CoachMessage[]
}

export type CoachSchedule = {
  topic: string
  date: string
  time: string
  alarm: boolean
}

export type MoveScheduleFrequency = 'daily' | 'weekly' | 'monthly'

type MoveScheduleRule =
  | { frequency: 'daily' }
  | { frequency: 'weekly'; weekdays: number[] }
  | { frequency: 'monthly'; day: number }

export function buildMoveScheduleRule(
  frequency: MoveScheduleFrequency,
  date = new Date(),
): MoveScheduleRule {
  if (frequency === 'weekly') {
    return { frequency, weekdays: [date.getDay() || 7] }
  }
  if (frequency === 'monthly') {
    return { frequency, day: Math.min(date.getDate(), 28) }
  }
  return { frequency }
}

export function resolveMoveScheduleDraft(suggestedSchedule?: {
  frequency: 'daily'
  local_time: string
}): { frequency: MoveScheduleFrequency; time: string } {
  return {
    frequency: suggestedSchedule?.frequency ?? 'daily',
    time: suggestedSchedule?.local_time ?? '21:00',
  }
}

export const defaultSchedule: CoachSchedule = {
  topic: 'Career Direction',
  date: '2026-08-27',
  time: '21:00',
  alarm: true,
}

export const mockSessions: CoachSession[] = [
  {
    id: 'career-direction',
    title: 'The cost of choosing',
    date: 'Today · 10:00 AM',
    preview: 'I want to understand what I am afraid to lose by choosing one direction.',
    messages: [
      {
        id: 'career-coach-1',
        role: 'coach',
        text: 'What feels most alive when you picture the next chapter of your work?',
      },
      {
        id: 'career-user-1',
        role: 'user',
        text: 'I keep comparing two paths and worrying that choosing one closes the other forever.',
      },
      {
        id: 'career-coach-2',
        role: 'coach',
        text: 'It sounds like the decision is carrying the weight of every future possibility. Which loss feels hardest to accept?',
      },
    ],
  },
  {
    id: 'leadership-energy',
    title: 'Leading without overextending',
    date: 'Yesterday · 5:44 PM',
    preview: 'A conversation about energy, boundaries, and the kind of leader I want to be.',
    messages: [
      {
        id: 'leadership-coach-1',
        role: 'coach',
        text: 'Where are you spending energy that your role no longer requires from you?',
      },
      {
        id: 'leadership-user-1',
        role: 'user',
        text: 'I still step into every detail because I am afraid the team will feel unsupported.',
      },
    ],
  },
  {
    id: 'quiet-progress',
    title: 'Making progress visible',
    date: 'Aug 24 · 9:00 PM',
    preview: 'Noticing the progress that gets hidden by a constantly moving finish line.',
    messages: [
      {
        id: 'progress-coach-1',
        role: 'coach',
        text: 'What has changed because of your effort, even if the work is not finished yet?',
      },
    ],
  },
]

export const openingMessages: CoachMessage[] = [
  {
    id: 'opening-1',
    role: 'coach',
    text: 'Good evening, Jiayu. What’s the next step toward your vision?',
  },
]

export const previewMessages: CoachMessage[] = [
  {
    id: 'preview-coach-1',
    role: 'coach',
    text: 'Good morning, Jiayu. What’s the next step toward your vision?',
  },
  {
    id: 'preview-user-1',
    role: 'user',
    text: 'A bit scattered. I planned several things but only finished one task.',
  },
  {
    id: 'preview-coach-2',
    role: 'coach',
    text: 'What seemed to take most of your attention today?',
  },
  {
    id: 'preview-user-2',
    role: 'user',
    text: 'I spent a lot of time responding to messages and switching between tasks. Staying focused on the core product instead of reacting to everything.',
  },
]

export const mockMoveProposal = {
  description: 'Drink a glass of water every day at 12:00.',
  suggested_schedule: { frequency: 'daily', local_time: '12:00' },
} as const

export const moveCopy: string = mockMoveProposal.description

export function formatScheduleDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function formatScheduleTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2026, 0, 1, hours, minutes))
}
