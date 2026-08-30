import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { dailyApi, type EchoMessage } from '@/api/volo'
import { BeautifulPromptComposer } from '@/components/ai/beautiful-prompt-composer'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { AppBottomNavigation } from '@/components/layout/app-bottom-navigation'
import { Button } from '@/components/ui/button'

export function DailyEchoConversation({ echoId }: { echoId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const thread = useQuery({
    queryKey: ['volo-daily-echo', echoId],
    queryFn: () => dailyApi.getEchoThread(echoId),
  })
  const [messages, setMessages] = useState<EchoMessage[] | null>(null)
  const [streamText, setStreamText] = useState('')
  const [failed, setFailed] = useState<{ body: string; clientTempId: string } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const displayMessages = useMemo(
    () => messages ?? thread.data?.messages ?? [],
    [messages, thread.data?.messages],
  )
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, streamText])

  const complete = useMutation({
    mutationFn: () => dailyApi.completeEcho(echoId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['volo-daily-echo', echoId] }),
        queryClient.invalidateQueries({ queryKey: ['volo-daily'] }),
        queryClient.invalidateQueries({ queryKey: ['volo-review'] }),
      ])
      void navigate(`/review/${echoId}`, { replace: true })
    },
  })

  async function send(body: string, retryId?: string) {
    const clientTempId = retryId ?? crypto.randomUUID()
    if (!retryId) {
      setMessages((current) => [
        ...(current ?? thread.data?.messages ?? []),
        {
          id: `local-${clientTempId}`,
          role: 'user',
          body,
          sequence: displayMessages.length + 1,
          created_at: new Date().toISOString(),
        },
      ])
    }
    setFailed(null)
    setStreamText('')
    try {
      await dailyApi.streamEcho(echoId, { body, clientTempId }, (event) => {
        if (event.event === 'assistant_delta') {
          setStreamText((current) => current + String((event.data as { text?: string }).text ?? ''))
        }
        if (event.event === 'assistant_message_done') {
          setMessages((current) => [
            ...(current ?? thread.data?.messages ?? []),
            event.data as EchoMessage,
          ])
          setStreamText('')
        }
        if (event.event === 'error' || event.event === 'assistant_failed') {
          throw new Error(String((event.data as { message?: string }).message ?? 'Echo failed'))
        }
      })
      await queryClient.invalidateQueries({ queryKey: ['volo-daily-echo', echoId] })
    } catch {
      setFailed({ body, clientTempId })
    } finally {
      setStreamText('')
    }
  }

  if (thread.isPending) return <div className="app-canvas h-dvh" />
  if (thread.isError || !thread.data) {
    return (
      <div className="app-canvas grid h-dvh place-items-center px-6 text-center">
        <div>
          <p>Daily Echo could not open.</p>
          <Button className="mt-4" onClick={() => void thread.refetch()}>
            <RefreshCw /> Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-canvas relative isolate flex h-dvh min-h-0 flex-col overflow-hidden text-[var(--coach-ink)]">
      <AppAtmosphere />
      <header className="safe-top relative z-10 grid min-h-16 shrink-0 grid-cols-[44px_1fr_72px] items-center px-3">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full"
          aria-label="Leave Daily Echo for now"
          onClick={() => void navigate(`/daily?date=${thread.data.echo_session.local_date}`)}
        >
          <X className="size-5" />
        </button>
        <p className="text-center text-base font-semibold">Daily Echo</p>
        <button
          type="button"
          className="min-h-11 rounded-full px-3 text-sm font-medium disabled:opacity-40"
          onClick={() => complete.mutate()}
          disabled={thread.data.echo_session.status !== 'in_progress' || complete.isPending}
        >
          {complete.isPending ? 'Finishing…' : 'Complete'}
        </button>
      </header>
      <main className="coach-scrollbar-none relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
        <div className="space-y-6" aria-live="polite">
          {displayMessages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end pl-12">
                <p className="max-w-[18.5rem] rounded-[22px] bg-[var(--coach-user-bubble)] px-4 py-3 text-base font-medium leading-5 text-[var(--coach-text-warm)]">
                  {message.body}
                </p>
              </div>
            ) : (
              <p
                key={message.id}
                className="whitespace-pre-wrap pr-3 text-base font-medium leading-6"
              >
                {message.body}
              </p>
            ),
          )}
          {streamText ? (
            <p className="whitespace-pre-wrap pr-3 text-base font-medium leading-6">{streamText}</p>
          ) : null}
          {failed ? (
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 text-sm text-[var(--coach-accent)]"
              onClick={() => void send(failed.body, failed.clientTempId)}
            >
              <RefreshCw className="size-4" /> Message failed. Retry
            </button>
          ) : null}
          {complete.isError ? (
            <p className="flex items-center gap-2 text-sm text-[var(--danger)]" role="alert">
              <Check className="size-4" /> Summary could not be completed. Try again.
            </p>
          ) : null}
          <div ref={endRef} />
        </div>
      </main>
      {thread.data.echo_session.status !== 'completed' ? (
        <BeautifulPromptComposer
          placeholder="What feels true about today?"
          showInspirations={false}
          onSend={(body) => void send(body)}
        />
      ) : null}
      <AppBottomNavigation />
    </div>
  )
}
