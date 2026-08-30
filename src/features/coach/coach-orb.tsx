import coachNavMask from '@/assets/coach/coach-nav-mask.svg'
import coachNavOutline from '@/assets/coach/coach-nav-outline.svg'
import orbRing from '@/assets/coach/orb-ring.svg'
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
      <span
        className={cn(
          'coach-orb__glow absolute rounded-full',
          pause ? 'coach-orb__glow--pause inset-[18px_11px_4px]' : 'inset-[24px_25px_12px]',
        )}
      />
      <img
        className={cn('absolute h-[94px] w-[76px]', pause ? 'inset-0' : 'inset-[13px_22px]')}
        src={orbRing}
        alt=""
        width="76"
        height="94"
      />
    </span>
  )
}

export function CoachNavMark() {
  return (
    <span className="relative block size-[60px]" aria-hidden="true">
      <span
        className="absolute left-[11px] top-[6.5px] h-[46.917px] w-[38px]"
        style={{
          background: 'var(--coach-mark-gradient)',
          maskImage: `url(${coachNavOutline})`,
          maskPosition: 'center',
          maskRepeat: 'no-repeat',
          maskSize: '100% 100%',
          WebkitMaskImage: `url(${coachNavOutline})`,
          WebkitMaskPosition: 'center',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskSize: '100% 100%',
        }}
      />
      <img
        src={coachNavMask}
        alt=""
        width="38"
        height="47"
        className="absolute left-[11px] top-[6.5px] h-[46.917px] w-[38px] opacity-70"
      />
    </span>
  )
}
