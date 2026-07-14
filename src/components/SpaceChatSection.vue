<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { ChatbubbleOutline, TrashOutline } from '@vicons/ionicons5'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import type { ChatMessageVO } from '../types/chat'
import { canDeleteSpaceMessage } from '../utils/space'
import UserAvatar from './UserAvatar.vue'

const props = defineProps<{
  conversationId: number
  myRole?: string
}>()

const message = useMessage()
const auth = useAuthStore()
const chatStore = useChatStore()

const submitting = ref(false)
const loadingEarlier = ref(false)
const draft = ref('')
const replyTarget = ref<ChatMessageVO | null>(null)
const deletingId = ref<number | null>(null)
const listRef = ref<HTMLElement | null>(null)
const currentPage = ref(1)
const total = ref(0)
const pageSize = 20

const messages = computed(() => chatStore.messagesByConversationId[props.conversationId] || [])
const hasEarlier = computed(() => messages.value.length < total.value)
const loading = computed(() => chatStore.loadingMessages && messages.value.length === 0)

function formatDate(value: string) {
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

function getSenderName(item: ChatMessageVO) {
  return item.sender?.userName || item.sender?.userAccount || '未知用户'
}

function getSenderAvatarText(item: ChatMessageVO) {
  return getSenderName(item).slice(0, 1).toUpperCase()
}

function getReplySenderName(item: ChatMessageVO) {
  const reply = item.replyTo
  if (!reply) return ''
  return reply.sender?.userName || reply.sender?.userAccount || '未知用户'
}

function isMine(item: ChatMessageVO) {
  return auth.user?.id != null && item.sender?.id === auth.user.id
}

function canDelete(item: ChatMessageVO) {
  return canDeleteSpaceMessage(props.myRole, item.sender?.id, auth.user?.id)
}

async function scrollToBottom() {
  await nextTick()
  const el = listRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

async function markLatestRead() {
  const list = messages.value
  if (!list.length) return
  const maxId = list[list.length - 1]?.id
  if (maxId) {
    try {
      await chatStore.markRead(props.conversationId, maxId)
    } catch {
      // ignore
    }
  }
}

async function bootstrap() {
  chatStore.setActiveConversation(props.conversationId)
  try {
    const { list, total: pageTotal } = await chatStore.fetchMessages(props.conversationId, true)
    total.value = pageTotal
    currentPage.value = 1
    void list
    await scrollToBottom()
    await markLatestRead()
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '消息加载失败'
    message.error(errorMessage)
  }
}

async function loadEarlier() {
  if (!hasEarlier.value || loadingEarlier.value) return
  loadingEarlier.value = true
  const previousHeight = listRef.value?.scrollHeight ?? 0
  try {
    const nextPage = currentPage.value + 1
    const pageTotal = await chatStore.loadEarlier(props.conversationId, nextPage, pageSize)
    total.value = pageTotal
    currentPage.value = nextPage
    await nextTick()
    const el = listRef.value
    if (el) {
      el.scrollTop = el.scrollHeight - previousHeight
    }
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '消息加载失败'
    message.error(errorMessage)
  } finally {
    loadingEarlier.value = false
  }
}

function startReply(item: ChatMessageVO) {
  replyTarget.value = item
}

function cancelReply() {
  replyTarget.value = null
}

async function submitMessage() {
  const content = draft.value.trim()
  if (!content) {
    message.warning('请输入消息内容')
    return
  }
  submitting.value = true
  try {
    await chatStore.sendMessage(props.conversationId, content, replyTarget.value?.id ?? null)
    draft.value = ''
    cancelReply()
    await scrollToBottom()
    await markLatestRead()
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '发送失败'
    message.error(errorMessage)
  } finally {
    submitting.value = false
  }
}

async function handleDelete(item: ChatMessageVO) {
  deletingId.value = item.id
  try {
    await chatStore.deleteMessage(props.conversationId, item.id)
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '删除失败'
    message.error(errorMessage)
  } finally {
    deletingId.value = null
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    const list = messages.value
    const maxId = list.reduce((max, item) => Math.max(max, item.id), 0)
    if (maxId > 0) {
      void chatStore.syncSince(props.conversationId, maxId)
    }
    void markLatestRead()
  }
}

watch(
  () => props.conversationId,
  () => {
    cancelReply()
    draft.value = ''
    total.value = Number.MAX_SAFE_INTEGER
    void bootstrap()
  },
  { immediate: true },
)

watch(
  () => messages.value.length,
  async (len, prev) => {
    if (len > (prev || 0)) {
      await scrollToBottom()
    }
  },
)

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (chatStore.activeConversationId === props.conversationId) {
    chatStore.setActiveConversation(null)
  }
})
</script>

<template>
  <section class="chat-section">
    <div class="chat-header">
      <h3>
        <n-icon :component="ChatbubbleOutline" />
        群聊
      </h3>
    </div>

    <div ref="listRef" class="chat-list-wrap">
      <div v-if="hasEarlier" class="load-earlier-row">
        <n-button quaternary size="tiny" :loading="loadingEarlier" @click="loadEarlier">
          加载更早消息
        </n-button>
      </div>

      <n-spin :show="loading">
        <div v-if="messages.length" class="chat-list">
          <article
            v-for="item in messages"
            :key="item.id"
            class="chat-row"
            :class="isMine(item) ? 'is-mine' : 'is-other'"
          >
            <UserAvatar
              class="chat-avatar"
              :size="36"
              :src="item.sender?.userAvatar || ''"
              :text="getSenderAvatarText(item)"
            />
            <div class="chat-body">
              <div class="chat-meta">
                <span v-if="!isMine(item)" class="chat-author">{{ getSenderName(item) }}</span>
                <span class="chat-time">{{ formatDate(item.createTime) }}</span>
              </div>
              <div class="chat-bubble">
                <div v-if="item.replyTo" class="reply-quote">
                  <template v-if="item.replyTo.deleted">消息已删除</template>
                  <template v-else>
                    <strong>{{ getReplySenderName(item) }}</strong>
                    ：{{ item.replyTo.content }}
                  </template>
                </div>
                <p class="chat-content">{{ item.content }}</p>
              </div>
              <div class="chat-actions">
                <n-button text size="tiny" @click="startReply(item)">回复</n-button>
                <n-popconfirm
                  v-if="canDelete(item)"
                  positive-text="删除"
                  negative-text="取消"
                  @positive-click="handleDelete(item)"
                >
                  <template #trigger>
                    <n-button text size="tiny" type="error" :loading="deletingId === item.id">
                      <template #icon>
                        <n-icon :component="TrashOutline" :size="12" />
                      </template>
                      删除
                    </n-button>
                  </template>
                  确定删除这条消息吗？
                </n-popconfirm>
              </div>
            </div>
          </article>
        </div>
        <div v-else-if="!loading" class="chat-empty">暂无消息，打个招呼吧</div>
      </n-spin>
    </div>

    <div class="chat-composer">
      <div v-if="replyTarget" class="reply-banner">
        <div class="reply-banner-text">
          回复
          <strong>{{ getSenderName(replyTarget) }}</strong>
          ：{{ replyTarget.content }}
        </div>
        <n-button text size="tiny" @click="cancelReply">取消</n-button>
      </div>
      <n-input
        v-model:value="draft"
        type="textarea"
        maxlength="500"
        show-count
        :autosize="{ minRows: 2, maxRows: 4 }"
        :placeholder="replyTarget ? `回复 @${getSenderName(replyTarget)}` : '输入消息…'"
        @keydown.enter.exact.prevent="submitMessage"
      />
      <div class="composer-actions">
        <n-button type="primary" size="small" :loading="submitting" @click="submitMessage">
          发送
        </n-button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chat-section {
  display: grid;
  grid-template-rows: auto minmax(280px, 52vh) auto;
  gap: 12px;
  min-height: 420px;
}

.chat-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #111827;
  font-size: 15px;
  font-weight: 600;
}

.chat-list-wrap {
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  padding: 12px;
}

.load-earlier-row {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.chat-list {
  display: grid;
  gap: 16px;
}

.chat-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 100%;
}

.chat-row.is-other {
  flex-direction: row;
}

.chat-row.is-mine {
  flex-direction: row-reverse;
}

.chat-avatar {
  flex-shrink: 0;
}

.chat-body {
  min-width: 0;
  max-width: min(72%, 420px);
  display: grid;
  gap: 4px;
}

.chat-row.is-mine .chat-body {
  justify-items: end;
}

.chat-row.is-other .chat-body {
  justify-items: start;
}

.chat-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.chat-row.is-mine .chat-meta {
  flex-direction: row-reverse;
}

.chat-author {
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}

.chat-time {
  color: #94a3b8;
  font-size: 11px;
}

.chat-bubble {
  max-width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  display: grid;
  gap: 6px;
}

.chat-row.is-other .chat-bubble {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-top-left-radius: 4px;
}

.chat-row.is-mine .chat-bubble {
  background: #95ec69;
  border-top-right-radius: 4px;
}

.reply-quote {
  padding: 4px 6px;
  border-left: 3px solid rgba(37, 99, 235, 0.45);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.45);
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-row.is-mine .reply-quote {
  border-left-color: rgba(22, 101, 52, 0.35);
  background: rgba(255, 255, 255, 0.35);
}

.reply-quote strong {
  color: #2563eb;
  font-weight: 600;
}

.chat-row.is-mine .reply-quote strong {
  color: #166534;
}

.chat-content {
  margin: 0;
  color: #111827;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.chat-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chat-row.is-mine .chat-actions {
  flex-direction: row-reverse;
}

.chat-empty {
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
  padding: 32px 0;
}

.chat-composer {
  display: grid;
  gap: 8px;
}

.reply-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
}

.reply-banner-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
