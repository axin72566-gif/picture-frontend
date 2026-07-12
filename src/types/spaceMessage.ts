import type { UserVO } from './user'

export interface SpaceMessageReplyToVO {
  id: number
  content: string | null
  deleted: boolean
  sender: UserVO | null
}

export interface SpaceMessageVO {
  id: number
  spaceId: number
  content: string
  createTime: string
  sender: UserVO | null
  replyTo: SpaceMessageReplyToVO | null
}

export interface SpaceMessageAddRequest {
  content: string
  replyToId?: number | null
}

export type SpaceChatEventType = 'MESSAGE_NEW' | 'MESSAGE_DELETED'

export interface SpaceChatEvent {
  type: SpaceChatEventType
  message?: SpaceMessageVO | null
  spaceId?: number | null
  messageId?: number | null
}
