<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { NotificationsOutline } from '@vicons/ionicons5'
import { getNotificationPage } from '../api/notification'
import UserAvatar from './UserAvatar.vue'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useNotificationNavigation } from '../composables/useNotificationNavigation'
import type { NotificationVO } from '../types/notification'
import {
  formatNotificationTime,
  getNotificationAvatarText,
  getNotificationSenderName,
  getNotificationTypeLabel,
  isNotificationUnread,
} from '../utils/notification'

const POLL_INTERVAL_MS = 30_000

const auth = useAuthStore()
const notificationStore = useNotificationStore()
const { unreadCount, handleNotificationClick } = useNotificationNavigation()
const router = useRouter()
const message = useMessage()

const popoverShow = ref(false)
const loading = ref(false)
const markingAll = ref(false)
const items = ref<NotificationVO[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

async function refreshUnread() {
  if (!auth.isAuthenticated) {
    notificationStore.clearUnreadCount()
    return
  }
  try {
    await notificationStore.fetchUnreadCount()
  } catch {
    // 轮询失败时静默，避免打扰
  }
}

async function loadRecent() {
  if (!auth.isAuthenticated) return
  loading.value = true
  try {
    const response = await getNotificationPage({ current: 1, pageSize: 8 })
    items.value = response.data.data?.records ?? []
    await refreshUnread()
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '通知加载失败'
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

function startPolling() {
  stopPolling()
  void refreshUnread()
  pollTimer = setInterval(() => {
    void refreshUnread()
  }, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function onPopoverUpdate(show: boolean) {
  popoverShow.value = show
  if (show) {
    await loadRecent()
  }
}

async function handleMarkAll() {
  if (markingAll.value || unreadCount.value <= 0) return
  markingAll.value = true
  try {
    await notificationStore.markAllRead()
    items.value = items.value.map((item) => ({ ...item, isRead: 1 }))
    message.success('已全部标为已读')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '操作失败'
    message.error(errorMessage)
  } finally {
    markingAll.value = false
  }
}

async function onItemClick(item: NotificationVO) {
  await handleNotificationClick(item, {
    closePopover: () => {
      popoverShow.value = false
    },
  })
}

async function goAll() {
  popoverShow.value = false
  await router.push('/notifications')
}

watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      startPolling()
    } else {
      stopPolling()
      notificationStore.clearUnreadCount()
      items.value = []
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <n-popover
    :show="popoverShow"
    trigger="click"
    placement="bottom-end"
    :width="360"
    @update:show="onPopoverUpdate"
  >
    <template #trigger>
      <button class="bell-trigger" type="button" aria-label="通知">
        <n-badge :value="unreadCount" :max="99" :show-zero="false">
          <n-icon :component="NotificationsOutline" :size="22" />
        </n-badge>
      </button>
    </template>

    <div class="notif-panel">
      <div class="notif-panel__header">
        <span class="notif-panel__title">通知</span>
        <n-button
          text
          type="primary"
          size="small"
          :loading="markingAll"
          :disabled="unreadCount <= 0"
          @click="handleMarkAll"
        >
          全部已读
        </n-button>
      </div>

      <n-spin :show="loading">
        <div v-if="items.length === 0" class="notif-panel__empty">暂无通知</div>
        <ul v-else class="notif-list">
          <li
            v-for="item in items"
            :key="item.id"
            class="notif-item"
            :class="{ 'notif-item--unread': isNotificationUnread(item) }"
            @click="onItemClick(item)"
          >
            <UserAvatar
              :size="36"
              :src="item.sender?.userAvatar || ''"
              :text="getNotificationAvatarText(item)"
            />
            <div class="notif-item__body">
              <p class="notif-item__text">
                <strong>{{ getNotificationSenderName(item) }}</strong>
                {{ getNotificationTypeLabel(item.type) }}
              </p>
              <p v-if="item.content" class="notif-item__content">{{ item.content }}</p>
              <p class="notif-item__time">{{ formatNotificationTime(item.createTime) }}</p>
            </div>
          </li>
        </ul>
      </n-spin>

      <div class="notif-panel__footer">
        <n-button text type="primary" block @click="goAll">查看全部</n-button>
      </div>
    </div>
  </n-popover>
</template>

<style scoped>
.bell-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #374151;
  cursor: pointer;
}

.bell-trigger:hover {
  background: #f3f4f6;
  color: #2563eb;
}

.notif-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.notif-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.notif-panel__empty {
  padding: 24px 0;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

.notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 360px;
  overflow-y: auto;
}

.notif-item {
  display: flex;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.notif-item:hover {
  background: #f9fafb;
}

.notif-item--unread {
  background: #eff6ff;
}

.notif-item__body {
  min-width: 0;
  flex: 1;
}

.notif-item__text {
  margin: 0;
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
}

.notif-item__content {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notif-item__time {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

.notif-panel__footer {
  margin-top: 8px;
  border-top: 1px solid #f3f4f6;
  padding-top: 4px;
}
</style>
