<script setup lang="ts">
import { computed } from 'vue'
import type { ForecastFocusBlock } from '@/types'
import { parseClock, parseWindow } from '@/utils/forecast'

const { blocks, recommendedLunch = null, workdayWindow } = defineProps<{
  blocks: ForecastFocusBlock[]
  recommendedLunch?: string | null
  workdayWindow: string
}>()

type MinuteKind = 'open' | 'focus' | 'lunch'
interface CellSegment {
  kind: 'focus' | 'lunch'
  leftPct: number
  widthPct: number
}
interface Cell {
  segments: CellSegment[]
  fullyOpen: boolean
}

const CELL_MINUTES = 30

const window_ = computed(() => parseWindow(workdayWindow))

// Minute-resolution paint: focus first, lunch wins overlaps. Grouping into
// 30-min cells afterwards means a 40-min block naturally half-fills its
// second cell.
const cells = computed<Cell[]>(() => {
  const { startMin, endMin } = window_.value
  const totalMinutes = endMin - startMin
  const minuteKind: MinuteKind[] = Array(totalMinutes).fill('open')

  const paint = (start: number | null, end: number | null, kind: MinuteKind) => {
    if (start === null || end === null) return
    const s = Math.max(0, start - startMin)
    const e = Math.min(totalMinutes, end - startMin)
    for (let i = s; i < e; i++) minuteKind[i] = kind
  }

  blocks.forEach(b => paint(parseClock(b.startTime), parseClock(b.endTime), 'focus'))

  if (recommendedLunch) {
    const [a, b] = recommendedLunch.split('-')
    paint(parseClock(a ?? ''), parseClock(b ?? ''), 'lunch')
  }

  const result: Cell[] = []
  for (let c = 0; c < totalMinutes; c += CELL_MINUTES) {
    const cellMinutes = minuteKind.slice(c, c + CELL_MINUTES)
    const segments: CellSegment[] = []
    let i = 0
    while (i < cellMinutes.length) {
      const kind = cellMinutes[i]!
      let j = i
      while (j < cellMinutes.length && cellMinutes[j] === kind) j++
      if (kind !== 'open') {
        segments.push({
          kind,
          leftPct: (i / cellMinutes.length) * 100,
          widthPct: ((j - i) / cellMinutes.length) * 100,
        })
      }
      i = j
    }
    result.push({ segments, fullyOpen: segments.length === 0 })
  }
  return result
})

const hourTicks = computed(() => {
  const { startMin, endMin } = window_.value
  const ticks: string[] = []
  for (let h = Math.floor(startMin / 60); h <= Math.ceil(endMin / 60); h++) {
    ticks.push(String(h).padStart(2, '0'))
  }
  return ticks
})
</script>

<template>
  <div>
    <div class="flex gap-0.5">
      <div
        v-for="(cell, i) in cells"
        :key="i"
        class="relative flex-1 h-6 border"
        :class="cell.fullyOpen ? 'border-border' : 'border-transparent'"
        data-testid="timeline-cell"
      >
        <div
          v-for="(seg, j) in cell.segments"
          :key="j"
          class="absolute inset-y-0"
          :class="seg.kind === 'lunch' ? 'bg-lunch' : 'bg-primary'"
          :style="{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }"
          :data-kind="seg.kind"
        />
      </div>
    </div>
    <div class="flex justify-between mt-1 text-[10px] text-muted-foreground tabular-nums">
      <span v-for="tick in hourTicks" :key="tick">{{ tick }}</span>
    </div>
  </div>
</template>
