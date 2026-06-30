# PunchClock.vue — Claude Code Handoff

**Component:** `PunchClock.vue`
**Purpose:** Animated punch-card clock-in/out widget for the Virtuous time-tracking UI.
**Style:** Terminal / ASCII aesthetic — cream background, orange accents, steel-blue borders, Courier New monospace. Matches the existing app palette.

---

## Drop-in usage

```vue
<template>
  <PunchClock
    employee-name="Jared Bacik"
    employee-id="20210628"
    @clocked="handleClocked"
  />
</template>

<script setup>
import PunchClock from '@/components/PunchClock.vue'

function handleClocked(event) {
  // event shape:
  // {
  //   mode:         'in' | 'out',
  //   employeeId:   '20210628',
  //   employeeName: 'Jared Bacik',
  //   timestamp:    Date,
  //   timeString:   '09:32:41 AM',
  // }
  console.log(event)
}
</script>
```

---

## Props

| Prop            | Type   | Default        | Description                        |
|-----------------|--------|----------------|------------------------------------|
| `employeeName`  | String | `'Jared Bacik'`| Full name shown on card + terminal |
| `employeeId`    | String | `'20210628'`   | ID shown on punch card header      |

---

## Emits

### `clocked`

Fires after the full animation sequence completes (card ejected, terminal typed out).

```ts
{
  mode:         'in' | 'out'
  employeeId:   string
  employeeName: string
  timestamp:    Date        // raw JS Date at time of punch
  timeString:   string      // formatted e.g. "09:32:41 AM"
}
```

---

## Keyboard shortcuts

The component attaches a `keydown` listener on `document` while mounted:

- `I` → Clock In
- `O` → Clock Out

The listener is cleaned up on `onUnmounted`.

---

## Animation sequence

1. Buttons disabled, terminal echoes command
2. Punch card slides in from the right
3. Orange scan beam sweeps across the slot 3×, holes light up
4. Card ejects left
5. Stage flashes green
6. Terminal types out the result with timestamp
7. `clocked` event emitted
8. Buttons re-enabled

Total duration: ~2.5 seconds.

---

## Styling notes

- All CSS classes are prefixed `pc-` to avoid collisions
- `<style scoped>` — no global leakage
- Terminal `v-html` inner spans use `:deep()` selectors for `.p`, `.ok`, `.hi`, `.d`, `.cursor`
- Fixed width: `560px`. Wrap in a centering container if needed:

```css
.clock-wrapper {
  display: flex;
  justify-content: center;
  padding: 40px;
}
```

- To match the existing app background, set the parent background to `#f0ebe0`

---

## File location suggestion

```
src/
  components/
    PunchClock.vue       ← drop here
  views/
    TimeClockView.vue    ← import and use here
```

---

## Integration checklist

- [ ] Copy `PunchClock.vue` to `src/components/`
- [ ] Import and register in the parent view/component
- [ ] Pass `employee-name` and `employee-id` from your auth store / current user
- [ ] Handle the `@clocked` event (call your time-tracking API, update store, etc.)
- [ ] Confirm parent background is `#f0ebe0` or set it explicitly

---

## Future enhancements (not yet implemented)

- `loading` prop to show a spinner state while the API call resolves
- `disabled` prop to lock the widget (e.g. already clocked in)
- `lastPunch` prop to show last clock-in/out time in the terminal on mount
- Swap hardcoded hole pattern for one derived from `employeeId` (encode the ID as binary)
