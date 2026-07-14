import request from './request'
import type {
  ChatMessageAddRequest,
  ChatMessageVO,
  ChatReadRequest,
  ConversationVO,
} from '../types/chat'
import type { BaseResponse, PageResponse, UserVO } from '../types/user'

function cleanParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

export function getConversations(params: { current?: number; pageSize?: number } = {}) {
  return request.get<BaseResponse<PageResponse<ConversationVO>>>('/api/chat/conversations', {
    params: cleanParams(params),
  })
}

export function getConversationBySpace(spaceId: number) {
  return request.get<BaseResponse<ConversationVO>>(`/api/chat/conversations/by-space/${spaceId}`)
}

export function openDmConversation(data: { peerUserId: number }) {
  return request.post<BaseResponse<ConversationVO>>('/api/chat/conversations/dm', data)
}

export function getConversationMembers(conversationId: number) {
  return request.get<BaseResponse<UserVO[]>>(`/api/chat/conversations/${conversationId}/members`)
}

export function getConversationMessages(
  conversationId: number,
  params: { current?: number; pageSize?: number; sinceId?: number; limit?: number } = {},
) {
  return request.get<BaseResponse<PageResponse<ChatMessageVO> | ChatMessageVO[]>>(
    `/api/chat/conversations/${conversationId}/messages`,
    { params: cleanParams(params) },
  )
}

export function sendChatMessage(conversationId: number, data: ChatMessageAddRequest) {
  return request.post<BaseResponse<ChatMessageVO>>(`/api/chat/conversations/${conversationId}/messages`, data)
}

export function sendChatImageMessage(
  conversationId: number,
  data: {
    file: File
    caption?: string
    replyToId?: number | null
    clientMsgId?: string | null
    mentionUserIds?: number[] | null
  },
) {
  const form = new FormData()
  form.append('file', data.file)
  if (data.caption) form.append('caption', data.caption)
  if (data.replyToId != null) form.append('replyToId', String(data.replyToId))
  if (data.clientMsgId) form.append('clientMsgId', data.clientMsgId)
  if (data.mentionUserIds?.length) {
    for (const id of data.mentionUserIds) {
      form.append('mentionUserIds', String(id))
    }
  }
  return request.post<BaseResponse<ChatMessageVO>>(
    `/api/chat/conversations/${conversationId}/messages/image`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    },
  )
}

export function deleteChatMessage(conversationId: number, messageId: number) {
  return request.delete<BaseResponse<null>>(`/api/chat/conversations/${conversationId}/messages/${messageId}`)
}

export function markConversationRead(conversationId: number, data: ChatReadRequest) {
  return request.put<BaseResponse<null>>(`/api/chat/conversations/${conversationId}/read`, data)
}
