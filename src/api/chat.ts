import request from './request'
import type {
  ChatMessageAddRequest,
  ChatMessageVO,
  ChatReadRequest,
  ConversationVO,
} from '../types/chat'
import type { BaseResponse, PageResponse } from '../types/user'

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

export function deleteChatMessage(conversationId: number, messageId: number) {
  return request.delete<BaseResponse<null>>(`/api/chat/conversations/${conversationId}/messages/${messageId}`)
}

export function markConversationRead(conversationId: number, data: ChatReadRequest) {
  return request.put<BaseResponse<null>>(`/api/chat/conversations/${conversationId}/read`, data)
}
