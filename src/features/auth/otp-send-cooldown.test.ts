import { describe, expect, it } from 'vitest'

import {
  OTP_SEND_COOLDOWN_MS,
  createOtpSendGate,
  normalizeLoginEmail,
  remainingCooldownSeconds,
} from './otp-send-cooldown'

describe('otp send cooldown', () => {
  it('compares emails without case or surrounding space', () => {
    expect(normalizeLoginEmail('  Alex@Example.COM ')).toBe('alex@example.com')
  })

  it('counts remaining whole seconds until the cooldown expires', () => {
    expect(remainingCooldownSeconds(1_000 + OTP_SEND_COOLDOWN_MS, 1_000)).toBe(60)
    expect(remainingCooldownSeconds(1_000 + 1_250, 1_000)).toBe(2)
    expect(remainingCooldownSeconds(1_000, 1_000)).toBe(0)
    expect(remainingCooldownSeconds(undefined, 1_000)).toBe(0)
  })

  it('lets the first send through and blocks a second send for the same email', () => {
    const gate = createOtpSendGate()
    const now = 10_000

    expect(gate.tryBeginSend('Alex@Example.com', now)).toBe(true)
    expect(gate.tryBeginSend('alex@example.com', now)).toBe(false)

    gate.commitSend('Alex@Example.com', now)
    expect(gate.tryBeginSend('alex@example.com', now + 1_000)).toBe(false)
    expect(gate.wasSent('alex@example.com')).toBe(true)
    expect(gate.remainingSeconds('alex@example.com', now + 1_000)).toBe(59)
  })

  it('allows another address immediately and retries after a failed send', () => {
    const gate = createOtpSendGate()
    const now = 10_000

    expect(gate.tryBeginSend('first@example.com', now)).toBe(true)
    expect(gate.tryBeginSend('second@example.com', now)).toBe(true)

    gate.abortSend('first@example.com')
    expect(gate.tryBeginSend('first@example.com', now)).toBe(true)
    expect(gate.wasSent('first@example.com')).toBe(false)
  })
})
