# AI App Starter

A lightweight, mobile-first React SPA foundation for an AI chat-style application. It is designed
to sit in front of an existing backend and remain easy to extend with coding agents.

The repository contains the Volo frontend shell, local mock fixtures, and a connected Volo V2 mode.
With `VITE_MOCK_MODE=false`, email OTP auth uses the existing `/v1` account API while Coach, Daily,
Move checks, scheduling, and POST SSE streaming use `/v2`.

## Stack

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

Mock login stores only the canonical test email in `sessionStorage`. The password is never stored.
Set `VITE_MOCK_MODE=false` in production builds.

## Available routes

| Route    | Purpose                                 | Current state                  |
| -------- | --------------------------------------- | ------------------------------ |
| `/login` | Mock password or real email OTP sign-in | Mode-selected authentication   |
| `/daily` | Daily summary, moves, and traces        | Mock fixtures or Volo V2 data  |
| `/chat`  | Coach experience                        | Mock flow or persisted Volo V2 |
| `/debug` | Request and runtime inspection          | Configuration skeleton         |

After sign-in, `/` redirects to `/daily`. Daily includes the Figma-aligned week strip, a read-only
Daily Echo summary with insights, Period Moves, empty hardware traces, and shared Coach history.
Daily Echo is not a chat route and has no frontend start, message, generation, or complete action.
Its settings icon opens the reminder sheet; real mode saves one enabled switch and local time through
`PUT /v2/daily/echo/schedule`. A missing summary keeps the existing empty state.

The Coach route opens on the Figma-aligned conversation state and includes welcome, scheduling,
conversation, Move proposal, session-end proposal, and history states. In real mode it uses
`POST /v2/coach/sessions/:id/messages/stream`; assistant text streams from Mastra after the
transformational-coach Skill is activated. Sessions, messages, retry ids, and pending cards persist
in PostgreSQL. A Move is not written until its card is explicitly confirmed.

In mock mode, application routes redirect to `/login` until the local test session is created and
Coach replies remain fixtures. In real mode, login uses the backend email OTP endpoints, Better Auth
cookie credentials, and `/v1/me`; Coach and Daily then use Volo V2. Calendar sync, device
notifications, hardware traces, and frontend Daily summary generation remain out of scope.

## Commands

| Command                | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the Vite development server        |
| `npm run build`        | Type-check and create a production build |
| `npm run typecheck`    | Run strict TypeScript checks             |
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

Generated output is written to `src/api/generated/` and must not be edited manually. The command
intentionally fails with a clear message when `OPENAPI_SCHEMA` is missing.

Use generated TanStack Query hooks in feature modules. Shared request behavior belongs in
`src/api/client.ts`; page modules should not call `fetch` directly. Authentication headers,
credentials, and refresh behavior remain unset until the backend contract defines them.

## AI streaming

Coach POST SSE streaming is isolated in `src/api/sse.ts`. Feature modules receive parsed Volo events
and do not parse transport frames. Message retries reuse the same `client_temp_id`; Daily has no SSE
transport. A durable offline queue and background replay remain out of scope.

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

## Beautiful UI

Beautiful UI is used through its official copy-paste model, not as an npm package. The adapted
Prompt Bar source lives at `src/components/ai/beautiful-ui/prompt-bar.tsx`; application-specific
layout and transport messaging live in `src/components/ai/beautiful-prompt-composer.tsx`.

The Coach composer reuses the adapted Prompt Bar through the application adapter. Source
attribution and the MIT notice are preserved in `THIRD_PARTY_NOTICES.md`. Keep copied components
behind the local token system and remove demo-only capabilities that the backend cannot support.

## Project shape

```text
src/
├── api/          # shared request client and generated REST output
├── components/   # shadcn primitives, Beautiful UI source, and layout modules
├── features/     # feature-specific behavior such as mock auth
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
```

For UI changes, also verify both themes at 375px and desktop width, including keyboard navigation,
44px touch targets, safe areas, mobile keyboard behavior, and horizontal overflow.

## Pending product work

- Hardware trace ingestion and Daily summary generation jobs
- Device notifications and calendar sync
- Durable offline queue and background replay
