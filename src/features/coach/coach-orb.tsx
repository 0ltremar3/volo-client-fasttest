import coachNavMark from '@/assets/coach/coach-nav-mark.png'
import logo from '@/assets/logo2.png'
import { cn } from '@/lib/utils'

type CoachOrbProps = {
  className?: string
  speaking?: boolean
  size?: 'default' | 'pause'
}

export function CoachOrb({ className, speaking = false, size = 'default' }: CoachOrbProps) {
  const pause = size === 'pause'
  return (
    <span
      className={cn(
        'coach-orb relative block',
        pause ? 'h-[94px] w-[76px]' : 'size-[120px]',
        className,
      )}
      data-speaking={speaking || undefined}
      aria-hidden="true"
    >
      <img
        className="absolute inset-0 size-full object-contain"
        src={logo}
        alt=""
        width="120"
        height="120"
      />
    </span>
  )
}

export function CoachNavMark() {
  return (
    <span className="coach-nav-mark relative block size-[60px]" aria-hidden="true">
      <img
        className="coach-nav-mark__logo absolute left-[11px] top-[6.5px] h-[47px] w-[38px] object-contain"
        src={coachNavMark}
        alt=""
        width="38"
        height="47"
      />
    </span>
  )
}
