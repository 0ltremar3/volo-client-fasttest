import { describe, expect, it, vi } from 'vitest'

import { resolveScheduledSessionDestination, singleFlight } from './schedule-routing'

describe('scheduled Coach routing', () => {
  const scheduledAt = '2026-08-30T12:00:00.000Z'

  it('previews before the absolute scheduled instant', () => {
    expect(
      resolveScheduledSessionDestination(scheduledAt, Date.parse('2026-08-30T11:59:59.999Z')),
    ).toBe('preview')
  })

  it('starts exactly on time and after the appointment has passed', () => {
    expect(resolveScheduledSessionDestination(scheduledAt, Date.parse(scheduledAt))).toBe('start')
    expect(
      resolveScheduledSessionDestination(scheduledAt, Date.parse('2026-08-31T12:00:00.000Z')),
    ).toBe('start')
  })

  it('coalesces concurrent starts and permits retry after an API failure', async () => {
    const action = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('started')
    const start = singleFlight(action)
    const first = start()
    const concurrent = start()
    expect(first).toBe(concurrent)
    await expect(first).rejects.toThrow('network')
    await expect(start()).resolves.toBe('started')
    expect(action).toHaveBeenCalledTimes(2)
  })
})
