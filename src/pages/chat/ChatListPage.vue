<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline, ChatbubbleOutline } from '@vicons/ionicons5'
import UserAvatar from '../../components/UserAvatar.vue'
import { useChatStore } from '../../stores/chatStore'
import type { ConversationVO } from '../../types/chat'

const router = useRouter()
const message = useMessage()
const chatStore = useChatStore()

function formatTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function conversationTitle(item: ConversationVO) {
  if (item.title) return item.title
  if (item.type === 'DM') {
    return item.peer?.userName || item.peer?.userAccount || '私聊'
  }
  return item.spaceName || `会话 #${item.id}`
}

function conversationPreview(item: ConversationVO) {
  const last = item.lastMessage
  if (!last) {
    return item.type === 'DM' ? '已创建会话' : '暂无消息'
  }
  if (last.messageType === 'IMAGE') {
    return last.content?.trim() || '[图片]'
  }
  return last.content || '暂无消息'
}

function avatarText(item: ConversationVO) {
  return conversationTitle(item).slice(0, 1).toUpperCase()
}

function openConversation(id: number) {
  void router.push(`/messages/${id}`)
}

onMounted(async () => {
  try {
    await chatStore.fetchConversations()
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '加载会话失败'
    message.error(errorMessage)
  }
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <n-button quaternary @click="router.back()">
        <template #icon>
          <n-icon :component="ArrowBackOutline" />
        </template>
        返回
      </n-button>
      <h1>
        <n-icon :component="ChatbubbleOutline" />
        消息
      </h1>
    </header>

    <n-spin :show="chatStore.loadingConversations">
      <div v-if="chatStore.conversations.length === 0" class="empty">暂无会话</div>
      <ul v-else class="list">
        <li
          v-for="item in chatStore.conversations"
          :key="item.id"
          class="card"
          @click="openConversation(item.id)"
        >
          <UserAvatar
            v-if="item.type === 'DM'"
            :size="42"
            :src="item.peer?.userAvatar || ''"
            :text="avatarText(item)"
          />
          <div class="main">
            <div class="title-row">
              <strong>{{ conversationTitle(item) }}</strong>
              <n-tag size="tiny" :bordered="false" :type="item.type === 'DM' ? 'info' : 'success'">
                {{ item.type === 'DM' ? '私聊' : '群' }}
              </n-tag>
            </div>
            <p class="preview">
              {{ conversationPreview(item) }}
            </p>
          </div>
          <div class="side">
            <span class="time">{{ formatTime(item.lastMessage?.createTime || item.updateTime) }}</span>
            <n-badge v-if="item.unreadCount > 0" :value="item.unreadCount" :max="99" />
          </div>
        </li>
      </ul>
    </n-spin>
  </section>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-header h1 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 20px;
}

.empty {
  color: #94a3b8;
  text-align: center;
  padding: 48px 0;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}

.card:hover {
  border-color: #93c5fd;
}

.main {
  min-width: 0;
  flex: 1;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side {
  display: grid;
  justify-items: end;
  align-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.time {
  color: #94a3b8;
  font-size: 12px;
}
</style>
