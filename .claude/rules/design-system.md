# Design System

The visual language of Daily Work — a single-user productivity tool with a **terminal / CLI aesthetic**. This is the canonical reference for generating any new UI, artifact, mockup, or design that should look like it belongs in this app. Read it before designing anything visual.

Source of truth for tokens: [`web/src/style.css`](../../web/src/style.css). For Vue implementation mechanics (props, stores, lint rules), see [`vue.md`](vue.md) — this file is the *visual* layer, `vue.md` is the *code* layer.

## Design Principles

1. **It's a terminal, not a dashboard.** Every surface reads like a shell session — command prompts, file paths, glyphs, monospace. No cards-with-shadows SaaS look.
2. **Zero radius, zero shadow.** `--radius: 0`. Borders define surfaces, never elevation. Never add `rounded-*`, `shadow-*`, or drop shadows.
3. **Monospace everything.** One typeface (JetBrains Mono) for headings, body, labels, numbers. No serif, no proportional sans.
4. **Color is semantic and sparse.** The palette is small and warm (paper background, ink-blue foreground, golden accent). Color signals meaning — prompt, accent, done, error — never decoration.
5. **Glyphs over icons.** Use ASCII/box-drawing/emoji glyphs (`$`, `>>>`, `[x]`, `┌─┐`, `→`), not an icon font or SVG icon set.
6. **Interactive affordances are text.** Buttons are bracketed words (`[edit]`, `[review]`), `+ add` links, and blinking cursors — not filled pill buttons.

## Color Tokens

All colors are OKLCH CSS variables defined in `:root` and exposed to Tailwind as `--color-*`. **Only ever reference the semantic Tailwind class** (`bg-card`, `text-accent`) — never hardcode hex/rgb/oklch, never use `bg-white`, `text-black`, or `text-gray-*`.

| Token (Tailwind class) | OKLCH value | Role |
|---|---|---|
| `background` | `oklch(0.96 0.01 85)` | Page background — warm paper |
| `foreground` | `oklch(0.38 0.08 255)` | Primary text — ink blue |
| `card` | `oklch(0.98 0.008 85)` | Section / panel surfaces |
| `card-foreground` | `oklch(0.38 0.08 255)` | Text on cards |
| `popover` / `popover-foreground` | same as card | Overlays |
| `primary` | `oklch(0.45 0.12 255)` | Prompt `$`, headings, active state, key accents |
| `primary-foreground` | `oklch(0.96 0.01 85)` | Text on primary fills |
| `secondary` | `oklch(0.92 0.015 85)` | Subtle fills — selects, hover backgrounds |
| `secondary-foreground` | `oklch(0.45 0.08 255)` | Text on secondary |
| `muted` | `oklch(0.92 0.015 85)` | Dimmed surfaces (past days) |
| `muted-foreground` | `oklch(0.55 0.05 255)` | Secondary text, labels, placeholders, inactive |
| `accent` | `oklch(0.7 0.18 55)` | **Golden highlight** — `>>>`, emphasis, the "one thing", key numbers |
| `accent-foreground` | `oklch(0.2 0.05 55)` | Text on accent fills |
| `success` | `oklch(0.50 0.09 155)` | Completion flashes (used via `animate-success-flash`) |
| `destructive` | `oklch(0.55 0.2 25)` | Delete actions, errors |
| `border` | `oklch(0.8 0.02 255)` | Every border, every divider |
| `input` | `oklch(0.98 0.008 85)` | Input field surface |
| `ring` | `oklch(0.45 0.12 255)` | Focus ring (= primary) |

**Color usage rules**
- `text-primary` = the shell prompt `$` and headings. `text-accent` = golden emphasis (`>>>`, the one/first task, key stats, active-view marker `~`).
- `text-muted-foreground` is the default for labels, secondary rows, and inactive controls. Body text that matters is `text-foreground`.
- Tint, don't fill: active/selected surfaces use a low-opacity wash of the token (`bg-primary/5`, `bg-primary/10`, `border-primary`), not a solid `bg-primary` block.
- `text-destructive` delete affordances are typically a bare `x`, hidden until row hover.

> **Dark mode:** a `@custom-variant dark (&:is(.dark *))` hook exists but **no dark token values are defined yet** — the app ships light-only. Don't assume a working dark theme; if you add one, define the `.dark` token block in `style.css` first.

## Typography

```css
--font-sans: 'JetBrains Mono', 'Courier New', monospace;
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
```

Both families are monospace — there is no proportional font anywhere. Type scale (Tailwind):

| Use | Classes |
|---|---|
| App title (`$ TODO.sh`) | `text-2xl text-primary` |
| Modal section question | `text-lg font-bold text-accent` |
| Objective / big input | `text-xl text-foreground` |
| Body / rows | `text-sm` |
| Labels, meta, day cells, badges | `text-xs` |
| Section labels (uppercase) | `text-xs uppercase tracking-wider text-muted-foreground` |

Weight is mostly regular; `font-bold` for headings and emphasized keys. Tracking: `tracking-wider` on uppercase labels and modal titles.

## Layout

- Page shell: `min-h-screen bg-background`, content wrapped in `max-w-screen-2xl mx-auto px-4 py-8`.
- Vertical rhythm between sections: `space-y-6` (main) / `mb-6` (per section).
- Multi-column: `grid grid-cols-1 lg:grid-cols-2 gap-6` (or `lg:grid-cols-3` with `lg:col-span-2`). Day grid: `grid grid-cols-5 gap-2`.
- Cards/panels: `bg-card border border-border p-4` (or `p-6` for prominent ones). **No rounding, no shadow.**

## Signature Patterns

These are the recurring conventions that make the app *look like this app*. Reuse them verbatim.

### Section header — shell command
Every top-level section is introduced by a fake shell command, not a title:
```html
<div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
  <span class="text-primary">$</span>
  <span>ls -la /week/tasks/daily/</span>
</div>
```
The command should be a plausible, evocative shell line for the content (`cat /queue/learning.txt | head -5`, `wc -l /stats`, `cat /week/{{weekOf}}/OBJECTIVE`).

### Internal subsection header — `>>>`
Inside a card, subsections use a golden `>>>` prefix:
```html
<span class="text-accent">&gt;&gt;&gt;</span>
<span class="text-muted-foreground text-xs uppercase tracking-wider">Active Queue (3)</span>
```

### Checkbox glyphs
Never a real checkbox. Toggle between bracketed glyphs:
```html
<span class="text-primary">[x]</span>        <!-- done -->
<span class="text-muted-foreground">[ ]</span> <!-- not done -->
```
Done text gets `line-through text-muted-foreground`.

### Bracketed text buttons
Actions are words in square brackets, dim by default, `hover:text-primary`:
```html
<button class="text-muted-foreground hover:text-primary text-xs">[review]</button>
<button class="text-muted-foreground hover:text-primary text-xs">[{{ isActive ? 'backlog' : 'activate' }}]</button>
```
Destructive: a bare `x` revealed on row hover — `opacity-0 group-hover:opacity-100 text-destructive text-xs`.

### `+ add` affordance & inline input
Adding an item is a dim `+ add` link that swaps to a borderless inline input prefixed with a prompt glyph:
```html
<button class="text-muted-foreground hover:text-primary text-sm">+ add item</button>
<!-- when adding: -->
<span class="text-primary">&gt;</span>
<input class="flex-1 bg-transparent border-none outline-none text-foreground text-sm" placeholder="..." />
```
Inputs are transparent with no border/outline — they live inline in the text flow. Bind `@keydown.enter` to submit, `@keydown.escape` to cancel, and usually `@blur` to save-or-cancel.

### Empty / placeholder states
Angle-bracket "placeholder" text, italic and muted:
```html
<span class="text-muted-foreground text-sm italic">&lt;no active items&gt;</span>
<span>&lt;click to set objective&gt;</span>
```

### Blinking cursor
The signature "live terminal" flourish — an accent block or bar with `animate-blink`:
```html
<span class="animate-pulse text-accent">_</span>
<span class="inline-block w-[0.5em] h-[0.9em] bg-foreground align-text-bottom ml-1 animate-blink"></span>
```

### Box-drawing chrome
Small framed widgets (like the nav box) use literal box-drawing characters and section rules use em-dashes:
```
┌────────────────────────────┐   │ ... │   └────────────────────────────┘
─── Backlog (2) ───          ─── EOF ───
```
Active row marker inside these boxes is a golden `~`; the footer terminator is `─── EOF ───`.

### Active-day / active-view emphasis
Current day cell: `border-primary bg-primary/5` with a pulsing `*` on each side of the label (`animate-pulse`). Past cells dim to `border-border/50 bg-muted/30`. Future cells stay `border-border bg-card`. The *first* task in a list is the "one thing" — `uppercase text-accent font-bold`.

## Modals

Full-screen overlay with a **double border** frame — the most decorated surface in the app:
```html
<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
  <div class="w-[80vw] h-[80vh] bg-card border-4 border-double border-primary flex flex-col">
    <!-- Title bar -->
    <div class="border-b-4 border-double border-primary px-4 py-2 flex items-center justify-center">
      <span class="text-primary font-bold tracking-wider">// DAILY STANDUP</span>
    </div>
    <div class="flex-1 p-6 overflow-auto"><!-- content --></div>
    <!-- Action bar -->
    <div class="border-t-4 border-double border-primary px-4 py-3 flex items-center justify-center gap-8">
      <!-- keyboard-key buttons --></div>
  </div>
</div>
```
- Render via `<Teleport to="body">`.
- Modal titles are comment-style: `// DAILY STANDUP`, `// WEEKLY ROUNDUP`.
- **Keyboard-key action buttons:** the accessible letter is bracketed in accent, the letter itself is primary-bold, the rest is muted — and a matching single-key shortcut fires the action:
  ```html
  <span class="text-accent">[</span><span class="text-primary font-bold">S</span><span class="text-accent">]</span><span class="text-muted-foreground">ave</span>
  ```
  Bind `s`/`c`/`r`/`e` (and `Escape`) on a window `keydown` listener; always support `Escape` to close.
- Loading state: the word `Generating` + sequentially-lit accent dots + a blinking block cursor. Error state: `<span class="text-accent">ERR:</span> {message}` in `text-destructive`.

## Categorization Badges & Glyphs

Learning-queue item types map to emoji (component-local constant map — this is the sanctioned exception to "no decorative color/icons"):
```ts
const TYPE_EMOJI = { Read: '📔', Watch: '📺', Learn: '🎓', Experiment: '🧪' } as const
```
Type selectors use `bg-secondary text-secondary-foreground text-xs px-1 py-0.5 border border-border` with UPPERCASE option labels. Per `vue.md`, a component-local `TYPE_STYLES`-style map *may* use raw Tailwind color classes for badge coloring — this is the one place literal colors are allowed.

## Animation

Defined as `@utility` in `style.css`. Keep motion terminal-flavored and brief:

| Utility | Effect |
|---|---|
| `animate-blink` | 1s step-end cursor blink (opacity 1→0) |
| `animate-pulse` | Tailwind built-in — active markers `*`, `_`, `~` |
| `animate-scan-sweep` | 0.18s left-to-right sweep highlight |
| `animate-success-flash` | 0.7s green wash on completion |

Transitions on interactive text are `transition-colors` only. No easing-heavy, no slide/scale entrances.

## Quick Do / Don't

| Do | Don't |
|---|---|
| `bg-card border border-border` | `rounded-lg shadow` |
| `[x]` / `[ ]` glyph toggles | real `<input type=checkbox>` styling |
| `[edit]`, `+ add`, bracketed words | filled pill / gradient buttons |
| `text-accent` for the one golden emphasis | color used decoratively |
| `$ command` + `>>>` headers | plain `<h2>Title</h2>` |
| JetBrains Mono for everything | a second proportional/serif font |
| Semantic tokens (`text-primary`) | `text-blue-600`, hex, `bg-white` |
| `<placeholder>` empty states | "Nothing here yet 🎉" SaaS copy |
