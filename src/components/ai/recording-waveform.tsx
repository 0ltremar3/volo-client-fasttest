import { useSyncExternalStore } from 'react'
import { LiveWaveform } from '@/components/ui/live-waveform'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)')
function subscribeMotion(onChange: () => void) {
  const query = reducedMotion()
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export function RecordingWaveform({ stream }: { stream: MediaStream }) {
  const reduce = useSyncExternalStore(
    subscribeMotion,
    () => reducedMotion().matches,
    () => false,
  )
  return reduce ? (
    <div className="hold-waveform-rest">
      {Array.from({ length: 40 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  ) : (
    <LiveWaveform
      active
      stream={stream}
      mode="static"
      height="100%"
      barWidth={3}
      barGap={4}
      barRadius={2}
      barHeight={5}
      fadeEdges={false}
      sensitivity={1.6}
      className="hold-live-waveform"
    />
  )
}
