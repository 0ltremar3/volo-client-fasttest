import 'i18next'

import type account from './locales/en/account.json'
import type auth from './locales/en/auth.json'
import type coach from './locales/en/coach.json'
import type common from './locales/en/common.json'
import type daily from './locales/en/daily.json'
import type review from './locales/en/review.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      auth: typeof auth
      account: typeof account
      daily: typeof daily
      coach: typeof coach
      review: typeof review
    }
  }
}
