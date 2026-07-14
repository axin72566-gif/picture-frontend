import type { UserVO } from './user'

export interface SensitiveWordVO {
  id: number
  word: string
  enabled: number
  createTime: string
  updateTime: string
}

export interface SensitiveWordAddRequest {
  word: string
}

export interface SensitiveWordUpdateRequest {
  word?: string
  enabled?: number
}

export interface ChatModerationLogVO {
  id: number
  conversationId: number
  senderId: number
  sender: UserVO | null
  messageType: string
  originalContent: string | null
  hitWords: string
  action: string
  createTime: string
}
