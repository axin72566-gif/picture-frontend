import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  deleteChatMessage,
  getConversationBySpace,
  getConversationMessages,
  getConversations,
  markConversationRead,
  openDmConversation,
  sendChatImageMessage,
  sendChatMessage,
} from '../api/chat'
import type { ChatEvent, ChatMessageVO, ConversationVO } from '../types/chat'
import { useAuthStore } from './authStore'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<ConversationVO[]>([])
  const messagesByConversationId = ref<Record<number, ChatMessageVO[]>>({})
  const activeConversationId = ref<number | null>(null)
  const loadingConversations = ref(false)
  const loadingMessages = ref(false)

  const unreadTotal = computed(() =>
    conversations.value.reduce((sum, item) => sum + (item.unreadCount || 0), 0),
  )

  function reset() {
    conversations.value = []
    messagesByConversationId.value = {}
    activeConversationId.value = null
  }

  function upsertMessage(conversationId: number, message: ChatMessageVO) {
    const list = messagesByConversationId.value[conversationId] || []
    const index = list.findIndex((item) => item.id === message.id)
    if (index >= 0) {
      list[index] = message
      messagesByConversationId.value = { ...messagesByConversationId.value, [conversationId]: [...list] }
      return
    }
    messagesByConversationId.value = {
      ...messagesByConversationId.value,
      [conversationId]: [...list, message],
    }
  }

  function removeMessage(conversationId: number, messageId: number) {
    const list = messagesByConversationId.value[conversationId] || []
    messagesByConversationId.value = {
      ...messagesByConversationId.value,
      [conversationId]: list.filter((item) => item.id !== messageId),
    }
  }

  function patchConversation(partial: Partial<ConversationVO> & { id: number }) {
    const index = conversations.value.findIndex((item) => item.id === partial.id)
    if (index < 0) {
      void fetchConversations()
      return
    }
    const next = { ...conversations.value[index], ...partial }
    const copy = [...conversations.value]
    copy[index] = next
    conversations.value = copy
  }

  function handleEvent(event: ChatEvent) {
    if (!event?.conversationId) return
    const auth = useAuthStore()
    const myId = auth.user?.id

    if (event.type === 'MESSAGE_NEW' && event.message) {
      upsertMessage(event.conversationId, event.message)
      const isActive = activeConversationId.value === event.conversationId
      const isMine = event.message.sender?.id === myId
      const existing = conversations.value.find((item) => item.id === event.conversationId)
      const unread = isActive || isMine
        ? existing?.unreadCount ?? 0
        : (existing?.unreadCount ?? 0) + 1
      patchConversation({
        id: event.conversationId,
        lastMessage: event.message,
        unreadCount: unread,
        updateTime: event.message.createTime,
      })
      if (isActive && event.message.id) {
        void markRead(event.conversationId, event.message.id)
      }
      return
    }

    if (event.type === 'MESSAGE_DELETED' && event.messageId != null) {
      removeMessage(event.conversationId, event.messageId)
      return
    }

    if (event.type === 'CONVERSATION_UPDATED') {
      patchConversation({
        id: event.conversationId,
        unreadCount: event.unreadCount ?? 0,
        lastMessage: event.lastMessage ?? undefined,
      })
      return
    }

    if (event.type === 'CONVERSATION_REMOVED') {
      conversations.value = conversations.value.filter((item) => item.id !== event.conversationId)
      delete messagesByConversationId.value[event.conversationId]
      if (activeConversationId.value === event.conversationId) {
        activeConversationId.value = null
      }
    }
  }

  async function fetchConversations() {
    loadingConversations.value = true
    try {
      const response = await getConversations({ current: 1, pageSize: 50 })
      const page = response.data.data
      conversations.value = page?.records || []
    } finally {
      loadingConversations.value = false
    }
  }

  async function resolveSpaceConversation(spaceId: number) {
    const response = await getConversationBySpace(spaceId)
    const vo = response.data.data
    if (!vo) {
      throw new Error(response.data.message || '会话不存在')
    }
    const index = conversations.value.findIndex((item) => item.id === vo.id)
    if (index >= 0) {
      conversations.value[index] = vo
      conversations.value = [...conversations.value]
    } else {
      conversations.value = [vo, ...conversations.value]
    }
    return vo
  }

  async function openDm(peerUserId: number) {
    const response = await openDmConversation({ peerUserId })
    const vo = response.data.data
    if (!vo) {
      throw new Error(response.data.message || '打开私聊失败')
    }
    const index = conversations.value.findIndex((item) => item.id === vo.id)
    if (index >= 0) {
      conversations.value[index] = vo
      conversations.value = [...conversations.value]
    } else {
      conversations.value = [vo, ...conversations.value]
    }
    return vo
  }

  async function fetchMessages(conversationId: number, reset = true) {
    loadingMessages.value = true
    try {
      const response = await getConversationMessages(conversationId, { current: 1, pageSize: 20 })
      const page = response.data.data as { records: ChatMessageVO[]; total: number }
      if (!page?.records) {
        throw new Error('消息加载失败')
      }
      const chronological = [...page.records].reverse()
      if (reset) {
        messagesByConversationId.value = {
          ...messagesByConversationId.value,
          [conversationId]: chronological,
        }
      }
      return { list: chronological, total: page.total }
    } finally {
      loadingMessages.value = false
    }
  }

  async function loadEarlier(conversationId: number, currentPage: number, pageSize = 20) {
    const response = await getConversationMessages(conversationId, {
      current: currentPage,
      pageSize,
    })
    const page = response.data.data as { records: ChatMessageVO[]; total: number }
    if (!page?.records) {
      throw new Error('消息加载失败')
    }
    const older = [...page.records].reverse()
    const existing = messagesByConversationId.value[conversationId] || []
    const ids = new Set(existing.map((item) => item.id))
    const toPrepend = older.filter((item) => !ids.has(item.id))
    messagesByConversationId.value = {
      ...messagesByConversationId.value,
      [conversationId]: [...toPrepend, ...existing],
    }
    return page.total
  }

  async function syncSince(conversationId: number, sinceId: number) {
    const response = await getConversationMessages(conversationId, { sinceId, limit: 100 })
    const list = response.data.data
    if (!Array.isArray(list)) return
    for (const message of list) {
      upsertMessage(conversationId, message)
    }
  }

  async function syncActiveConversation() {
    const id = activeConversationId.value
    if (!id) return
    const list = messagesByConversationId.value[id] || []
    const maxId = list.reduce((max, item) => Math.max(max, item.id), 0)
    if (maxId > 0) {
      await syncSince(id, maxId)
    }
  }

  async function sendMessage(
    conversationId: number,
    content: string,
    replyToId?: number | null,
    clientMsgId?: string,
    mentionUserIds?: number[] | null,
  ) {
    const response = await sendChatMessage(conversationId, {
      content,
      replyToId: replyToId ?? null,
      clientMsgId: clientMsgId ?? crypto.randomUUID(),
      mentionUserIds: mentionUserIds?.length ? mentionUserIds : null,
    })
    const created = response.data.data
    if (!created) {
      throw new Error(response.data.message || '发送失败')
    }
    upsertMessage(conversationId, created)
    patchConversation({
      id: conversationId,
      lastMessage: created,
      updateTime: created.createTime,
    })
    return created
  }

  async function sendImage(
    conversationId: number,
    file: File,
    options?: {
      caption?: string
      replyToId?: number | null
      mentionUserIds?: number[] | null
      clientMsgId?: string
    },
  ) {
    const response = await sendChatImageMessage(conversationId, {
      file,
      caption: options?.caption,
      replyToId: options?.replyToId ?? null,
      clientMsgId: options?.clientMsgId ?? crypto.randomUUID(),
      mentionUserIds: options?.mentionUserIds?.length ? options.mentionUserIds : null,
    })
    const created = response.data.data
    if (!created) {
      throw new Error(response.data.message || '发送图片失败')
    }
    upsertMessage(conversationId, created)
    patchConversation({
      id: conversationId,
      lastMessage: created,
      updateTime: created.createTime,
    })
    return created
  }

  async function deleteMessage(conversationId: number, messageId: number) {
    await deleteChatMessage(conversationId, messageId)
    removeMessage(conversationId, messageId)
  }

  async function markRead(conversationId: number, lastReadMessageId: number) {
    await markConversationRead(conversationId, { lastReadMessageId })
    patchConversation({ id: conversationId, unreadCount: 0 })
  }

  function setActiveConversation(conversationId: number | null) {
    activeConversationId.value = conversationId
  }

  return {
    conversations,
    messagesByConversationId,
    activeConversationId,
    loadingConversations,
    loadingMessages,
    unreadTotal,
    reset,
    handleEvent,
    fetchConversations,
    resolveSpaceConversation,
    openDm,
    fetchMessages,
    loadEarlier,
    syncSince,
    syncActiveConversation,
    sendMessage,
    sendImage,
    deleteMessage,
    markRead,
    setActiveConversation,
  }
})
