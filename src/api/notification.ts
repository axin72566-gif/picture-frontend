import request from './request'
import type { BaseResponse, PageResponse } from '../types/user'
import type { NotificationPageRequest, NotificationVO } from '../types/notification'

export function getNotificationPage(params: NotificationPageRequest = {}) {
  return request.get<BaseResponse<PageResponse<NotificationVO>>>('/api/notification/page', {
    params,
  })
}

export function getUnreadNotificationCount() {
  return request.get<BaseResponse<number>>('/api/notification/unread/count')
}

export function markNotificationRead(id: number) {
  return request.put<BaseResponse<null>>(`/api/notification/${id}/read`)
}

export function markAllNotificationsRead() {
  return request.put<BaseResponse<null>>('/api/notification/read/all')
}
