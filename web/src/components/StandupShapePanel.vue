<script setup lang="ts">
import { computed } from 'vue'
import type { DailyForecast } from '@/types'
import { fmtHrs, parseWindow } from '@/utils/forecast'
import SolidBar from '@/components/SolidBar.vue'
import FocusTimeline from '@/components/FocusTimeline.vue'

const { forecast } = defineProps<{
  forecast: DailyForecast
}>()

const targets = computed(() => forecast.targets ?? { meetingHours: 2.5, focusHours: 4.0 })

const max = computed(() => {
  const { startMin, endMin } = parseWindow(forecast.workdayWindow)
  const workHours = (endMin - startMin) / 60
  return Math.max(
    workHours,
    forecast.meetings.totalHours,
    forecast.focusTime.totalHours,
    targets.value.meetingHours,
    targets.value.focusHours,
  )
})
</script>

<template>
  <div class="bg-card border border-border p-4" data-testid="shape-panel">
    <div class="flex items-baseline justify-between border-b border-dashed border-border pb-2 mb-4">
      <span class="text-accent font-bold uppercase tracking-wider">Today's Shape</span>
      <span class="text-muted-foreground text-xs">{{ forecast.workdayWindow }}</span>
    </div>

    <div class="flex flex-col gap-3">
      <SolidBar
        label="meet"
        :value="forecast.meetings.totalHours"
        :target="targets.meetingHours"
        :max="max"
        :meta="`${fmtHrs(forecast.meetings.totalHours)} &middot; ${forecast.meetings.count}`"
        fill-class="bg-accent"
        data-testid="meet-bar"
      />
      <SolidBar
        label="focus"
        :value="forecast.focusTime.totalHours"
        :target="targets.focusHours"
        :max="max"
        :meta="`${fmtHrs(forecast.focusTime.totalHours)} &middot; ${forecast.focusTime.count}`"
        fill-class="bg-primary"
        data-testid="focus-bar"
      />
      <div class="text-xs text-muted-foreground">
        <span class="text-accent">&#9474;</span> = target line
      </div>
    </div>

    <div class="border-t border-border mt-4 pt-3">
      <div class="text-xs text-muted-foreground mb-2 tracking-wide">
        focus blocks across the day &middot; 30-min increments
        <span v-if="forecast.recommendedLunch">
          &middot; lunch <span class="text-lunch">{{ forecast.recommendedLunch }}</span>
        </span>
      </div>
      <FocusTimeline
        :blocks="forecast.focusTime.blocks"
        :recommended-lunch="forecast.recommendedLunch"
        :workday-window="forecast.workdayWindow"
      />
      <div class="flex gap-4 mt-3 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1.5">
          <i class="inline-block w-3 h-3 bg-primary" /> focus
        </span>
        <span class="inline-flex items-center gap-1.5">
          <i class="inline-block w-3 h-3 bg-lunch" /> lunch
        </span>
        <span class="inline-flex items-center gap-1.5">
          <i class="inline-block w-3 h-3 border border-border" /> open / meetings
        </span>
      </div>
    </div>
  </div>
</template>
