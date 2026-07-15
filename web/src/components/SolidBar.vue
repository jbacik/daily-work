<script setup lang="ts">
import { computed } from 'vue'

const { label, value, target = null, max, meta = '', fillClass = 'bg-primary' } = defineProps<{
  label: string
  value: number
  target?: number | null
  max: number
  meta?: string
  fillClass?: string
}>()

const valuePct = computed(() => Math.max(0, Math.min(100, (value / max) * 100)))
const targetPct = computed(() =>
  target == null ? null : Math.max(0, Math.min(100, (target / max) * 100)))
</script>

<template>
  <div class="flex items-center gap-3 text-sm">
    <span class="w-12 shrink-0 text-muted-foreground text-xs uppercase tracking-wider">{{ label }}</span>
    <div
      class="relative flex-1 h-4 border border-border"
      :style="{
        backgroundImage: 'radial-gradient(var(--color-muted-foreground) 0.8px, transparent 0.8px)',
        backgroundSize: '5px 5px',
        backgroundPosition: '0 center',
      }"
    >
      <div
        class="absolute inset-y-0 left-0 transition-all"
        :class="fillClass"
        :style="{ width: `${valuePct}%` }"
        data-testid="solid-bar-fill"
      />
      <template v-if="targetPct !== null">
        <div
          class="absolute inset-y-0 w-[6px] -translate-x-1/2 bg-card"
          :style="{ left: `${targetPct}%` }"
        />
        <div
          class="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-accent"
          :style="{ left: `${targetPct}%` }"
          data-testid="solid-bar-target"
        />
      </template>
    </div>
    <span class="w-24 shrink-0 text-right text-xs text-muted-foreground">{{ meta }}</span>
  </div>
</template>
