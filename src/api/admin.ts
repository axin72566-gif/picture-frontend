import request from './request'
import type {
  ChatModerationLogVO,
  SensitiveWordAddRequest,
  SensitiveWordUpdateRequest,
  SensitiveWordVO,
} from '../types/admin'
import type { BaseResponse, PageResponse } from '../types/user'

function cleanParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

export function getSensitiveWords(params: { current?: number; pageSize?: number } = {}) {
  return request.get<BaseResponse<PageResponse<SensitiveWordVO>>>('/api/admin/sensitive-words', {
    params: cleanParams(params),
  })
}

export function addSensitiveWord(data: SensitiveWordAddRequest) {
  return request.post<BaseResponse<SensitiveWordVO>>('/api/admin/sensitive-words', data)
}

export function updateSensitiveWord(id: number, data: SensitiveWordUpdateRequest) {
  return request.put<BaseResponse<SensitiveWordVO>>(`/api/admin/sensitive-words/${id}`, data)
}

export function deleteSensitiveWord(id: number) {
  return request.delete<BaseResponse<null>>(`/api/admin/sensitive-words/${id}`)
}

export function getModerationLogs(params: {
  current?: number
  pageSize?: number
  conversationId?: number
  senderId?: number
} = {}) {
  return request.get<BaseResponse<PageResponse<ChatModerationLogVO>>>('/api/admin/chat/moderation-logs', {
    params: cleanParams(params),
  })
}
