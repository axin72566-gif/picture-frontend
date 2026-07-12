import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as notificationApi from '../api/notification'

export const useNotificationStore = defineStore('notification', () => {
  const unreadCount = ref(0)

  async function fetchUnreadCount() {
    const response = await notificationApi.getUnreadNotificationCount()
    unreadCount.value = response.data.data ?? 0
    return unreadCount.value
  }

  function clearUnreadCount() {
    unreadCount.value = 0
  }

  async function markRead(id: number) {
    await notificationApi.markNotificationRead(id)
    await fetchUnreadCount()
  }

  async function markAllRead() {
    await notificationApi.markAllNotificationsRead()
    unreadCount.value = 0
  }

  return {
    unreadCount,
    fetchUnreadCount,
    clearUnreadCount,
    markRead,
    markAllRead,
  }
})
