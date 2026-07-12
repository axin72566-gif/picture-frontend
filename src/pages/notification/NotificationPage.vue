<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline, NotificationsOutline } from '@vicons/ionicons5'
import { getNotificationPage } from '../../api/notification'
import UserAvatar from '../../components/UserAvatar.vue'
import { useNotificationStore } from '../../stores/notificationStore'
import { useNotificationNavigation } from '../../composables/useNotificationNavigation'
import type { PageResponse } from '../../types/user'
import type { NotificationVO } from '../../types/notification'
import {
  formatNotificationTime,
  getNotificationAvatarText,
  getNotificationSenderName,
  getNotificationTypeLabel,
  isNotificationUnread,
} from '../../utils/notification'

const router = useRouter()
const message = useMessage()
const notificationStore = useNotificationStore()
const { unreadCount, handleNotificationClick } = useNotificationNavigation()

const loading = ref(false)
const markingAll = ref(false)
const query = reactive({
  current: 1,
  pageSize: 10,
})

const pageData = ref<PageResponse<NotificationVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

async function fetchPage() {
  loading.value = true
  try {
    const response = await getNotificationPage({
      current: query.current,
      pageSize: query.pageSize,
    })
    const nextPage = response.data.data
    if (!nextPage) {
      throw new Error(response.data.message || '通知加载失败')
    }
    pageData.value = nextPage
    await notificationStore.fetchUnreadCount()
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '通知加载失败'
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  query.current = page
  void fetchPage()
}

function handlePageSizeChange(pageSize: number) {
  query.pageSize = pageSize
  query.current = 1
  void fetchPage()
}

async function handleMarkAll() {
  if (markingAll.value || unreadCount.value <= 0) return
  markingAll.value = true
  try {
    await notificationStore.markAllRead()
    pageData.value.records = pageData.value.records.map((item) => ({ ...item, isRead: 1 }))
    message.success('已全部标为已读')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '操作失败'
    message.error(errorMessage)
  } finally {
    markingAll.value = false
  }
}

async function onItemClick(item: NotificationVO) {
  await handleNotificationClick(item)
}

onMounted(() => {
  void fetchPage()
})
</script>

<template>
  <div class="notif-page">
    <section class="page-width notif-hero">
      <div class="notif-hero__left">
        <n-button quaternary @click="router.back()">
          <template #icon>
            <n-icon :component="ArrowBackOutline" />
          </template>
          返回
        </n-button>
        <div>
          <h1>
            <n-icon :component="NotificationsOutline" />
            消息通知
          </h1>
          <p class="hero-subtitle">未读 {{ unreadCount }} 条</p>
        </div>
      </div>
      <n-button type="primary" :loading="markingAll" :disabled="unreadCount <= 0" @click="handleMarkAll">
        全部已读
      </n-button>
    </section>

    <section class="page-width notif-body">
      <n-spin :show="loading">
        <div v-if="pageData.records.length === 0" class="notif-empty">暂无通知</div>
        <ul v-else class="notif-list">
          <li
            v-for="item in pageData.records"
            :key="item.id"
            class="notif-item"
            :class="{ 'notif-item--unread': isNotificationUnread(item) }"
            @click="onItemClick(item)"
          >
            <UserAvatar
              :size="44"
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
            <span v-if="isNotificationUnread(item)" class="unread-dot" aria-hidden="true" />
          </li>
        </ul>

        <div v-if="pageData.total > 0" class="notif-pagination">
          <n-pagination
            :page="query.current"
            :page-size="query.pageSize"
            :item-count="pageData.total"
            :page-sizes="[10, 20, 50]"
            show-size-picker
            @update:page="handlePageChange"
            @update:page-size="handlePageSizeChange"
          />
        </div>
      </n-spin>
    </section>
  </div>
</template>

<style scoped>
.notif-page {
  padding: 24px 0 48px;
}

.page-width {
  width: min(800px, calc(100% - 32px));
  margin: 0 auto;
}

.notif-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.notif-hero__left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.notif-hero h1 {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  color: #111827;
}

.hero-subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.notif-body {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 8px;
}

.notif-empty {
  padding: 48px 16px;
  text-align: center;
  color: #9ca3af;
}

.notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 12px;
  border-radius: 10px;
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
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}

.notif-item__content {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
  word-break: break-word;
}

.notif-item__time {
  margin: 6px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

.unread-dot {
  width: 8px;
  height: 8px;
  margin-top: 8px;
  border-radius: 50%;
  background: #2563eb;
  flex-shrink: 0;
}

.notif-pagination {
  display: flex;
  justify-content: center;
  padding: 16px 8px 8px;
}

@media (max-width: 640px) {
  .notif-hero {
    flex-direction: column;
  }
}
</style>
