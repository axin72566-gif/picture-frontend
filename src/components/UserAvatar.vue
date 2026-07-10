<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src?: string
    text: string
    size?: number
  }>(),
  {
    src: '',
    size: 40,
  },
)

const imageFailed = ref(false)

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(14, Math.round(props.size * 0.36))}px`,
}))

const showImage = computed(() => Boolean(props.src) && !imageFailed.value)

watch(
  () => props.src,
  () => {
    imageFailed.value = false
  },
)
</script>

<template>
  <span class="user-avatar" :style="avatarStyle">
    <img v-if="showImage" :src="src" alt="" @error="imageFailed = true" />
    <span v-else class="user-avatar__text">{{ text }}</span>
  </span>
</template>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  line-height: 1;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.user-avatar__text {
  color: #fff;
}
</style>
