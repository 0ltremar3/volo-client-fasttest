export const mockAuthEnabled = import.meta.env.VITE_MOCK_MODE === 'true'

export const mockCredentials = {
  email: 'demo@example.com',
  password: 'demo1234',
} as const

const sessionKey = 'mock-auth-session'

export function hasMockSession() {
  return (
    localStorage.getItem(sessionKey) === mockCredentials.email ||
    sessionStorage.getItem(sessionKey) === mockCredentials.email
  )
}

export function createMockSession(rememberMe = false) {
  localStorage.removeItem(sessionKey)
  sessionStorage.removeItem(sessionKey)
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(sessionKey, mockCredentials.email)
}

export function authenticateMock(email: string, password: string) {
  return (
    email.trim().toLowerCase() === mockCredentials.email && password === mockCredentials.password
  )
}
