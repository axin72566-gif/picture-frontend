import type { UserVO } from './user'

export type ChatMessageType = 'TEXT' | 'IMAGE' | string

export interface ChatMessageReplyToVO {
  id: number
  messageType?: ChatMessageType | null
  content: string | null
  deleted: boolean
  sender: UserVO | null
}

export interface ChatMessageVO {
  id: number
  conversationId: number
  messageType?: ChatMessageType | null
  content: string
  mediaUrl?: string | null
  mediaWidth?: number | null
  mediaHeight?: number | null
  mediaSize?: number | null
  mediaContentType?: string | null
  createTime: string
  sender: UserVO | null
  replyTo: ChatMessageReplyToVO | null
  mentions?: UserVO[] | null
}

export interface ConversationVO {
  id: number
  type: 'SPACE' | 'DM' | string
  spaceId: number | null
  spaceName: string | null
  peer?: UserVO | null
  title?: string | null
  unreadCount: number
  lastMessage: ChatMessageVO | null
  updateTime: string
}

export interface ChatMessageAddRequest {
  content: string
  replyToId?: number | null
  clientMsgId?: string | null
  mentionUserIds?: number[] | null
}

export interface ChatReadRequest {
  lastReadMessageId: number
}

export type ChatEventType =
  | 'MESSAGE_NEW'
  | 'MESSAGE_DELETED'
  | 'CONVERSATION_UPDATED'
  | 'CONVERSATION_REMOVED'

export interface ChatEvent {
  type: ChatEventType
  conversationId: number
  message?: ChatMessageVO | null
  messageId?: number | null
  unreadCount?: number | null
  lastMessage?: ChatMessageVO | null
}
