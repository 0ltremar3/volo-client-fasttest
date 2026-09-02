import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import dailyIcon from '@/assets/coach/coach-nav-schedule.svg'
import coachNavSurface from '@/assets/coach/coach-nav-surface.svg'
import reviewIcon from '@/assets/navigation/review.svg'
import { CoachNavMark } from '@/features/coach/coach-orb'
import { cn } from '@/lib/utils'

type AppBottomNavigationProps = {
  onCoach?: () => void
}

type PressPhase = 'idle' | 'pressed' | 'release'

const tabLink =
  'relative z-10 mx-auto grid min-h-touch min-w-touch place-items-center rounded-full text-[var(--coach-text-tertiary)] transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent] touch-manipulation'

function NavGlyph({ src, className }: { src: string; className: string }) {
  return (
    <span
      className={cn('bg-current', className)}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        maskSize: 'contain',
      }}
      aria-hidden="true"
    />
  )
}

function SideTabLink({
  to,
  label,
  icon,
  glyphClassName,
}: {
  to: string
  label: string
  icon: string
  glyphClassName: string
}) {
  return (
    <NavLink to={to} aria-label={label} className={tabLink}>
      {({ isActive }) => (
        <span
          className={cn(
            'grid h-10 w-[66px] place-items-center rounded-full transition-[background-color,color] duration-200 ease-out',
            isActive
              ? 'bg-[var(--coach-accent-muted)] text-[var(--coach-accent)]'
              : 'text-[var(--coach-text-tertiary)]',
          )}
        >
          <NavGlyph src={icon} className={glyphClassName} />
        </span>
      )}
    </NavLink>
  )
}

export function AppBottomNavigation({ onCoach }: AppBottomNavigationProps) {
  const { t } = useTranslation('common')
  const [press, setPress] = useState<PressPhase>('idle')
  const releaseTimer = useRef(0)

  useEffect(
    () => () => {
      window.clearTimeout(releaseTimer.current)
    },
    [],
  )

  const endPress = () => {
    setPress((current) => (current === 'pressed' ? 'release' : current))
    window.clearTimeout(releaseTimer.current)
    releaseTimer.current = window.setTimeout(() => setPress('idle'), 360)
  }

  return (
    <nav
      className="safe-bottom relative z-30 grid min-h-[93px] shrink-0 grid-cols-3 items-start overflow-visible px-11 pt-3"
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
      <SideTabLink
        to="/daily"
        label={t('nav.daily')}
        icon={dailyIcon}
        glyphClassName="h-[25px] w-[27px]"
      />

      <NavLink
        to="/chat"
        onClick={onCoach}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          window.clearTimeout(releaseTimer.current)
          setPress('pressed')
        }}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        aria-label={t('nav.coach')}
        data-press={press === 'idle' ? undefined : press}
        className="coach-pressable coach-nav-link relative z-10 mx-auto -mt-3 grid size-16 place-items-center rounded-full touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent]"
      >
        {({ isActive }) => <CoachNavMark active={isActive} />}
      </NavLink>

      <SideTabLink
        to="/review"
        label={t('nav.review')}
        icon={reviewIcon}
        glyphClassName="h-6 w-[26px]"
      />
    </nav>
  )
}
