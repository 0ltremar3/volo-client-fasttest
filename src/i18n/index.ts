import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import accountEn from './locales/en/account.json'
import authEn from './locales/en/auth.json'
import coachEn from './locales/en/coach.json'
import commonEn from './locales/en/common.json'
import dailyEn from './locales/en/daily.json'
import reviewEn from './locales/en/review.json'
import accountZh from './locales/zh/account.json'
import authZh from './locales/zh/auth.json'
import coachZh from './locales/zh/coach.json'
import commonZh from './locales/zh/common.json'
import dailyZh from './locales/zh/daily.json'
import reviewZh from './locales/zh/review.json'
import { applyStoredLocale, isAppLocale, persistLocale, type AppLocale } from '@/lib/locale'

export const defaultNS = 'common'
export const namespaces = ['common', 'auth', 'account', 'daily', 'coach', 'review'] as const

export const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    account: accountEn,
    daily: dailyEn,
    coach: coachEn,
    review: reviewEn,
  },
  zh: {
    common: commonZh,
    auth: authZh,
    account: accountZh,
    daily: dailyZh,
    coach: coachZh,
    review: reviewZh,
  },
} as const

const initialLocale = applyStoredLocale()

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: 'en',
  defaultNS,
  ns: [...namespaces],
  interpolation: { escapeValue: false },
  returnNull: false,
})

i18n.on('languageChanged', (language) => {
  if (isAppLocale(language)) persistLocale(language)
})

export function currentAppLocale(language = i18n.language): AppLocale {
  return isAppLocale(language) ? language : language.startsWith('zh') ? 'zh' : 'en'
}

export async function setAppLocale(locale: AppLocale) {
  persistLocale(locale)
  await i18n.changeLanguage(locale)
}

export { i18n }
export default i18n
