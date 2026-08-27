# Volo Coach Design System

Source of truth: the Coach section in the [light-mode Figma file](https://www.figma.com/design/sPJrdSkCdw3ZnHuBXNmjsp/light-mode?node-id=93-7242&m=dev), with implementation detail taken from the speaking, quick-reply, Focus-card, and Move-card states inside that section. Product behavior remains a frontend-only mock until backend contracts exist.

## 1. Visual theme and atmosphere

Volo Coach is a quiet, warm reflection space. A pale sky at the top dissolves into a peach center and a paper-white base. The interface should feel calm and private rather than clinical or futuristic. One orange ring—the Coach mark in the bottom navigation—is the memorable focal point.

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

Three destinations only: schedule/home, Coach, and history. The active Coach mark sits in a small raised notch and uses the orange ring asset. Navigation is semantic, keyboard accessible, safe-area aware, and at least 93px high including the device inset. Conversation history belongs here, not in the top bar.

### Top bar

The top bar contains only the centered `Coach` title. Do not add new-conversation or history controls. The quiet empty side columns are intentional and keep the title optically centered.

## 5. Layout principles

- Mobile canvas: 375px upward; Figma reference width is 390px.
- Desktop: center the same mobile composition in a neutral app frame; do not invent a separate desktop information architecture.
- Primary horizontal gutter: 15–20px. Focus card uses 15px; conversation and composer use 20px.
- Vertical rhythm follows 8/12/16/24/36px increments.
- Content scrolls between the top title and the stacked inspiration/composer/bottom-navigation controls.
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
- Both themes must preserve the same anatomy, spacing, and hierarchy.
- Long labels and generated content use wrapping or truncation by role; metadata may truncate, primary content must wrap.

## 9. Motion philosophy

Motion communicates state, never personality theatre. Button press feedback uses `transform: scale(0.97)` over 120–160ms. Menus use a trigger-origin ease-out transition under 200ms. Newly generated Move content may rise by 8px while fading in over 200–240ms. Keyboard navigation receives no movement animation. All motion is disabled or reduced under `prefers-reduced-motion`, and hover-only effects are gated to fine pointers.
