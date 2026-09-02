import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import dailyIcon from '@/assets/coach/coach-nav-schedule.svg'
import coachNavSurface from '@/assets/coach/coach-nav-surface.svg'
import dailyActiveIcon from '@/assets/navigation/daily-active.svg'
import reviewActiveIcon from '@/assets/navigation/review-active.svg'
import reviewIcon from '@/assets/navigation/review.svg'
import { CoachNavMark } from '@/features/coach/coach-orb'

type AppBottomNavigationProps = {
  onCoach?: () => void
}

const navigationControl =
  'relative z-10 mx-auto grid min-h-touch min-w-touch place-items-center rounded-full text-[var(--coach-text-tertiary)] transition-[color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function AppBottomNavigation({ onCoach }: AppBottomNavigationProps) {
  const { t } = useTranslation('common')
  return (
    <nav
      className="safe-bottom relative z-30 grid min-h-[93px] shrink-0 grid-cols-3 items-start px-11 pt-3"
      aria-label={t('nav.primary')}
    >
      <img
        src={coachNavSurface}
        alt=""
        width="430"
        height="133"
        className="pointer-events-none absolute -left-6 -top-[14px] h-[133px] w-[calc(100%+48px)] max-w-none min-[480px]:-left-5 min-[480px]:w-[430px]"
        style={{ filter: 'var(--coach-nav-surface-filter)' }}
        aria-hidden="true"
      />
      <NavLink to="/daily" aria-label={t('nav.daily')} className={navigationControl}>
        {({ isActive }) => (
          <img
            src={isActive ? dailyActiveIcon : dailyIcon}
            alt=""
            width="27"
            height="25"
            className="h-[25px] w-[27px]"
            style={{ filter: 'var(--app-nav-icon-filter)' }}
            aria-hidden="true"
          />
        )}
      </NavLink>

      <NavLink
        to="/chat"
        onClick={onCoach}
        aria-label={t('nav.coach')}
        className="coach-pressable relative z-10 mx-auto -mt-3 grid size-16 place-items-center rounded-full transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CoachNavMark />
      </NavLink>

      <NavLink to="/review" aria-label={t('nav.review')} className={navigationControl}>
        {({ isActive }) => (
          <img
            src={isActive ? reviewActiveIcon : reviewIcon}
            alt=""
            width="32"
            height="32"
            className="size-8"
            style={{ filter: 'var(--app-nav-icon-filter)' }}
            aria-hidden="true"
          />
        )}
      </NavLink>
    </nav>
  )
}
