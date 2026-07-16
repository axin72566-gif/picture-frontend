<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  expireTime: string
}>()

const emit = defineEmits<{
  expired: []
}>()

const remainingMs = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
let expiredEmitted = false

const label = computed(() => {
  if (remainingMs.value <= 0) return '已过期'
  const totalSec = Math.ceil(remainingMs.value / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function tick() {
  const end = new Date(props.expireTime).getTime()
  if (Number.isNaN(end)) {
    remainingMs.value = 0
    return
  }
  remainingMs.value = Math.max(0, end - Date.now())
  if (remainingMs.value <= 0 && !expiredEmitted) {
    expiredEmitted = true
    emit('expired')
  }
}

function start() {
  stop()
  expiredEmitted = false
  tick()
  timer = setInterval(tick, 1000)
}

function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

watch(
  () => props.expireTime,
  () => start(),
  { immediate: true },
)

onMounted(() => start())
onBeforeUnmount(() => stop())
</script>

<template>
  <span class="countdown" :class="{ 'countdown--expired': remainingMs <= 0 }">{{ label }}</span>
</template>

<style scoped>
.countdown {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #b45309;
}

.countdown--expired {
  color: #9ca3af;
  font-weight: 500;
}
</style>
