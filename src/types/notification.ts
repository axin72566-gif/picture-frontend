import type { UserVO } from './user'

export type NotificationType =
  | 'FOLLOW'
  | 'COMMENT'
  | 'REPLY'
  | 'LIKE'
  | 'SPACE_INVITE'
  | 'CHAT_MENTION'

export interface NotificationVO {
  id: number
  type: NotificationType
  pictureId: number | null
  commentId: number | null
  spaceId: number | null
  conversationId?: number | null
  content: string | null
  isRead: number
  createTime: string
  sender: UserVO | null
}

export interface NotificationPageRequest {
  current?: number
  pageSize?: number
}
