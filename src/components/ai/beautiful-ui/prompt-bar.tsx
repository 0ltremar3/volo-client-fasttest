/**
 * Beautiful UI Prompt Bar
 * Source: https://github.com/slev12397/beautiful-ui/blob/main/components/primitives/PromptBar.tsx
 * License: MIT, Copyright (c) 2026 Shane Levine
 *
 * Copied into the project and adapted for business-neutral data, unavailable
 * capability states, strict TypeScript, and the local semantic token system.
 */

'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/* ─────────────────────────────────────────────────────────
 * PROMPT BAR
 * A composer with @ data sources, / commands, a model picker, and send.
 * Type @ or / to open the menus; ↑↓ + Enter to pick.
 * Variants: Rounded (card radius) · Pill (full radius).
 * ───────────────────────────────────────────────────────── */

function Icon({
  children,
  size = 15,
  strokeWidth = 1.8,
}: {
  children: React.ReactNode
  size?: number
  strokeWidth?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const GLYPHS: Record<string, React.ReactNode> = {
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  layers: (
    <g>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </g>
  ),
}

type Source = {
  key: string
  name: string
  desc: string
  glyph: string
}

const SOURCES: Source[] = [
  { key: 'workspace', name: 'Workspace data', desc: 'Mock context', glyph: 'chart' },
  { key: 'records', name: 'Saved records', desc: 'Mock context', glyph: 'layers' },
]

const COMMANDS = [
  { key: 'compare', name: '/compare', desc: 'Compare selected context' },
  { key: 'plan', name: '/plan', desc: 'Draft an action plan' },
  { key: 'review', name: '/review', desc: 'Review recent activity' },
  { key: 'draft', name: '/draft', desc: 'Draft a response' },
  { key: 'summarize', name: '/summarize', desc: 'Digest the thread so far' },
]

const MODELS = [
  { key: 'standard', name: 'Standard', tag: 'Mock' },
  { key: 'fast', name: 'Fast', tag: 'Mock' },
  { key: 'focused', name: 'Focused', tag: 'Mock' },
]

/* the last @word or /word being typed, if any */
function parseToken(draft: string): { kind: 'at' | 'slash'; query: string; start: number } | null {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft)
  if (!match) return null
  return {
    kind: match[2] === '@' ? 'at' : 'slash',
    query: (match[3] ?? '').toLowerCase(),
    start: match.index + (match[1]?.length ?? 0),
  }
}

export default function PromptBar({
  variant = 'Rounded',
  tall = false,
  placeholder,
  onSend,
}: {
  variant?: string
  /** hero sizing: a multi-line input with controls on their own row */
  tall?: boolean
  placeholder?: string
  onSend?: (text: string) => void
}) {
  const pill = variant === 'Pill'
  const [draft, setDraft] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [model, setModel] = useState(MODELS[0]!)
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const wide = expanded || tall
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null)
  const [engaged, setEngaged] = useState(false)
  const [modelBox, setModelBox] = useState<{ top: number; height: number } | null>(null)
  const [modelHovered, setModelHovered] = useState<number | null>(null)
  const [modelMenuLeft, setModelMenuLeft] = useState(0)
  const [modelMenuBottom, setModelMenuBottom] = useState(0)
  const composerAnchorRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const modelRef = useRef<HTMLButtonElement>(null)
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
  const modelRowRefs = useRef<(HTMLButtonElement | null)[]>([])

  const token = dismissed ? null : parseToken(draft)
  const menu: 'at' | 'slash' | null = plusOpen ? 'at' : (token?.kind ?? null)
  const query = plusOpen ? '' : (token?.query ?? '')

  const rows: { key: string; name: string; desc: string }[] =
    menu === 'at'
      ? SOURCES.filter((s) => s.name.toLowerCase().includes(query))
      : menu === 'slash'
        ? COMMANDS.filter((c) => c.name.slice(1).startsWith(query))
        : []

  /* a single highlight glides to the active row instead of each row
   * toggling its own background — matches the gliding pill in the nav */
  useLayoutEffect(() => {
    const target = rowRefs.current[active]
    if (target) setRowBox({ top: target.offsetTop, height: target.offsetHeight })
  }, [menu, query, active, rows.length])

  /* same gliding highlight in the model menu — floats to the hovered
   * row, falling back to the currently-selected model */
  const modelIndex = MODELS.findIndex((m) => m.key === model.key)
  useEffect(() => {
    if (modelOpen) modelRowRefs.current[modelIndex]?.focus()
  }, [modelIndex, modelOpen])

  useLayoutEffect(() => {
    if (!modelOpen) return
    const target = modelRowRefs.current[modelHovered ?? modelIndex]
    if (target) setModelBox({ top: target.offsetTop, height: target.offsetHeight })
  }, [modelOpen, modelHovered, modelIndex])

  /* The menu is outside the clipped composer, so align it to the model
   * trigger by measurement instead of pinning it to the far-right edge. */
  useLayoutEffect(() => {
    if (!modelOpen || !composerAnchorRef.current || !modelRef.current) return
    const anchorRect = composerAnchorRef.current.getBoundingClientRect()
    const triggerRect = modelRef.current.getBoundingClientRect()
    setModelMenuLeft(
      Math.max(0, Math.min(triggerRect.left - anchorRect.left, anchorRect.width - 176)),
    )
    setModelMenuBottom(anchorRect.bottom - triggerRect.top + 8)
  }, [modelOpen, wide, model.name])

  const selectModel = (next: (typeof MODELS)[number]) => {
    setModel(next)
    setModelOpen(false)
    setModelHovered(null)
  }

  /* Move wrapped text above the controls, then grow to a compact maximum. */
  useLayoutEffect(() => {
    const input = inputRef.current
    const controls = controlsRef.current
    const measure = measureRef.current
    const modelButton = modelRef.current
    if (!input || !controls || !measure || !modelButton) return

    const squareControl = controls.querySelector<HTMLButtonElement>(
      'button[aria-label="Add context sources"]',
    )
    const fixedControlsWidth = (squareControl?.offsetWidth ?? 44) * 3 + modelButton.offsetWidth
    const inlineGaps = 4 * 4
    const inlineInputWidth = controls.clientWidth - fixedControlsWidth - inlineGaps
    const needsFullWidth = draft.includes('\n') || measure.offsetWidth + 8 > inlineInputWidth
    if (needsFullWidth !== expanded) {
      setExpanded(needsFullWidth)
    }

    const minHeight = 28
    const maxHeight = 100
    input.style.height = '0px'
    const contentHeight = input.scrollHeight
    input.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`
    input.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden'
  }, [draft, expanded])

  /* clicking anywhere outside the composer closes the open menus */
  useEffect(() => {
    if (!modelOpen && !plusOpen) return
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest('[data-promptbar]')) {
        setModelOpen(false)
        setPlusOpen(false)
        setModelHovered(null)
      }
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [modelOpen, plusOpen])

  const closeMenus = () => {
    setPlusOpen(false)
    setModelOpen(false)
    setModelHovered(null)
  }

  const pick = (row: { key: string; name: string }) => {
    const prefix = token ? draft.slice(0, token.start) : draft
    setDraft(menu === 'at' ? `${prefix}@${row.name} ` : `${prefix}${row.name} `)
    setPlusOpen(false)
    setDismissed(false)
    inputRef.current?.focus()
  }

  const canSend = draft.trim().length > 0
  const send = () => {
    if (!canSend) return
    onSend?.(draft.trim())
    setDraft('')
    closeMenus()
  }

  return (
    <div data-promptbar className="w-full">
      {/* composer is the anchor — menus grow up from its top edge */}
      <div ref={composerAnchorRef} className="relative">
        {/* ── @ / slash menu ─────────────────────────────── */}
        {menu && (
          <div
            id="prompt-context-menu"
            role="listbox"
            aria-label={menu === 'at' ? 'Context sources' : 'Prompt commands'}
            onMouseLeave={() => setEngaged(false)}
            className="absolute inset-x-0 bottom-full z-10 mb-2 rounded-card bg-surface p-1 shadow-raised"
            style={{
              animation: 'pop-in 180ms cubic-bezier(0.23,1,0.32,1) both',
              transformOrigin: 'bottom center',
            }}
          >
            {/* single gliding highlight — appears once a row is hovered */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 rounded-chip bg-hover"
              style={{
                top: rowBox?.top ?? 0,
                height: rowBox?.height ?? 0,
                opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
                transition:
                  'top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease',
              }}
            />
            {rows.map((row, i) => {
              const source = menu === 'at' ? SOURCES.find((s) => s.key === row.key) : undefined
              return (
                <button
                  key={row.key}
                  id={`prompt-option-${row.key}`}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  ref={(el) => {
                    rowRefs.current[i] = el
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => {
                    setActive(i)
                    setEngaged(true)
                  }}
                  onClick={() => pick(row)}
                  className="relative z-10 flex min-h-[var(--bui-control-size)] w-full items-center gap-2.5 rounded-chip px-2 text-left"
                >
                  {source && (
                    <span className="flex size-5.5 shrink-0 items-center justify-center text-ink-2">
                      <Icon size={15}>{GLYPHS[source.glyph]}</Icon>
                    </span>
                  )}
                  <span className="shrink-0 text-[12.5px] font-medium text-ink">{row.name}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">{row.desc}</span>
                </button>
              )
            })}
            {rows.length === 0 && (
              <div className="flex h-9 items-center px-2 text-[12px] text-ink-3">
                No matches for “{query}”
              </div>
            )}
            <div className="mt-1 border-t border-line px-2 pt-1.5 pb-1 text-[11px] text-ink-3">
              {menu === 'at' ? 'Type to add mock context' : 'Type to search commands'}
            </div>
          </div>
        )}

        {/* ── model menu ─────────────────────────────────── */}
        {modelOpen && (
          <div
            id="prompt-model-menu"
            role="listbox"
            aria-label="Models"
            onMouseLeave={() => setModelHovered(null)}
            className="absolute z-10 w-44 rounded-card bg-surface p-1 shadow-raised"
            style={{
              left: modelMenuLeft,
              bottom: modelMenuBottom,
              animation: 'pop-in 180ms cubic-bezier(0.23,1,0.32,1) both',
              transformOrigin: 'bottom left',
            }}
          >
            {/* single gliding highlight — floats to the hovered / selected row */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 rounded-chip bg-hover"
              style={{
                top: modelBox?.top ?? 0,
                height: modelBox?.height ?? 0,
                opacity: modelBox && modelHovered !== null ? 1 : 0,
                transition:
                  'top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease',
              }}
            />
            {MODELS.map((m, i) => (
              <button
                key={m.key}
                id={`prompt-model-${m.key}`}
                type="button"
                role="option"
                aria-selected={m.key === model.key}
                ref={(el) => {
                  modelRowRefs.current[i] = el
                }}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setModelHovered(i)}
                onFocus={() => setModelHovered(i)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setModelOpen(false)
                    modelRef.current?.focus()
                    return
                  }
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    const offset = event.key === 'ArrowDown' ? 1 : MODELS.length - 1
                    modelRowRefs.current[(i + offset) % MODELS.length]?.focus()
                  }
                }}
                onClick={() => {
                  selectModel(m)
                  inputRef.current?.focus()
                }}
                className="relative z-10 flex min-h-[var(--bui-control-size)] w-full items-center gap-2 rounded-chip px-2 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
                  {m.name}
                </span>
                <span className="shrink-0 text-[11px] text-ink-3">{m.tag}</span>
                <span className={`shrink-0 text-ink ${m.key === model.key ? '' : 'invisible'}`}>
                  <Icon size={13} strokeWidth={2.5}>
                    <path d="M20 6L9 17l-5-5" />
                  </Icon>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── composer ───────────────────────────────────── */}
        <div
          className={`relative isolate flex flex-col overflow-hidden border border-line bg-surface shadow-card transition-[border-color,border-radius] duration-150 focus-within:border-line-strong ${
            tall ? 'gap-2.5 p-3.5' : 'gap-1.5 p-1.5'
          } ${pill && !wide ? 'rounded-full' : 'rounded-window'}`}
        >
          <span
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none absolute invisible whitespace-pre text-[13px] leading-[18px]"
          >
            {draft}
          </span>

          <div
            ref={controlsRef}
            className={`grid items-end gap-x-1 gap-y-1.5 ${
              wide
                ? 'grid-cols-[var(--bui-control-size)_auto_minmax(0,1fr)_var(--bui-control-size)_var(--bui-control-size)]'
                : 'grid-cols-[var(--bui-control-size)_minmax(0,1fr)_auto_var(--bui-control-size)_var(--bui-control-size)]'
            }`}
          >
            <button
              type="button"
              aria-label="Add context sources"
              aria-expanded={plusOpen}
              onClick={() => {
                setModelOpen(false)
                setPlusOpen((current) => !current)
                setActive(0)
                setEngaged(false)
                inputRef.current?.focus()
              }}
              className={`flex size-[var(--bui-control-size)] shrink-0 items-center justify-center justify-self-start text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-[0.94] ${
                pill ? 'rounded-full' : 'rounded-control'
              } ${plusOpen ? 'bg-hover text-ink' : ''} ${wide ? 'col-start-1 row-start-2' : 'col-start-1 row-start-1'}`}
            >
              <Icon size={16} strokeWidth={2}>
                <path d="M12 5v14M5 12h14" />
              </Icon>
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                setDismissed(false)
                setPlusOpen(false)
                setActive(0)
                setEngaged(false)
              }}
              onKeyDown={(event) => {
                if (menu && rows.length > 0) {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    setEngaged(true)
                    setActive(
                      (current) =>
                        (current + (event.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length,
                    )
                    return
                  }
                  if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
                    event.preventDefault()
                    const selectedRow = rows[active]
                    if (selectedRow) pick(selectedRow)
                    return
                  }
                }
                if (event.key === 'Escape') {
                  setDismissed(true)
                  closeMenus()
                  return
                }
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  send()
                }
              }}
              placeholder={placeholder ?? 'Write a message…'}
              aria-label="Prompt"
              aria-expanded={Boolean(menu)}
              aria-controls={menu ? 'prompt-context-menu' : undefined}
              aria-activedescendant={
                menu && rows[active] ? `prompt-option-${rows[active].key}` : undefined
              }
              className={`${tall ? 'min-h-[68px] px-2 py-2 text-[14px] leading-5' : 'min-h-7 px-1 py-[5px] text-[13px] leading-[18px]'} min-w-0 w-full resize-none bg-transparent text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3 ${
                wide ? 'col-span-full col-start-1 row-start-1' : 'col-start-2 row-start-1'
              }`}
            />

            {/* model picker */}
            <button
              ref={modelRef}
              type="button"
              aria-expanded={modelOpen}
              aria-label="Choose model"
              aria-haspopup="listbox"
              aria-controls={modelOpen ? 'prompt-model-menu' : undefined}
              onClick={() => {
                setPlusOpen(false)
                setModelOpen((current) => !current)
                setModelHovered(null)
              }}
              className={`flex h-[var(--bui-control-size)] shrink-0 items-center gap-1 px-1.5 text-[12px] font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink ${
                pill ? 'rounded-full' : 'rounded-control'
              } ${wide ? 'col-start-2 row-start-2 justify-self-start' : 'col-start-3 row-start-1'}`}
            >
              {model.name}
              <span className="text-ink-3">
                <Icon size={11} strokeWidth={2.4}>
                  <path d="M6 9l6 6 6-6" />
                </Icon>
              </span>
            </button>

            {/* Dictation remains visible but unavailable until a real capability exists. */}
            <button
              type="button"
              aria-label="Dictation unavailable"
              title="Voice input is not connected"
              disabled
              className={`flex size-[var(--bui-control-size)] shrink-0 items-center justify-center text-ink-3 opacity-45 ${
                pill ? 'rounded-full' : 'rounded-control'
              } ${wide ? 'col-start-4 row-start-2' : 'col-start-4 row-start-1'}`}
            >
              <Icon size={15} strokeWidth={2}>
                <g>
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
                </g>
              </Icon>
            </button>

            {/* send — tactile square (round in the pill variant) */}
            <button
              type="button"
              aria-label="Send"
              disabled={!canSend}
              onClick={send}
              className={`flex size-[var(--bui-control-size)] shrink-0 items-center justify-center transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.94] ${
                pill ? 'rounded-full' : 'rounded-control'
              } ${wide ? 'col-start-5 row-start-2' : 'col-start-5 row-start-1'}`}
              style={{
                background: canSend ? 'var(--ink)' : 'var(--line-strong)',
                color: canSend ? 'var(--surface)' : 'var(--ink-2)',
              }}
            >
              <Icon size={16} strokeWidth={2.4}>
                <path d="M12 19V5M5 12l7-7 7 7" />
              </Icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
