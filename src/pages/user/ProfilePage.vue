<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  CalendarOutline,
  LogOutOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import { useAuthStore } from '../../stores/authStore'

const auth = useAuthStore()
const router = useRouter()
const message = useMessage()
const refreshing = ref(false)
const loggingOut = ref(false)

const avatarText = computed(() => auth.displayName.slice(0, 1).toUpperCase())
const createdAt = computed(() => formatDate(auth.user?.createTime))
const updatedAt = computed(() => formatDate(auth.user?.updateTime))
const profileText = computed(() => auth.user?.userProfile || '暂无个人简介')

function formatDate(value?: string) {
  if (!value) return '暂无'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function refreshCurrentUser() {
  refreshing.value = true
  try {
    await auth.fetchCurrentUser()
    message.success('用户信息已刷新')
  } finally {
    refreshing.value = false
  }
}

async function handleLogout() {
  loggingOut.value = true
  try {
    await auth.logout()
    message.success('已退出登录')
    await router.push('/login')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="profile-page">
    <section class="page-width profile-layout">
      <div class="profile-main">
        <div class="profile-header">
          <n-avatar round :size="88" :src="auth.avatarUrl || undefined" color="#2563eb">
            <span class="avatar-text">{{ avatarText }}</span>
          </n-avatar>
          <div>
            <h1>{{ auth.displayName }}</h1>
            <p>{{ auth.user?.userAccount }}</p>
          </div>
        </div>

        <n-descriptions :column="1" bordered label-placement="left" size="medium">
          <n-descriptions-item label="用户 ID">
            {{ auth.user?.id }}
          </n-descriptions-item>
          <n-descriptions-item label="账号">
            {{ auth.user?.userAccount }}
          </n-descriptions-item>
          <n-descriptions-item label="昵称">
            {{ auth.user?.userName || '暂无' }}
          </n-descriptions-item>
          <n-descriptions-item label="角色">
            <n-tag :type="auth.user?.userRole === 'admin' ? 'warning' : 'info'" size="small">
              {{ auth.roleLabel }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="个人简介">
            {{ profileText }}
          </n-descriptions-item>
          <n-descriptions-item label="创建时间">
            {{ createdAt }}
          </n-descriptions-item>
          <n-descriptions-item label="更新时间">
            {{ updatedAt }}
          </n-descriptions-item>
        </n-descriptions>
      </div>

      <aside class="profile-side">
        <div class="side-item">
          <n-icon :component="CalendarOutline" />
          <div>
            <span>加入时间</span>
            <strong>{{ createdAt }}</strong>
          </div>
        </div>
        <div class="side-actions">
          <n-button block :loading="refreshing" @click="refreshCurrentUser">
            <template #icon>
              <n-icon :component="RefreshOutline" />
            </template>
            刷新资料
          </n-button>
          <n-button block type="error" ghost :loading="loggingOut" @click="handleLogout">
            <template #icon>
              <n-icon :component="LogOutOutline" />
            </template>
            退出登录
          </n-button>
        </div>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.profile-page {
  flex: 1;
  padding: 32px 0 48px;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
}

.profile-main,
.profile-side {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.profile-main {
  padding: 28px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 26px;
}

.avatar-text {
  color: #fff;
  font-size: 32px;
  font-weight: 700;
}

h1,
p {
  margin: 0;
}

h1 {
  color: #111827;
  font-size: 28px;
  line-height: 1.2;
}

.profile-header p {
  margin-top: 8px;
  color: #6b7280;
}

.profile-side {
  height: fit-content;
  padding: 20px;
}

.side-item {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 12px;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #eef2f7;
}

.side-item .n-icon {
  width: 42px;
  height: 42px;
  padding: 10px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
}

.side-item span {
  display: block;
  margin-bottom: 4px;
  color: #6b7280;
  font-size: 13px;
}

.side-item strong {
  display: block;
  color: #111827;
  font-size: 15px;
  word-break: break-word;
}

.side-actions {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .profile-main {
    padding: 20px;
  }

  .profile-header {
    align-items: flex-start;
    flex-direction: column;
  }

  :deep(.n-descriptions-table) {
    table-layout: fixed;
  }
}
</style>
