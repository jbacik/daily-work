<template>
  <div class="pc-shell">

    <div class="pc-shell-header">// time-clock.sh · punch card reader</div>

    <div class="pc-shell-body" :class="{ flash: isFlashing }">

      <!-- Machine -->
      <div class="pc-machine">
        <div class="pc-machine-top">
          <span class="pc-machine-title">TIME CLOCK</span>
          <span class="pc-machine-ver">v1.0</span>
        </div>
        <div class="pc-machine-mid">
          <span class="pc-status-label">STATUS ›</span>
          <span class="pc-status-value" :class="{ scanning: isScanning }">{{ statusText }}</span>
        </div>

        <!-- Card slot -->
        <div class="pc-slot-wrap">
          <div class="pc-slot-upper-bar"></div>
          <div class="pc-slot-channel" ref="slotChannel">
            <span class="pc-slot-label">{{ slotLabel }}</span>
            <div class="pc-scan-beam" ref="scanBeam"></div>

            <!-- Punch card -->
            <div class="pc-card-track">
              <div class="pc-card" :class="cardState" ref="cardEl">
                <div class="pc-card-notch"></div>
                <div class="pc-card-body">
                  <div class="pc-card-id">EMP-ID: {{ empIdFormatted }} · VIRTUOUS · 2026</div>
                  <div class="pc-card-holes">
                    <div
                      v-for="(punched, i) in HOLE_PATTERN"
                      :key="i"
                      class="pc-hole"
                      :class="{ punched: punched, lit: litUpTo >= i && punched }"
                    ></div>
                  </div>
                  <div class="pc-card-name">{{ empNameFormatted }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="pc-slot-lower-bar"></div>
        </div>
      </div>

      <!-- Terminal -->
      <div class="pc-terminal" v-html="terminalHtml"></div>

      <!-- Actions -->
      <div class="pc-actions">
        <button
          class="pc-btn pc-btn-in"
          :disabled="busy"
          @click="startClock('in')"
        >[C]lock In</button>
        <button
          class="pc-btn"
          :disabled="busy"
          @click="startClock('out')"
        >[C]lock Out</button>
      </div>

    </div>

    <div class="pc-shell-footer">
      <span>{{ footerLeft }}</span>
      <span>{{ footerRight }}</span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ── Props ──────────────────────────────────────────────────────────────────
const props = defineProps({
  employeeName: {
    type: String,
    default: 'Jared Bacik',
  },
  employeeId: {
    type: String,
    default: '20210628',
  },
})

// ── Emits ──────────────────────────────────────────────────────────────────
const emit = defineEmits(['clocked'])
// emits: { mode: 'in'|'out', employeeId: string, employeeName: string, timestamp: Date, timeString: string }

// ── Hole pattern (drives the punch card display) ───────────────────────────
const HOLE_PATTERN = [1,0,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1,
                      1,0,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1]

// ── Refs ───────────────────────────────────────────────────────────────────
const scanBeam   = ref(null)
const cardEl     = ref(null)

// ── State ──────────────────────────────────────────────────────────────────
const busy        = ref(false)
const isFlashing  = ref(false)
const isScanning  = ref(false)
const statusText  = ref('READY')
const slotLabel   = ref('insert card')
const cardState   = ref('')        // '' | 'inserting' | 'ejecting'
const litUpTo     = ref(-1)
const footerLeft  = ref('_ ready')
const footerRight = ref('press i / o')
const terminalHtml = ref(
  `<span class="p">$</span> ./clock.sh --ready<br><span class="d">waiting for card...</span> <span class="cursor"></span>`
)

// ── Computed ───────────────────────────────────────────────────────────────
const empIdFormatted = computed(() => props.employeeId)
const empNameFormatted = computed(() => {
  const parts = props.employeeName.trim().split(' ')
  const last  = parts.pop().toUpperCase()
  const first = parts.join(' ').toUpperCase()
  return `${last}, ${first} · VIRTUOUS`
})

// ── Helpers ────────────────────────────────────────────────────────────────
const wait = ms => new Promise(r => setTimeout(r, ms))

function setTerm(html) {
  terminalHtml.value = html
}

async function typeLines(lines, delay = 75) {
  let acc = ''
  for (const ln of lines) {
    acc += ln + '\n'
    setTerm(acc + '<span class="cursor"></span>')
    await wait(delay)
  }
  setTerm(acc)
}

async function runScan() {
  const beam = scanBeam.value
  if (!beam) return
  for (let pass = 0; pass < 3; pass++) {
    beam.classList.remove('active')
    void beam.offsetWidth
    beam.classList.add('active')
    litUpTo.value = Math.floor((pass / 2) * HOLE_PATTERN.length)
    await wait(200)
  }
  beam.classList.remove('active')
  litUpTo.value = -1
}

// ── Main animation ─────────────────────────────────────────────────────────
async function startClock(mode) {
  if (busy.value) return
  busy.value = true
  const isIn = mode === 'in'

  footerLeft.value  = '_ processing'
  footerRight.value = isIn ? 'clock in' : 'clock out'

  // 1. Terminal echo
  setTerm(`<span class="p">$</span> ./clock.sh --${mode}\n<span class="d">reading card...</span> <span class="cursor"></span>`)

  // 2. Card slides in
  statusText.value = 'READING...'
  isScanning.value = false
  slotLabel.value  = ''
  cardState.value  = ''
  await wait(40)
  cardState.value  = 'inserting'
  await wait(680)

  // 3. Scan passes
  statusText.value = 'SCANNING...'
  isScanning.value = true
  await runScan()

  // 4. Processing
  statusText.value = 'PROCESSING...'
  footerRight.value = '...'
  await wait(300)

  // 5. Eject
  statusText.value = isIn ? 'CLOCKED IN' : 'CLOCKED OUT'
  isScanning.value = false
  cardState.value  = 'ejecting'
  await wait(480)

  // 6. Flash
  isFlashing.value = true
  setTimeout(() => { isFlashing.value = false }, 750)

  // 7. Terminal result
  const now   = new Date()
  const ts    = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const ds    = now.toLocaleDateString('en-US',  { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' })
  const check = isIn ? '✓' : '○'
  const name  = props.employeeName

  await typeLines([
    `<span class="p">$</span> ./clock.sh --${mode}`,
    `<span class="d">────────────────────────────────────</span>`,
    `<span class="${isIn ? 'ok' : 'hi'}">[${check}] ${isIn ? 'CLOCKED IN' : 'CLOCKED OUT'}</span>`,
    `<span class="d">    time  </span><span class="hi">${ts}</span>`,
    `<span class="d">    date  </span>${ds}`,
    `<span class="d">    emp   </span>${name}`,
    `<span class="d">────────────────────────────────────</span>`,
  ])

  // 8. Emit event
  emit('clocked', {
    mode,
    employeeId:   props.employeeId,
    employeeName: props.employeeName,
    timestamp:    now,
    timeString:   ts,
  })

  // 9. Done
  footerLeft.value  = `_ ${isIn ? 'clocked in' : 'clocked out'}`
  footerRight.value = ts
  slotLabel.value   = 'insert card'
  await wait(300)
  busy.value = false

  setTimeout(() => { cardState.value = '' }, 100)
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
function onKeyDown(e) {
  const k = e.key.toLowerCase()
  if (k === 'i') startClock('in')
  if (k === 'o') startClock('out')
}

onMounted(()  => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
</script>

<style scoped>
.pc-shell {
  width: 560px;
  display: flex;
  flex-direction: column;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  color: #4a5568;
}

.pc-shell-header {
  border: 1px solid #8a9ab5;
  border-bottom: none;
  background: #ede8dc;
  text-align: center;
  padding: 5px 0;
  font-size: 11px;
  letter-spacing: 2.5px;
  color: #9aa5b8;
  text-transform: uppercase;
}

.pc-shell-body {
  border: 1px solid #8a9ab5;
  background: #ede8dc;
  padding: 28px 28px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
  position: relative;
}

.pc-shell-footer {
  border: 1px solid #8a9ab5;
  border-top: none;
  background: #ede8dc;
  display: flex;
  justify-content: space-between;
  padding: 5px 12px;
  font-size: 11px;
  color: #9aa5b8;
}

/* Machine */
.pc-machine {
  border: 1px solid #8a9ab5;
  background: #f0ebe0;
  overflow: hidden;
}

.pc-machine-top {
  padding: 10px 14px 8px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid #8a9ab5;
}

.pc-machine-title { color: #c8601a; letter-spacing: 1px; }
.pc-machine-ver   { color: #9aa5b8; font-size: 11px; }

.pc-machine-mid {
  padding: 8px 14px;
  display: flex;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid #8a9ab5;
}

.pc-status-label { color: #9aa5b8; }
.pc-status-value { color: #4a7c59; letter-spacing: 0.5px; }
.pc-status-value.scanning { color: #c8601a; }

/* Slot */
.pc-slot-wrap { position: relative; overflow: hidden; }

.pc-slot-upper-bar,
.pc-slot-lower-bar {
  height: 14px;
  background: repeating-linear-gradient(
    90deg,
    #9aa5b8 0px, #9aa5b8 2px,
    transparent 2px, transparent 6px
  );
  opacity: 0.35;
}

.pc-slot-channel {
  height: 46px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  position: relative;
  overflow: hidden;
  background: #f0ebe0;
  border-top: 1px solid #8a9ab5;
  border-bottom: 1px solid #8a9ab5;
}

.pc-slot-label {
  color: #9aa5b8;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
}

/* Scan beam */
.pc-scan-beam {
  position: absolute;
  top: 0; bottom: 0;
  left: -4px;
  width: 3px;
  background: #c8601a;
  box-shadow: 0 0 10px 2px rgba(200, 96, 26, 0.5);
  opacity: 0;
  z-index: 3;
}

@keyframes pc-scan-sweep {
  0%   { left: 0%;   opacity: 1; }
  90%  { left: 100%; opacity: 1; }
  100% { left: 100%; opacity: 0; }
}

.pc-scan-beam.active {
  animation: pc-scan-sweep 0.18s linear forwards;
}

/* Card */
.pc-card-track {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 2;
}

.pc-card {
  position: absolute;
  top: 50%;
  transform: translateY(-50%) translateX(620px);
  transition: transform 0.65s cubic-bezier(0.3, 0, 0.2, 1);
  background: #faf7f0;
  border: 1px solid #8a9ab5;
  box-shadow: 1px 1px 0 #8a9ab5;
  width: 420px;
  height: 40px;
  overflow: hidden;
  display: flex;
  align-items: stretch;
}

.pc-card.inserting {
  transform: translateY(-50%) translateX(60px);
}

.pc-card.ejecting {
  transform: translateY(-50%) translateX(-500px);
  transition-timing-function: cubic-bezier(0.6, 0, 1, 0.4);
  transition-duration: 0.45s;
}

.pc-card-notch {
  width: 10px;
  background: #ede8dc;
  border-right: 1px solid #8a9ab5;
  flex-shrink: 0;
}

.pc-card-body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 3px 8px;
  flex: 1;
  overflow: hidden;
}

.pc-card-id {
  font-size: 9px;
  letter-spacing: 1px;
  color: #c8601a;
  white-space: nowrap;
}

.pc-card-holes {
  display: flex;
  gap: 3px;
  align-items: center;
}

.pc-hole {
  width: 5px;
  height: 8px;
  border-radius: 1px;
  border: 1px solid #8a9ab5;
  background: transparent;
  flex-shrink: 0;
  transition: background 0.06s, border-color 0.06s;
}

.pc-hole.punched       { background: #4a5568; border-color: #4a5568; }
.pc-hole.punched.lit   { background: #c8601a; border-color: #c8601a; }

.pc-card-name {
  font-size: 9px;
  color: #9aa5b8;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

/* Terminal */
.pc-terminal {
  border: 1px solid #8a9ab5;
  background: #f0ebe0;
  padding: 11px 14px;
  min-height: 88px;
  font-size: 12px;
  line-height: 1.75;
  color: #4a5568;
  white-space: pre-wrap;
}

.pc-terminal :deep(.p)  { color: #9aa5b8; }
.pc-terminal :deep(.ok) { color: #4a7c59; }
.pc-terminal :deep(.hi) { color: #c8601a; }
.pc-terminal :deep(.d)  { color: #9aa5b8; }

.pc-terminal :deep(.cursor) {
  display: inline-block;
  width: 7px;
  height: 12px;
  background: #4a5568;
  vertical-align: text-bottom;
  animation: pc-blink 1s step-end infinite;
}

@keyframes pc-blink { 50% { opacity: 0; } }

/* Buttons */
.pc-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.pc-btn {
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 6px 22px;
  background: none;
  border: 1px solid #8a9ab5;
  color: #4a5568;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
}

.pc-btn:hover:not(:disabled) { border-color: #c8601a; color: #c8601a; }
.pc-btn:disabled              { opacity: 0.3; cursor: default; }

.pc-btn-in                          { border-color: #c8601a; color: #c8601a; }
.pc-btn-in:hover:not(:disabled)     { background: #c8601a; color: #f0ebe0; }

/* Flash */
@keyframes pc-ok-flash {
  0%   { background: #ede8dc; }
  25%  { background: rgba(74, 124, 89, 0.10); }
  100% { background: #ede8dc; }
}

.pc-shell-body.flash {
  animation: pc-ok-flash 0.7s ease-out forwards;
}
</style>
