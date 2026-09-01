import { useEffect, useRef, useState } from 'react'

export const OTP_SEND_COOLDOWN_MS = 60_000

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function remainingCooldownSeconds(
  cooldownUntilMs: number | undefined,
  nowMs: number,
): number {
  if (cooldownUntilMs == null) return 0
  return Math.max(0, Math.ceil((cooldownUntilMs - nowMs) / 1000))
}

export function createOtpSendGate(cooldownMs = OTP_SEND_COOLDOWN_MS) {
  const cooldownUntilByEmail: Record<string, number> = {}
  const inFlight = new Set<string>()

  function remainingSeconds(email: string, nowMs = Date.now()) {
    return remainingCooldownSeconds(cooldownUntilByEmail[normalizeLoginEmail(email)], nowMs)
  }

  function wasSent(email: string) {
    return Object.hasOwn(cooldownUntilByEmail, normalizeLoginEmail(email))
  }

  function tryBeginSend(email: string, nowMs = Date.now()) {
    const key = normalizeLoginEmail(email)
    if (!key) return false
    if (inFlight.has(key)) return false
    if (remainingCooldownSeconds(cooldownUntilByEmail[key], nowMs) > 0) return false
    inFlight.add(key)
    return true
  }

  function commitSend(email: string, nowMs = Date.now()) {
    const key = normalizeLoginEmail(email)
    cooldownUntilByEmail[key] = nowMs + cooldownMs
    inFlight.delete(key)
  }

  function abortSend(email: string) {
    inFlight.delete(normalizeLoginEmail(email))
  }

  return { remainingSeconds, wasSent, tryBeginSend, commitSend, abortSend }
}

export function useOtpSendCooldown() {
  const [cooldownUntilByEmail, setCooldownUntilByEmail] = useState<Record<string, number>>({})
  const [nowMs, setNowMs] = useState(() => Date.now())
  const cooldownUntilRef = useRef<Record<string, number>>({})
  const inFlightRef = useRef<Set<string>>(new Set())
  const hasActiveCooldown = Object.values(cooldownUntilByEmail).some((until) => until > nowMs)

  useEffect(() => {
    if (!hasActiveCooldown) return
    const id = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [hasActiveCooldown])

  function tryBeginSend(email: string) {
    const key = normalizeLoginEmail(email)
    const now = Date.now()
    if (!key) return false
    if (inFlightRef.current.has(key)) return false
    if (remainingCooldownSeconds(cooldownUntilRef.current[key], now) > 0) return false
    inFlightRef.current.add(key)
    return true
  }

  function markSent(email: string, sentAtMs = Date.now()) {
    const key = normalizeLoginEmail(email)
    if (!key) return
    cooldownUntilRef.current[key] = sentAtMs + OTP_SEND_COOLDOWN_MS
    inFlightRef.current.delete(key)
    setCooldownUntilByEmail({ ...cooldownUntilRef.current })
    setNowMs(sentAtMs)
  }

  function releaseSend(email: string) {
    inFlightRef.current.delete(normalizeLoginEmail(email))
  }

  function remainingSeconds(email: string) {
    return remainingCooldownSeconds(cooldownUntilByEmail[normalizeLoginEmail(email)], nowMs)
  }

  function wasSent(email: string) {
    return Object.hasOwn(cooldownUntilByEmail, normalizeLoginEmail(email))
  }

  return { tryBeginSend, markSent, releaseSend, remainingSeconds, wasSent }
}
