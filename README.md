# AI App Starter

A lightweight, mobile-first React SPA foundation for an AI chat-style application. It is designed
to sit in front of an existing backend and remain easy to extend with coding agents.

The repository contains the Volo frontend shell, local mock fixtures, and a connected Volo V2 mode.
With `VITE_MOCK_MODE=false`, email OTP auth uses the existing `/v1` account API while Coach, Daily,
Move checks, scheduling, and POST SSE streaming use `/v2`.

## Stack

Voice dictation captures 16 kHz mono PCM locally and, after stop/flush, uploads one
complete WAV to authenticated `POST /v2/voice/transcriptions?language=auto&provider=groq`.
The backend uses Groq `whisper-large-v3`; configure `GROQ_API_KEY` on the backend
only. No LiveKit Agent or SenseVoice worker is needed for dictation. The existing
recording UI and final-message submission behavior are preserved. Up to five
minutes of PCM are buffered; cancellation discards the buffer and aborts an
in-flight upload. End-to-final includes the complete upload and recognition,
so long recordings do not carry a sub-second latency guarantee. The backend
must support this provider parameter before deploying this frontend.

- React, Vite, and strict TypeScript
- Tailwind CSS and shadcn/ui
- React Router
- TanStack Query
- Orval for OpenAPI-generated types and query hooks
- Selected official Beautiful UI copy-paste components

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://127.0.0.1:5173/>. To use the development login, set this in `.env.local`:

```env
VITE_MOCK_MODE=true
```

Mock credentials:

```text
Email:    demo@example.com
Password: demo1234
```

Mock login stores only the canonical test email in Web Storage. `Remember me` uses `localStorage`;
otherwise the session remains in `sessionStorage`. The password is never stored. Set
`VITE_MOCK_MODE=false` in production builds.

## Available routes

| Route                        | Purpose                                   | Current state                  |
| ---------------------------- | ----------------------------------------- | ------------------------------ |
| `/login`                     | Mock password or real email OTP sign-in   | Mode-selected authentication   |
| `/daily`                     | Date navigator and Period Moves           | Echo card and traces hidden    |
| `/account`                   | Account details and display-name editing  | Mock preview or `/v1/me` data  |
| `/daily/echo/:echoId`        | Resumable Daily Echo conversation         | Persisted Volo V2 Echo         |
| `/chat`                      | Coach experience                          | Mock flow or persisted Volo V2 |
| `/chat/scheduled/:sessionId` | Scheduled-session preview and early start | Persisted Volo V2 Coach        |
| `/review`                    | Calendar and completed history            | Mock fixtures or Volo V2 data  |
| `/review/:sessionId`         | Read-only Coach/Echo/Move detail          | Mock fixtures or Volo V2 data  |
| `/debug`                     | Request and runtime inspection            | Configuration skeleton         |

After sign-in, `/` redirects to `/daily`. Daily includes a continuous date navigator (center-snapping
day strip plus month grid) and collapsible active Period Moves. The Daily Echo card and traces
section are temporarily hidden: without hardware, traces stay empty; Daily Summary uses only the
Echo conversation; Echo does not create Move cards or topics; the same-day session can pause and
resume; and the scheduled local time is a reminder, not an entry gate. Move cards come from
`GET /v2/moves` and open an accessible check-in sheet for On Track, Drifting, or a Coach rethink. The
sheet’s edit control opens a nested Schedule sheet for Date, Time, Repeat, and Alarm. Check state is the two-state Move evaluation for the operation day; Coach adjustment is
separate and reopens the Move's original session through the idempotent adjustment endpoint. Destructive deletion
uses a separate confirmation dialog and the empty state links back to Coach. The Echo conversation
route and `/v2/daily/echo/*` lifecycle remain in place for the next Echo slice. Completing an Echo
still persists the generated summary for Review from the same backend record.

The Coach route opens on the Figma-aligned conversation state. With no appointment, home is a New
Session gate: Find a Time is primary and Start Now is secondary, without the tab bar. With
appointments, home keeps the stack plus a Next Session orb; the date/arrow opens the scheduled
preview, and a plus FAB returns to the New Session gate. Scheduling, conversation, Move proposal, and
editable Pause states remain. An open conversation does not repeat the appointment stack. The
conversation header's `Done` action prepares the full-height Pause sheet; `Into Your Day` confirms its
editable topic and takeaway, completes the session, and returns to Daily, while `Keep talking` rejects
only the pending Pause. If the user has not sent a message, `Done` cancels the empty session and returns
directly to Daily without creating a Pause or Review history item. In real mode it uses
`POST /v2/coach/sessions/:id/messages/stream`; assistant text streams from Mastra after the
transformational-coach Skill is activated. Sessions, messages, retry ids, and pending cards persist
in PostgreSQL. A Move proposal includes an editable check plan in the conversation card: Repeat
(`No repeat`, `Daily`, `Weekly`, `Monthly`) and local time. When the backend supplies an explicit
daily local-time suggestion, the pending card prefills it (for example, `Daily · 12:00`); otherwise it
starts at `No repeat` and the current minute, matching the backend default. Nothing is persisted
before `Add Move`. The card owns only Repeat and Time — start date, weekday/day-of-month derivation,
and Alarm stay with the Daily Schedule sheet. Confirming sends the chosen plan as
`final_payload.schedule`, so the Move and its single active Schedule are written in one backend
transaction. Confirming a Pause uses the user's final topic and takeaway; Continue leaves the session
ongoing.
Confirmed Move cards remain in the conversation at their original assistant-message position with
a read-only Added or Adjusted state; rejected and expired cards stay hidden.

The orange Coach waveform switches to hold-to-talk input within the original single-row
composer: inspiration on the left, hold control in the center, and the keyboard switch on the
right. Hold to record, release to
finish and send the final text, or slide up before release to cancel without sending a chat message.
Audio is buffered locally during recording. The keyboard button restores the preserved text draft.
Release flushes the AudioWorklet tail, wraps all mono 16 kHz PCM16 in one WAV, and uploads it to
`/v2/voice/transcriptions?language=auto&provider=groq` using existing Bearer authentication.
Only the returned transcript is sent to Coach. Cancellation discards buffered audio and aborts
an in-flight request, but cannot undo audio already uploaded to the provider.
There is no WebSocket transcription, provider fallback, or LiveKit room from this composer.
Cancellation, unmount and backgrounding release the microphone and abort the request.
Recording is limited to 295 seconds; final waiting to 65 seconds. Requires AudioWorklet and
a 16 kHz AudioContext (HTTPS or localhost); unsupported browsers show the existing error.
The backend must support the Groq provider and have its API key configured. The independent microphone
entry is commented out. Space/Enter supports keyboard hold, and Escape cancels.
While held, the original composer becomes an orange recording button with centered, mirrored
rounded bars from Ondo UI `LiveWaveform` in static mode, driven by the shared microphone stream.
The instruction sits close above the button over a short, full-viewport-width theme-aware fade;
slide-up cancellation turns the button red. Keyboard focus uses a label underline or icon color,
without rectangular focus outlines on voice controls.
The keyboard glyph is 26px with a 44px touch target and no filled focus background. Empty
recognition silently returns to idle. Reduced motion uses steady bars. After release, recognition
shows only a circular spinner in a pending user bubble; the composer has no recognition loader.

When Coach opens an adjusted Move, the original conversation history remains in place and the
header keeps the ordinary `Done` action. A `move_revision` card confirms revised wording and keeps
the existing Schedule unless the user opens `Change schedule`; that editor is seeded from the target
Move's current plan and only sends `final_payload.schedule` after an actual change, so an untouched
card never overwrites a Schedule the user already set. Confirming returns to the originating Daily
date. Rejecting it keeps the same conversation ongoing so the Daily card can resume it later.

Review replaces the former History dialogs. `/review?date=YYYY-MM-DD` owns calendar state, marks
activity dates, and groups completed Coach and Echo sessions. Move adjustments reuse their source
Coach session rather than creating a separate Review entry. Detail pages show the
confirmed Pause or Echo summary, confirmed Moves, and full read-only messages. Continue creates a
new Free Coach session without reopening the completed source. Each real Review item exposes a
separate delete action with confirmation; success removes it from the selected day and month activity.

In mock mode, application routes redirect to `/login` until the local test session is created and
Coach replies remain fixtures. In real mode, login uses the backend email OTP endpoints and sends
the returned session token as `Authorization: Bearer <token>` on `/v1/me` and Volo V2 requests.
Without `Remember me`, the token stays in `sessionStorage`; with it, the token stays in
`localStorage` across browser restarts until the backend session expires or returns `401`.
Calendar sync, device notifications, hardware traces, and frontend Daily summary generation remain
out of scope. Account details support updating the display name; avatar upload is not available yet.

## Commands

| Command                | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the Vite development server        |
| `npm run build`        | Type-check and create a production build |
| `npm run typecheck`    | Run strict TypeScript checks             |
| `npm run test`         | Run focused Vitest tests                 |
| `npm run lint`         | Run ESLint with zero warnings allowed    |
| `npm run format`       | Format supported files with Prettier     |
| `npm run format:check` | Verify formatting without changing files |
| `npm run generate:api` | Generate the REST client from OpenAPI    |

## Environment variables

| Variable            | Used by   | Description                                         |
| ------------------- | --------- | --------------------------------------------------- |
| `VITE_API_BASE_URL` | Browser   | Public API origin; empty means same-origin requests |
| `VITE_MOCK_MODE`    | Browser   | Enables the development-only mock login when `true` |
| `OPENAPI_SCHEMA`    | Orval CLI | Backend-owned OpenAPI file path or URL              |

Only variables prefixed with `VITE_` are bundled into browser code. They must never contain secrets.

## OpenAPI and REST APIs

The backend-generated OpenAPI document is the source of truth for ordinary REST endpoints. The
handwritten Volo client mirrors that contract while POST SSE framing remains isolated separately.

Generate the client with a real schema:

```bash
OPENAPI_SCHEMA=/absolute/path/to/openapi.yaml npm run generate:api
```

Generated output is written to `src/api/generated/`, is committed with the application, and must not
be edited manually. Generation is limited to backend operations tagged `Volo *`, avoiding unrelated
catch-all auth routes. The command intentionally fails with a clear message when `OPENAPI_SCHEMA` is missing.

Use generated TanStack Query hooks in feature modules. Shared request behavior belongs in
`src/api/client.ts`; page modules should not call `fetch` directly. Real-mode requests send
`Authorization: Bearer <token>` from `POST /v1/auth/sign-in/email-otp`.

## AI streaming

Coach and Daily Echo POST SSE streaming are isolated in `src/api/sse.ts`. Feature modules receive
parsed Volo events and do not parse transport frames. The Coach adapter validates event payloads,
Content-Type, `assistant_message_done`, and `done`, converts server error events into coded errors,
and accepts an `AbortSignal`. Its reducer upserts messages and cards, anchors cards by `message_id`,
and reuses the same `client_temp_id` for retries. A durable offline queue and background replay
remain out of scope.

## Themes

The active theme is selected on the root element:

```html
<html data-theme="default"></html>
```

Theme files:

```text
src/styles/tokens.css
src/styles/themes/default.css
src/styles/themes/dark.css
src/styles/globals.css
```

The Volo visual rules, shared component anatomy, and Daily/Coach responsive behavior are documented
in [`DESIGN.md`](./DESIGN.md). The linked Figma nodes and that document are the visual sources of
truth; update the anchor when changing the product visual language.

Tokens cover color, typography, radius, shadow, motion, page spacing, content width, and touch size.
Feature modules consume semantic classes instead of palette values.

To add a theme:

1. Create `src/styles/themes/<name>.css` with a `[data-theme="<name>"]` selector.
2. Import it from `src/styles/globals.css`.
3. Add the name to `ThemeName` in `src/lib/theme.ts` and update the theme selector UI.
4. Verify `/login`, `/daily`, `/chat`, and `/debug` at 375px and desktop width.

## Language

The chrome UI is bilingual (`en` | `zh`). Preference is stored in `localStorage` under `ui-locale`
and applied as `html lang` (`en` / `zh-CN`) plus `data-locale`. Resolution order: stored
`ui-locale` → `navigator.language` starting with `zh` → `en`.

Switch language on `/login` next to the theme control, or on `/account` with the Language segmented
control. Signed-out users can change language on the login page. Coach and Echo AI replies, user
input, and backend Move / Pause / Echo bodies stay in their original language and do not follow the
UI locale.

## Beautiful UI

Beautiful UI is used through its official copy-paste model, not as an npm package. The adapted
Prompt Bar source lives at `src/components/ai/beautiful-ui/prompt-bar.tsx`; application-specific
layout and transport messaging live in `src/components/ai/beautiful-prompt-composer.tsx`.

The Coach composer reuses the adapted Prompt Bar through the application adapter. Source
attribution and the MIT notice are preserved in `THIRD_PARTY_NOTICES.md`. Keep copied components
behind the local token system and remove demo-only capabilities that the backend cannot support.
Its empty state shows the designed orange waveform affordance and its non-empty state switches to
the orange send action. In connected Volo V2 Coach sessions, the waveform opens hold-to-talk input using final-only recognition.
Coach replies use the controlled `StreamingText` primitive with real SSE text, reduced-motion-safe
cursor feedback, stable completion accessibility, and copy/retry actions only after streaming stops.
Before the first delta it shows a compact Reflecting pixel wave; each real delta renders immediately
with a brief tail fade rather than a simulated typing timer.

## Project shape

```text
src/
├── api/          # shared request client and generated REST output
├── components/   # shadcn primitives, Beautiful UI source, and layout modules
├── features/     # feature-specific behavior such as mock auth
├── i18n/         # i18next init and English/Chinese UI copy
├── pages/        # route-level UI
├── router/       # route configuration
├── styles/       # global tokens and themes
├── App.tsx
└── main.tsx
```

Add folders only when real code needs them. Server state belongs in TanStack Query, local UI state
stays local, and URL state belongs in React Router.

## Verification

Before handing off meaningful changes:

```bash
npm run format:check
npm run typecheck
npm run lint
npm run build
npm run test
```

For UI changes, also verify both themes at 375px and desktop width, including keyboard navigation,
44px touch targets, safe areas, mobile keyboard behavior, and horizontal overflow.

## Pending product work

- Hardware trace ingestion
- Device notifications and calendar sync
- Durable offline queue and background replay
