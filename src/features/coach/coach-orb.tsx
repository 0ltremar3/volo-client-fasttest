import coachNavMask from '@/assets/coach/coach-nav-mask.svg'
import coachNavOutline from '@/assets/coach/coach-nav-outline.svg'
import orbRing from '@/assets/coach/orb-ring.svg'
import { cn } from '@/lib/utils'

type CoachOrbProps = {
  className?: string
  speaking?: boolean
}

export function CoachOrb({ className, speaking = false }: CoachOrbProps) {
  return (
    <span
      className={cn('coach-orb relative block size-[120px]', className)}
      data-speaking={speaking || undefined}
      aria-hidden="true"
    >
      <span className="coach-orb__glow absolute inset-[24px_25px_12px] rounded-full" />
      <img className="absolute inset-[13px_22px] h-[94px] w-[76px]" src={orbRing} alt="" />
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
