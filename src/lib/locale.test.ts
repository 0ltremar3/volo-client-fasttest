import { afterEach, describe, expect, it, vi } from 'vitest'

import { currentAppLocale, i18n, setAppLocale } from '@/i18n'
import {
  localeFromLanguage,
  localeStorageKey,
  persistLocale,
  resolveLocale,
  toBcp47,
} from '@/lib/locale'

describe('resolveLocale', () => {
  it('prefers a stored app locale', () => {
    expect(resolveLocale('zh', 'en-US')).toBe('zh')
    expect(resolveLocale('en', 'zh-CN')).toBe('en')
  })

  it('falls back to browser language when storage is empty or invalid', () => {
    expect(resolveLocale(null, 'zh-CN')).toBe('zh')
    expect(resolveLocale('fr', 'zh-TW')).toBe('zh')
    expect(resolveLocale(undefined, 'en-GB')).toBe('en')
    expect(resolveLocale(null, undefined)).toBe('en')
  })

  it('treats any zh* browser language as Chinese', () => {
    expect(localeFromLanguage('zh')).toBe('zh')
    expect(localeFromLanguage('zh-CN')).toBe('zh')
    expect(localeFromLanguage('zh-TW')).toBe('zh')
    expect(localeFromLanguage('en-US')).toBe('en')
  })

  it('maps app locales to BCP-47 tags', () => {
    expect(toBcp47('en')).toBe('en')
    expect(toBcp47('zh')).toBe('zh-CN')
  })
})

describe('changeLanguage', () => {
  afterEach(async () => {
    await setAppLocale('en')
    vi.unstubAllGlobals()
  })

  it('persists the choice and switches translated chrome', async () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size
      },
    })

    await setAppLocale('zh')
    expect(currentAppLocale(i18n.language)).toBe('zh')
    expect(i18n.t('title', { ns: 'review' })).toBe('回顾')
    expect(store.get(localeStorageKey)).toBe('zh')
  })

  it('writes ui-locale through persistLocale', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size
      },
    })

    persistLocale('zh')
    expect(store.get(localeStorageKey)).toBe('zh')
    persistLocale('en')
    expect(store.get(localeStorageKey)).toBe('en')
  })
})
