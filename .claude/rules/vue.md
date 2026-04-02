---
apply: "web/**"
---

# Vue Frontend Conventions

## Component Structure

- `<script setup lang="ts">` first, then `<template>`. No `<style>` blocks — Tailwind handles all styling.
- Script block order: imports → `defineProps`/`defineEmits` → reactive state (`ref`/`computed`) → methods → lifecycle hooks

## Props

Destructure props directly from `defineProps<{ ... }>()`. Destructured props are reactive in Vue 3.5+. Do not use `withDefaults` or a `props` variable — use default values in the destructure instead.

```ts
// CORRECT
const { title, isEnabled = false } = defineProps<{
  title: string;
  isEnabled?: boolean;
}>();

// WRONG — unnecessary withDefaults
const props = withDefaults(defineProps<{ title: string; isEnabled?: boolean }>(), {
  isEnabled: false,
});
```

## Pinia Stores

- All stores use Setup Store style: `defineStore('storeId', () => { ... })`
- Import `client` from `@/api/client` directly in stores. No separate service/composable layer.
- State is typed refs: `const items = ref<WorkItem[]>([])`
- Expose only what callers need in the return object.

## API Call Pattern (Critical)

The Axios client at `@/api/client.ts` has a response interceptor that returns `response.data` directly. This means `await client.get(...)` already returns the payload — **do not add `.data`** on top of the call. The `as any` cast in store assignments is intentional (TypeScript can't see through the interceptor) — do not "fix" it.

```ts
// CORRECT
items.value = await client.get('/api/work-items', { params }) as any

// WRONG — double-unwraps the response
const response = await client.get('/api/work-items')
items.value = response.data
```

## TypeScript Types

- All shared interfaces live in `web/src/types/index.ts`. Add new types there, not inline in stores or components.
- Use `import type` for type-only imports.
- Use `@/` path alias for all imports from `src/`. Never use `../` across directory boundaries.

## Computed vs Methods

- Use `computed()` for derived state read in templates.
- Use plain functions for event handlers and actions.

## Tailwind v4 / Design Tokens

No `rounded-*` classes — border-radius is 0 via CSS variable. Use only the semantic tokens defined in `style.css`:

| Token | Purpose |
|---|---|
| `bg-background` | Page background |
| `bg-card` | Section/card surfaces |
| `bg-input` | Input fields |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary/placeholder text |
| `text-primary` | Accent blue |
| `text-accent` | Golden accent |
| `text-destructive` | Errors/delete actions |
| `border-border` | All borders |
| `bg-primary` / `text-primary-foreground` | Primary buttons |
| `bg-secondary` | Secondary buttons |

Never use `bg-white`, `text-black`, `text-gray-*`, or hardcoded hex/rgb colors.

**Exception:** Component-local constant maps (like `TYPE_STYLES` in `ReadWatchItem.vue`) may use Tailwind color classes for label badge coloring.

## CLI Aesthetic

The app has a terminal/CLI aesthetic — maintain it in new UI:

- Section headers: `<span class="text-primary">$</span> <span>command/path</span>`
- Cards: `bg-card border border-border` (no shadows, no rounded corners)
- Internal subsection headers: `>>>` prefix
- Interactive empty states: `<placeholder>` text style
