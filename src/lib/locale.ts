export type AppLocale = 'en' | 'zh'

export const localeStorageKey = 'ui-locale'

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'en' || value === 'zh'
}

export function toBcp47(locale: AppLocale): string {
  return locale === 'zh' ? 'zh-CN' : 'en'
}

export function localeFromLanguage(language: string | null | undefined): AppLocale {
  return language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function resolveLocale(
  stored: string | null | undefined,
  browserLanguage?: string | null,
): AppLocale {
  if (isAppLocale(stored)) return stored
  return localeFromLanguage(browserLanguage)
}

export function getLocale(): AppLocale {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.locale
    if (isAppLocale(current)) return current
  }
  return resolveStoredLocale()
}

export function persistLocale(locale: AppLocale) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(localeStorageKey, locale)
  }
  applyHtmlLang(locale)
}

export function applyHtmlLang(locale: AppLocale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = toBcp47(locale)
  document.documentElement.dataset.locale = locale
}

export function applyStoredLocale() {
  const locale = resolveStoredLocale()
  applyHtmlLang(locale)
  return locale
}

function resolveStoredLocale(): AppLocale {
  const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(localeStorageKey)
  const browserLanguage = typeof navigator === 'undefined' ? undefined : navigator.language
  return resolveLocale(stored, browserLanguage)
}
