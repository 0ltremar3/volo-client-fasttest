const storageKey = 'volo-access-token'

let memoryToken: string | null = null

function readStoredToken() {
  try {
    return globalThis.sessionStorage?.getItem(storageKey) ?? null
  } catch {
    return null
  }
}

export function getAccessToken() {
  return memoryToken ?? readStoredToken()
}

export function setAccessToken(token: string | null) {
  memoryToken = token ? normalizeAccessToken(token) : null
  try {
    if (memoryToken) globalThis.sessionStorage?.setItem(storageKey, memoryToken)
    else globalThis.sessionStorage?.removeItem(storageKey)
  } catch {
    // sessionStorage is unavailable in tests and some private-browsing modes.
  }
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
