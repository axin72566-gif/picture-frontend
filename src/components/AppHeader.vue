<script setup lang="ts">
import { computed, h, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, useMessage } from 'naive-ui'
import {
  CameraOutline,
  CloudUploadOutline,
  ImagesOutline,
  LogInOutline,
  LogOutOutline,
  NotificationsOutline,
  PeopleOutline,
  PersonAddOutline,
  PersonCircleOutline,
} from '@vicons/ionicons5'
import { useAuthStore } from '../stores/authStore'
import UserAvatar from './UserAvatar.vue'
import NotificationBell from './NotificationBell.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const message = useMessage()

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = computed(() => [
  {
    label: '上传图片',
    key: 'upload',
    icon: renderIcon(CloudUploadOutline),
  },
  {
    label: '我的空间',
    key: 'spaces',
    icon: renderIcon(PeopleOutline),
  },
  {
    label: '消息通知',
    key: 'notifications',
    icon: renderIcon(NotificationsOutline),
  },
  {
    label: '个人资料',
    key: 'profile',
    icon: renderIcon(PersonCircleOutline),
  },
  {
    type: 'divider' as const,
    key: 'divider',
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon(LogOutOutline),
  },
])

const avatarText = computed(() => auth.displayName.slice(0, 1).toUpperCase())

function isActive(paths: string[]) {
  return paths.includes(route.path)
}

async function goProtected(path: string) {
  if (!auth.isAuthenticated) {
    await router.push({ path: '/login', query: { redirect: path } })
    return
  }
  await router.push(path)
}

async function handleMenuSelect(key: string | number) {
  if (key === 'upload') {
    await router.push('/upload')
    return
  }

  if (key === 'spaces') {
    await router.push('/spaces')
    return
  }

  if (key === 'notifications') {
    await router.push('/notifications')
    return
  }

  if (key === 'profile') {
    await router.push('/profile')
    return
  }

  if (key === 'logout') {
    await auth.logout()
    message.success('已退出登录')
    await router.push('/login')
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <button class="brand-button" type="button" @click="router.push('/')">
        <span class="brand-mark">
          <n-icon :component="CameraOutline" />
        </span>
        <span class="brand-name">PictureHub</span>
      </button>

      <nav class="header-nav" aria-label="主导航">
        <n-button
          quaternary
          class="nav-button"
          :class="{ 'nav-button--active': isActive(['/']) }"
          @click="router.push('/')"
        >
          <template #icon>
            <n-icon :component="ImagesOutline" />
          </template>
          公共图库
        </n-button>
        <n-button
          quaternary
          class="nav-button"
          :class="{ 'nav-button--active': isActive(['/upload']) }"
          @click="goProtected('/upload')"
        >
          <template #icon>
            <n-icon :component="CloudUploadOutline" />
          </template>
          上传
        </n-button>
        <n-button
          quaternary
          class="nav-button"
          :class="{ 'nav-button--active': isActive(['/spaces']) || route.path.startsWith('/spaces/') }"
          @click="goProtected('/spaces')"
        >
          <template #icon>
            <n-icon :component="PeopleOutline" />
          </template>
          空间
        </n-button>
      </nav>

      <div v-if="auth.isAuthenticated" class="header-actions">
        <NotificationBell />
        <n-dropdown trigger="click" :options="menuOptions" @select="handleMenuSelect">
          <button class="user-trigger" type="button">
            <UserAvatar :key="auth.avatarKey" :size="34" :src="auth.avatarDisplayUrl" :text="avatarText" />
            <span class="user-name">{{ auth.displayName }}</span>
          </button>
        </n-dropdown>
      </div>

      <div v-else class="guest-actions">
        <n-button quaternary @click="router.push('/login')">
          <template #icon>
            <n-icon :component="LogInOutline" />
          </template>
          登录
        </n-button>
        <n-button type="primary" @click="router.push('/register')">
          <template #icon>
            <n-icon :component="PersonAddOutline" />
          </template>
          注册
        </n-button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid #e5e7eb;
  backdrop-filter: blur(14px);
}

.header-inner {
  width: min(1120px, calc(100% - 32px));
  height: 64px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
}

.brand-button,
.user-trigger {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.brand-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
}

.brand-mark {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 20px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.header-nav,
.guest-actions,
.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-nav {
  min-width: 0;
}

.header-actions {
  justify-content: flex-end;
  gap: 4px;
}

.guest-actions {
  justify-content: flex-end;
  gap: 8px;
}

.nav-button--active {
  color: #2563eb;
  background: #eff6ff;
}

.user-trigger {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 8px;
}

.user-trigger:hover {
  background: #f3f4f6;
}

.user-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #374151;
}

@media (max-width: 720px) {
  .header-inner {
    grid-template-columns: auto 1fr auto;
    gap: 10px;
  }

  .brand-name,
  .user-name,
  .guest-actions .n-button:first-child {
    display: none;
  }

  .header-nav {
    justify-content: center;
  }

  .nav-button {
    padding: 0 8px;
    font-size: 0;
    width: 40px;
  }

  .nav-button :deep(.n-icon) {
    font-size: 18px;
  }
}

@media (max-width: 420px) {
  .header-inner {
    width: calc(100% - 20px);
  }

  .guest-actions .n-button:last-child {
    padding: 0 10px;
  }
}
</style>
