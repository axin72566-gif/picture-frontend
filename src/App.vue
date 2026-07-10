<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'

const route = useRoute()
const showHeader = computed(() => !route.meta.guestLayout)

const themeOverrides = {
  common: {
    primaryColor: '#2563eb',
    primaryColorHover: '#1d4ed8',
    primaryColorPressed: '#1e40af',
    infoColor: '#0891b2',
    successColor: '#16a34a',
    warningColor: '#d97706',
    errorColor: '#dc2626',
    borderRadius: '8px',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
  },
  Button: {
    borderRadiusMedium: '6px',
    borderRadiusLarge: '8px',
  },
  Card: {
    borderRadius: '8px',
  },
}
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider placement="top">
      <n-dialog-provider>
        <n-global-style />
        <div class="app-shell" :class="{ 'app-shell--guest': route.meta.guestLayout }">
          <AppHeader v-if="showHeader" />
          <main class="app-main">
            <router-view />
          </main>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  min-width: 320px;
  min-height: 100%;
  margin: 0;
}

body {
  background: #f6f7fb;
  color: #111827;
}

button,
input,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.06), rgba(37, 99, 235, 0) 240px),
    #f6f7fb;
}

.app-shell--guest {
  background: #f3f5f9;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-width {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
}
</style>
