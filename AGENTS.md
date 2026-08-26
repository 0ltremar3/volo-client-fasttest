# Project Rules

## Scope

- Build a frontend-only React SPA that consumes an existing backend.
- Treat this repository as Phase 1: the shell, theme system, routes, Query provider, Orval setup,
  mock email login, and UI states exist; business APIs and AI streaming do not.
- Keep names and shared UI domain-neutral so later features can reuse them.

## Sources of truth

- **REST work:** inspect the backend-owned OpenAPI document before changing requests, responses,
  auth, or generated hooks. Generate into `src/api/generated`; treat that directory as read-only.
- **Streaming work:** inspect the real transport and event protocol before creating the streaming
  adapter. Preserve a small UI-facing interface and keep wire-format knowledge inside the adapter.
- **Project usage:** read `README.md` when changing setup, environment variables, routes, themes,
  API generation, or documented capabilities; update it in the same change when behavior differs.
- **Copied UI:** preserve attribution in `THIRD_PARTY_NOTICES.md` and the source header when
  modifying Beautiful UI code.

## Data and state

- Put standard server state in TanStack Query and consume it through generated hooks.
- Route handwritten HTTP through `src/api/client.ts`; page modules do not call `fetch` directly.
- Keep local interaction state in the nearest module with `useState` or `useReducer`.
- Keep navigation state in React Router. Add global client state only after a concrete cross-route
  requirement exists.
- Implement authentication exactly as the backend specifies. Never infer cookie, bearer-token,
  refresh-token, or storage behavior.
- Mock mode is development-only. Label mock capabilities clearly, persist no password, and never
  let mock behavior silently run in production.

## UI system

- Use shadcn/ui for base controls. Extend an existing control before creating a competing Button,
  Input, Dialog, or navigation pattern.
- Use official Beautiful UI copy-paste components selectively under `src/components/ai/beautiful-ui`.
  Keep product integration in a small adapter outside that folder.
- Normalize copied components to semantic tokens from `src/styles`; keep feature and page modules
  free of palette colors and arbitrary visual constants.
- Make theme-wide changes in `tokens.css` or `styles/themes/*.css`. A theme change must propagate
  without page-specific edits.
- Use motion for state and feedback only. Every animation must remain usable under
  `prefers-reduced-motion`.

## Mobile and accessibility

- Design from 375px upward. Keep primary controls at least 44×44 CSS pixels on touch devices.
- Preserve safe-area padding, dynamic viewport units, keyboard-safe composer placement, readable
  wrapping, and zero horizontal overflow.
- Use semantic landmarks and heading order. Every interactive control needs an accessible name,
  visible keyboard focus, and a complete disabled/loading/error state where applicable.
- Keep dropdowns and prompt menus keyboard-operable; expose expanded state and controlled content
  with appropriate ARIA.
- Desktop layouts expand the mobile structure and keep primary content at `--content-width`.

## Architecture and dependencies

- Prefer deep modules with small interfaces. Add a seam only when behavior truly varies; avoid
  pass-through service, repository, DAO, or use-case layers.
- Modify existing modules before adding near-duplicates. Delete dead code, unused variants, and
  obsolete dependencies as part of the same change.
- Add the smallest dependency that satisfies an active requirement. Avoid package additions for
  hypothetical features.
- Keep TypeScript strict and generated code separate from handwritten code.
- Never expose secrets through `VITE_*`, source files, logs, or browser storage.

## Change workflow

1. Inspect relevant code, configuration, and contracts with `rg`; identify the existing seam before
   editing. Done when every affected caller and documented capability is accounted for.
2. Implement the smallest complete change, including empty, loading, error, keyboard, and narrow
   viewport states that the feature actually needs. Done when no unsupported capability is implied.
3. For UI changes, verify 375px and a desktop width, check horizontal overflow, touch targets,
   keyboard focus, and both themes. Done when the same modules work without viewport-specific forks.
4. Run `npm run format:check`, `npm run typecheck`, `npm run lint`, and `npm run build`. Done only when
   all four commands pass without warnings.

## Hard guardrails

- Do not invent API fields, auth methods, business data, or streaming events.
- Do not manually edit generated API output.
- Do not add a backend, mock backend, Next.js, Redux, Zustand, GraphQL, or heavyweight architecture
  unless a later requirement explicitly changes the project scope.
- Do not replace official Beautiful UI primitives with lookalike local reimplementations.
