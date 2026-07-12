import type { NotificationType, NotificationVO } from '../types/notification'

const TYPE_LABELS: Record<NotificationType, string> = {
  FOLLOW: '关注了你',
  COMMENT: '评论了你的图片',
  REPLY: '回复了你的评论',
  LIKE: '赞了你的图片',
}

export function getNotificationTypeLabel(type: NotificationType) {
  return TYPE_LABELS[type] || '发来一条通知'
}

export function getNotificationSenderName(item: NotificationVO) {
  return item.sender?.userName || item.sender?.userAccount || '用户'
}

export function getNotificationAvatarText(item: NotificationVO) {
  return getNotificationSenderName(item).slice(0, 1).toUpperCase()
}

export function formatNotificationTime(value?: string | null) {
  if (!value) return '-'
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

export function isNotificationUnread(item: NotificationVO) {
  return item.isRead === 0
}
