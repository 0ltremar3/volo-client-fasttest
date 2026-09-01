import { CoachPromptBar } from '@/components/ai/beautiful-ui/prompt-bar'

export function BeautifulPromptComposer({
  placeholder = 'Write a message…',
  showInspirations = false,
  disabled = false,
  inputRef,
  onSend,
  onVoice,
}: {
  placeholder?: string
  showInspirations?: boolean
  disabled?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  onSend: (text: string) => void
  onVoice?: () => void
}) {
  return (
    <div className="sticky bottom-0 z-20 mt-auto bg-[var(--coach-composer-fade)] px-5 pb-3 pt-4">
      <CoachPromptBar
        placeholder={placeholder}
        showInspirations={showInspirations}
        disabled={disabled}
        inputRef={inputRef}
        onSend={onSend}
        onVoice={onVoice}
      />
    </div>
  )
}
