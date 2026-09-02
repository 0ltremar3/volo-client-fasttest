import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import dailyIcon from '@/assets/coach/coach-nav-schedule.svg?raw'
import coachNavSurface from '@/assets/coach/coach-nav-surface.svg'
import reviewIcon from '@/assets/navigation/review.svg?raw'
import { CoachNavMark } from '@/features/coach/coach-orb'
import { cn } from '@/lib/utils'

type AppBottomNavigationProps = {
  onCoach?: () => void
}

type PressPhase = 'idle' | 'pressed'

const sideTabLink =
  'relative z-10 mx-auto grid min-h-touch min-w-touch place-items-center rounded-full text-[var(--coach-text-tertiary)] transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent] touch-manipulation'

function NavGlyph({ svg }: { svg: string }) {
  return (
    <span
      className="block h-6 w-[26px] shrink-0 text-current [&_svg]:block [&_svg]:size-full"
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-hidden="true"
    />
  )
}

function SideTabLink({ to, label, svg }: { to: string; label: string; svg: string }) {
  return (
    <NavLink to={to} aria-label={label} className={sideTabLink}>
      {({ isActive }) => (
        <span
          className={cn(
            'grid h-10 w-[66px] place-items-center rounded-full transition-[background-color,color] duration-200 ease-out',
            isActive
              ? 'bg-[var(--coach-accent-muted)] text-[var(--coach-accent)]'
              : 'text-[var(--coach-text-tertiary)]',
          )}
        >
          <NavGlyph svg={svg} />
        </span>
      )}
    </NavLink>
  )
}

export function AppBottomNavigation({ onCoach }: AppBottomNavigationProps) {
  const { t } = useTranslation('common')
  const [press, setPress] = useState<PressPhase>('idle')

  return (
    <nav
      className="safe-bottom relative z-30 grid min-h-[calc(93px+env(safe-area-inset-bottom,0px))] shrink-0 grid-cols-3 items-center overflow-visible px-11"
      aria-label={t('nav.primary')}
    >
      <img
        src={coachNavSurface}
        alt=""
        width="430"
        height="133"
        className="pointer-events-none absolute -left-6 -top-3.5 h-[133px] w-[calc(100%+48px)] max-w-none min-[480px]:-left-5 min-[480px]:w-[430px]"
        style={{ filter: 'var(--coach-nav-surface-filter)' }}
        aria-hidden="true"
      />
      <SideTabLink to="/daily" label={t('nav.daily')} svg={dailyIcon} />

      <NavLink
        to="/chat"
        onClick={onCoach}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          setPress('pressed')
        }}
        onPointerUp={() => setPress('idle')}
        onPointerCancel={() => setPress('idle')}
        aria-label={t('nav.coach')}
        data-press={press === 'idle' ? undefined : press}
        className="coach-pressable coach-nav-link relative z-10 mx-auto mt-2 grid size-16 place-items-center self-start rounded-full touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent]"
      >
        <CoachNavMark />
      </NavLink>

      <SideTabLink to="/review" label={t('nav.review')} svg={reviewIcon} />
    </nav>
  )
}
