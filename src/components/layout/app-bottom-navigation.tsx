import { NavLink } from 'react-router-dom'

import dailyIcon from '@/assets/coach/coach-nav-schedule.svg'
import coachNavSurface from '@/assets/coach/coach-nav-surface.svg'
import dailyActiveIcon from '@/assets/navigation/daily-active.svg'
import reviewIcon from '@/assets/navigation/review.svg'
import { CoachNavMark } from '@/features/coach/coach-orb'

type AppBottomNavigationProps = {
  onCoach?: () => void
}

const navigationControl =
  'relative z-10 mx-auto grid min-h-touch min-w-touch place-items-center rounded-full text-[var(--coach-text-tertiary)] transition-[color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function AppBottomNavigation({ onCoach }: AppBottomNavigationProps) {
  return (
    <nav
      className="safe-bottom relative z-30 grid min-h-[93px] shrink-0 grid-cols-3 items-start px-11 pt-3"
      aria-label="Primary navigation"
    >
      <img
        src={coachNavSurface}
        alt=""
        width="430"
        height="133"
        className="pointer-events-none absolute -left-5 -top-[14px] h-[133px] w-[430px] max-w-none"
        style={{ filter: 'var(--coach-nav-surface-filter)' }}
        aria-hidden="true"
      />
      <NavLink to="/daily" aria-label="Open Daily" className={navigationControl}>
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
        aria-label="Open Coach"
        className="coach-pressable relative z-10 mx-auto -mt-3 grid size-16 place-items-center rounded-full transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CoachNavMark />
      </NavLink>

      <NavLink to="/review" aria-label="Open Review" className={navigationControl}>
        <img
          src={reviewIcon}
          alt=""
          width="32"
          height="32"
          className="size-8"
          style={{ filter: 'var(--app-nav-icon-filter)' }}
          aria-hidden="true"
        />
      </NavLink>
    </nav>
  )
}
