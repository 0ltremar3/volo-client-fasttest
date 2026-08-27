# AI App Starter

A lightweight, mobile-first React SPA foundation for an AI chat-style application. It is designed
to sit in front of an existing backend and remain easy to extend with coding agents.

The repository currently contains the Phase 1 frontend shell and an interactive Coach flow based
on the product Figma. Mock email login and Coach data are available for local development; no
business REST API or AI streaming protocol has been connected.

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

| Route    | Purpose                        | Current state                         |
| -------- | ------------------------------ | ------------------------------------- |
| `/login` | Email and password sign-in     | Mock flow only                        |
| `/chat`  | Coach experience               | Interactive local state and mock data |
| `/debug` | Request and runtime inspection | Configuration skeleton                |

The Coach route opens on the Figma-aligned conversation state and includes the welcome, scheduling,
scheduled-session, conversation, Focus, Inspiration, Move, summary, and local history states. The
top bar is intentionally title-only; schedule, Coach, and history navigation live in the bottom bar.
Conversation replies and history are deterministic local mock data; they do not imply an AI
transport, persistence API, reminders, or calendar integration.

In mock mode, application routes redirect to `/login` until the test session is created. Real auth
guards will be implemented only after the backend authentication contract is known.

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

OpenAPI is the source of truth for ordinary REST endpoints. No schema is committed because the
backend contract has not been provided.

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

Streaming is intentionally not implemented. Before adding it, confirm the real transport and event
format with the backend, then isolate that protocol behind a small adapter. UI modules should depend
on stable chat state and actions rather than raw SSE, WebSocket, or framework-specific events.

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

The Coach visual rules, component anatomy, and responsive behavior are documented in
[`DESIGN.md`](./DESIGN.md). Update that design anchor before changing the Coach visual language.

Tokens cover color, typography, radius, shadow, motion, page spacing, content width, and touch size.
Feature modules consume semantic classes instead of palette values.

To add a theme:

1. Create `src/styles/themes/<name>.css` with a `[data-theme="<name>"]` selector.
2. Import it from `src/styles/globals.css`.
3. Add the name to `ThemeName` in `src/lib/theme.ts` and update the theme selector UI.
4. Verify `/login`, `/chat`, and `/debug` at 375px and desktop width.

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

## Pending backend decisions

- OpenAPI document location and supported REST operations
- Authentication method and session lifecycle
- Conversation history, Coach scheduling, Move, summary, and debug response contracts
- AI streaming transport, events, cancellation, errors, and metadata
