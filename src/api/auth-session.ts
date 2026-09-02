const storageKey = 'volo-access-token'

let memoryToken: string | null = null

type StorageName = 'localStorage' | 'sessionStorage'

function readStorage(name: StorageName) {
  try {
    return globalThis[name]?.getItem(storageKey) ?? null
  } catch {
    return null
  }
}

function readStoredToken() {
  return readStorage('localStorage') ?? readStorage('sessionStorage')
}

function writeStorage(name: StorageName, token: string | null) {
  try {
    if (token) globalThis[name]?.setItem(storageKey, token)
    else globalThis[name]?.removeItem(storageKey)
  } catch {
    // Web Storage is unavailable in tests and some private-browsing modes.
  }
}

export function getAccessToken() {
  return memoryToken ?? readStoredToken()
}

export function setAccessToken(token: string | null, rememberMe = false) {
  memoryToken = token ? normalizeAccessToken(token) : null
  writeStorage('localStorage', rememberMe ? memoryToken : null)
  writeStorage('sessionStorage', rememberMe ? null : memoryToken)
}

export function clearAccessToken() {
  setAccessToken(null)
}

export function hasAccessToken() {
  return Boolean(getAccessToken())
}

function normalizeAccessToken(token: string) {
  return token
    .trim()
    .replace(/^Authorization:\s*/iu, '')
    .replace(/^(?:Bearer\s+)+/iu, '')
    .trim()
}
