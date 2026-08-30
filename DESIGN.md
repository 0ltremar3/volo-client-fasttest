# Volo Application Design System

Sources of truth: the Coach section and [Daily Ver2 node](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=102-15348&m=dev) in the light-mode Figma file. Coach implementation detail comes from its speaking, quick-reply, Focus-card, and Move-card states; Daily long-form order comes from nodes `37:9371` and `37:9628`. Period Move interaction follows nodes `289:2874`, `274:10052`, `274:11137`, `274:7586`, and `274:10521`.

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

The visible trailing action is stateful: an empty composer shows the 26px orange waveform button, while a non-empty composer shows the 26px orange send button. Voice chat and dictation remain visibly unavailable in Volo V2, so both voice controls are disabled and expose an accessible unavailable label; no microphone permission or audio protocol is implied.

### Move card

Use when the conversation produces a concrete next action. It is not a chat bubble: it combines schedule metadata, an 18px action statement, source attribution, time, and accept/edit/skip recovery actions. Radius 22px, glass surface, white border, and the same warm elevation family as the Focus card.

Pending Move cards expose confirm, edit, and skip actions. Confirmed Move cards stay anchored after their source assistant message, use a quiet `Added` or `Adjusted` status, reduce visual emphasis, and expose no repeat actions. Rejected and expired cards are omitted from the active conversation.

### Bottom navigation

Three real links only: Daily (`/daily`), Coach (`/chat`), and Review (`/review`). Review uses the exact Figma-exported 32px history glyph rather than a library approximation. The Coach mark sits in a small raised notch and uses the orange ring asset. Navigation is semantic, keyboard accessible, safe-area aware, and at least 93px high including the device inset.

### Top bar

An ongoing Coach conversation uses the centered `Coach` title and the compact dark `Done` action on the right. `Done` prepares the editable pause summary but does not complete the session. Move adjustment mode hides `Done`, because confirming the revision is the only completion action. Coach landing states keep their existing page-specific heading. Daily uses the exported VOLO wordmark and a non-interactive profile brand glyph. Do not add new-conversation, account, or history controls to either top bar. Browser/PWA safe areas replace Figma's illustrative status bar and Dynamic Island.

### Daily date and week strip

The selected weekday is a `28px / 38px` display heading; month/year remains static text until a designed calendar state exists. Seven date buttons keep 44px touch targets. The active date uses weight, ink, and a 15px tick so selection is not color-only. Date state belongs in `/daily?date=YYYY-MM-DD` and is restored by browser history.

### Daily Echo

The Daily Echo card has one full main action and a separate settings control, with no nested buttons. Before start it follows node `37:9869`: 350px wide, 264px high, 30px radius, scheduled time, and `Start now`. In progress it resumes the same day's Echo. Completed state follows `37:9611`: 323px high with the exported arc/marker, `22px / 28px` summary lead, and one visible takeaway. Opening the conversation uses the light Coach anatomy but never renders Free Coach Pause or Move/Vision cards.

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

- Do not add top-level modal history entries; Review is the third primary route.
- Do not use a left-side accent stripe on cards or selected states.
- Do not turn every message into a card.
- Do not use purple-blue glows, pure black, italics, or decorative system status-bar replicas.
- Do not imply hardware traces, device notifications, or calendar-provider sync.

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

Coach waiting uses a compact 3×3 pixel wave with a plain `Reflecting` label until the first real SSE delta arrives. Real delta text is never delayed or split again; only the newly arrived tail receives a brief 160ms fade. Reduced motion freezes the pixel grid and removes the delta movement.

## 10. Daily Echo settings

The Echo settings surface follows Figma nodes `1:1260`, `37:10320`, `37:10738`, `37:10557`, and `37:11003`. It is a bottom sheet over the mounted Daily page, not a route. At the 390px reference width the sheet begins 54px below the viewport top, uses a 46px top radius, a paper-glass surface, and the existing 120px Coach orb. Time, Date, Repeat, and Alarm use the same 70px row rhythm and warm dividers as Coach scheduling.

Volo V2 keeps Daily Echo intentionally daily: the sheet contains one local time and one enabled switch. Time uses compact hour, minute, and period controls inside the same glass popup anatomy. The control exposes expanded state, supports keyboard focus, and closes without changing committed data when the sheet is cancelled. Save persists the plan through `/v2/daily/echo/schedule`; device notifications remain explicitly unavailable.

The settings button remains independent from the card's main action. Starting, resuming, completing, and reading the latest summary use the Volo V2 Daily Echo endpoints; the frontend never generates or copies the summary itself.

## 11. Connected product states

With `VITE_MOCK_MODE=false`, Coach, Daily, and Review use the Volo V2 backend. Loading uses stable skeleton surfaces, network failures keep retry actions near the failed work, and completed sessions are read-only. Coach and Echo token deltas stream into the active reply; persisted messages and cards replace optimistic state after reload. Pending Move and Pause cards remain visually distinct from chat bubbles. Period Moves use compact cards with one card per scheduled check so every due time keeps its independent backend status. The full card opens a modal check-in sheet for On Track or Drifting; its separate `Needs a Rethink` action opens Coach. A card already in `needs_adjustment` displays that label and its primary action immediately resumes the same adjustment. Adjustment revision cards use `Confirm Adjustment`, state that the Schedule is unchanged, never open ScheduleEditor, and return to the selected Daily date after confirmation. Deletion requires a separate confirmation dialog. The section collapses from its header and the empty state routes to Coach. No percentage or progress bar is introduced.

## 12. Coach appointments, Pause, and Review

Scheduled Coach cards use nodes `93:8839` and `93:9159`. The latest appointment sits above two translucent stack layers until expanded. The card's main region is one button; cancel is a separate 44px control. Card activation compares `Date.now()` with the absolute `scheduled_at` instant: due and expired appointments start immediately, while future appointments open the full-screen preview where `Start now` permits an early start.

The Free Coach Pause card follows node `102:13177`. `TOPIC TO EXPLORE` and `TAKE AWAY` are both editable; Confirm sends both final fields, while Continue rejects only the pending card and keeps the session ongoing. An AI-proposed ending first renders a compact Pause/Continue offer; accepting it enters the same Pause-card generation path as the user's explicit Pause command.

The explicit `Done` action follows node `96:12022`: it calls the existing end-suggestion path and opens the pending Pause as a full-height bottom sheet over the mounted conversation. `Into Your Day` confirms the final fields, completes the session, and replaces the route with `/daily`; `Keep talking` or Escape rejects only the pending Pause and returns focus to the composer. A pending Pause restores the sheet after reload. Backdrop clicks do not discard it.

Review follows nodes `102:14569`, `291:11479`, and `291:11727`. The 350px month calendar uses a 36px orange selected circle and 6px activity dots. Only non-empty Coach, Echo, and Move groups render. Detail uses the confirmed Pause or Echo summary above confirmed Move cards and full read-only messages; its bottom command creates a new conversation.
