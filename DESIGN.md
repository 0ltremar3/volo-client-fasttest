# Volo Application Design System

Sources of truth: the Coach section and [Daily Ver2 node](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=102-15348&m=dev) in the light-mode Figma file. Coach implementation detail comes from its speaking, quick-reply, Focus-card, and Move-card states; Daily long-form order comes from nodes `37:9371` and `37:9628`. Product behavior remains a frontend-only mock until backend contracts exist.

## 1. Visual theme and atmosphere

Volo is a quiet, warm reflection space. A pale sky at the top dissolves into a peach center and a paper-white base. Daily and Coach share this full-viewport atmosphere, warm ink, glass surfaces, and one orange Coach mark in the bottom navigation. The interface should feel calm and private rather than clinical or futuristic.

The Figma composition is primary. Claude's editorial design system is a secondary DNA donor for three supporting details: warm near-black instead of pure black, a serif/sans content hierarchy, and whisper-soft `0 4px 24px rgb(0 0 0 / 5%)` elevation. These values support the Figma direction; they do not replace it.

## 2. Color palette and roles

- Coach ink: `#3d3a36`; warm primary text, never pure black.
- Warm text: `#7a6550`; user-message copy and secondary warmth.
- Tertiary text: `#9a948e`; labels and metadata only.
- Sky: `#c8dff6` → `#e8f1f8`; top atmosphere.
- Paper: `#fbf7f0` → `#f7f6f2`; lower canvas.
- Peach light: `#ffc062` fading to transparent; one broad ambient layer, never a neon glow.
- Glass surface: `rgb(255 255 255 / 80%)`; Focus, Move, and user bubbles.
- Strong glass: `rgb(255 255 255 / 96%)`; compact chips and the composer.
- Warm border: `rgb(230 220 198 / 60%)`; composer and warm controls.
- Accent: `#f45f00`; active Coach mark and send affordance.
- Inspiration surface: `#f3efe8`; quiet quick-reply chips.
- Dark theme mirrors these roles with warm charcoal surfaces and a muted amber accent; it must not introduce blue-purple AI gradients.

## 3. Typography rules

- UI and conversation copy: Inter, weights 400/500/600.
- Focus title: Playfair Display 600, `22px / 30px`.
- Page title: Inter 600, `16px / 1`.
- Conversation text: Inter 500, `16px / 1.25–1.45`.
- Move text: Inter 500, `18px / 24px`.
- Metadata: Inter 400–600, `11–12px / 15px`.
- Focus overline: Inter 600, `11px`, `0.12em` tracking, uppercase.
- No italics. Headings use balanced wrapping; body copy uses pretty wrapping and must tolerate long user content.

## 4. Component styling and decisions

### Focus card

Use when the user needs persistent orientation during a Coach conversation. It is not a generic section card: it carries the current topic and its two tags. At 390px it is 360px wide, at least 175px high, radius 22px, padding `20px 22px`, a white 1px border, and a warm `0 6px 20px rgb(61 59 54 / 10%)` shadow.

### Inspiration options

Use short chips when a user may need help beginning a reply. Do not hide these prompts in a dropdown. The row scrolls horizontally on narrow screens and never wraps into a tall block. Selecting an option fills the composer so the user retains control before sending.

### Composer

Reuse the official Beautiful UI-derived Coach prompt bar through its app adapter. The visual form is a white pill with a warm border and soft shadow. Every icon keeps a 44px touch target even when the visible glyph is smaller. Empty, filled, multiline, disabled voice, keyboard submit, and inspiration-filled states are required.

### Move card

Use when the conversation produces a concrete next action. It is not a chat bubble: it combines schedule metadata, an 18px action statement, source attribution, time, and accept/edit/skip recovery actions. Radius 22px, glass surface, white border, and the same warm elevation family as the Focus card.

### Bottom navigation

Three controls only: Daily (`/daily`), Coach (`/chat`), and Coach conversation history. Daily and Coach are real links; History is a dialog button. The Coach mark sits in a small raised notch and uses the orange ring asset. Navigation is semantic, keyboard accessible, safe-area aware, and at least 93px high including the device inset. Active route state remains independent from the History dialog state.

### Top bar

Coach contains only the centered `Coach` title. Daily uses the exported VOLO wordmark and a non-interactive profile brand glyph. Do not add new-conversation, account, or history controls to either top bar. Browser/PWA safe areas replace Figma's illustrative status bar and Dynamic Island.

### Daily date and week strip

The selected weekday is a `28px / 38px` display heading; month/year remains static text until a designed calendar state exists. Seven date buttons keep 44px touch targets. The active date uses weight, ink, and a 15px tick so selection is not color-only. Date state belongs in `/daily?date=YYYY-MM-DD` and is restored by browser history.

### Daily Echo

The summary Echo is a read-only `article`, 350px wide at the 390px reference, 323px high, radius 22px, with warm glass, a Figma-exported arc and marker, a 12px overline, and `22px / 28px` display lead. It has no edit affordance in the first slice. The scheduled Echo variant belongs to the later settings slice.

### Daily summary and traces

The summary uses the same 22px glass surface, source/date metadata, `18px / 24px` body, exported divider, and distinct TAKE AWAY block. Traces remain a separate card and semantic ordered list with a time column, exported rail, `15px / 20px` copy, and compact kind chips. Missing summary and empty traces are separate states.

## 5. Layout principles

- Mobile canvas: 375px upward; Figma reference width is 390px.
- Desktop: center the same mobile composition in a neutral app frame; do not invent a separate desktop information architecture.
- Primary horizontal gutter: 15–20px. Focus card uses 15px; conversation and composer use 20px.
- Vertical rhythm follows 8/12/16/24/36px increments.
- Content scrolls between the top region and bottom navigation. Coach may additionally stack inspiration and composer controls.
- Bottom controls remain keyboard-safe and safe-area aware. No horizontal page overflow.

## 6. Depth and elevation

- Level 0: atmospheric gradient canvas.
- Level 1: quiet inspiration chips with a warm hairline border.
- Level 2: glass chat bubbles and composer.
- Level 3: Focus and Move cards with a white edge plus warm multi-layer shadow.
- Level 4: active Coach mark raised above the navigation surface.
- Shadows stay warm and low-opacity. No outer glow, neon, or full-page glass treatment.

## 7. Do's and don'ts

Do:

- Keep one visual focus: the Coach mark and the current Focus card.
- Preserve warm grays, paper surfaces, and readable contrast.
- Keep visible UI copy direct and calm.
- Provide focus-visible, hover, active, disabled, loading, empty, and error behavior where the state exists.
- Let long conversation copy wrap naturally.

Don't:

- Do not add top-level new-conversation or history entries.
- Do not use a left-side accent stripe on cards or selected states.
- Do not turn every message into a card.
- Do not use purple-blue glows, pure black, italics, or decorative system status-bar replicas.
- Do not imply AI streaming, calendar persistence, reminders, or backend history.

## 8. Responsive behavior

- At 375–479px, cards are `calc(100% - 30px)` and the conversation gutter is 20px.
- Inspiration chips remain one line and use horizontal scrolling with hidden scrollbars.
- Composer actions retain 44px touch targets; text gets the remaining width with `min-width: 0`.
- At desktop widths, the shell stays 390px wide and centered. The outer background provides framing only.
- Daily uses a 350px content width inside the 390px shell; Move cards may use the full 360px content column.
- Both themes must preserve the same anatomy, spacing, and hierarchy.
- Long labels and generated content use wrapping or truncation by role; metadata may truncate, primary content must wrap.

## 9. Motion philosophy

Motion communicates state, never personality theatre. Button press feedback uses `transform: scale(0.97)` over 120–160ms. Menus use a trigger-origin ease-out transition under 200ms. Newly generated Move content may rise by 8px while fading in over 200–240ms. Keyboard navigation receives no movement animation. All motion is disabled or reduced under `prefers-reduced-motion`, and hover-only effects are gated to fine pointers.

## 10. Daily Echo settings

The Echo settings surface follows Figma nodes `1:1260`, `37:10320`, `37:10738`, `37:10557`, and `37:11003`. It is a bottom sheet over the mounted Daily page, not a route. At the 390px reference width the sheet begins 54px below the viewport top, uses a 46px top radius, a paper-glass surface, and the existing 120px Coach orb. Time, Date, Repeat, and Alarm use the same 70px row rhythm and warm dividers as Coach scheduling.

Volo V2 keeps Daily Echo intentionally daily: the sheet contains one local time and one enabled switch. Time uses compact hour, minute, and period controls inside the same glass popup anatomy. The control exposes expanded state, supports keyboard focus, and closes without changing committed data when the sheet is cancelled. Save persists the plan through `/v2/daily/echo/schedule`; device notifications remain explicitly unavailable.

The Daily Echo card itself is read-only. It displays the selected date's summary and insights, or the established empty state when no summary exists. Only the settings icon is interactive; the card never navigates to a conversation and the frontend does not offer summary generation.

## 11. Connected product states

With `VITE_MOCK_MODE=false`, Coach and Daily use the Volo V2 backend. Loading uses stable skeleton surfaces, network failures keep retry actions near the failed work, and completed Coach sessions are read-only. Coach token deltas stream into the active reply; persisted messages and pending cards replace optimistic state after reload. Pending Move and topic-title cards remain visually distinct from chat bubbles. A Period Move groups all of its due times inside one card and gives each time an independent, icon-labelled three-state control; no percentage or progress bar is introduced.
