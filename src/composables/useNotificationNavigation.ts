import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { getPictureById } from '../api/picture'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import type { NotificationVO } from '../types/notification'

export function useNotificationNavigation() {
  const router = useRouter()
  const auth = useAuthStore()
  const notificationStore = useNotificationStore()
  const { unreadCount } = storeToRefs(notificationStore)

  async function handleNotificationClick(item: NotificationVO, options?: { closePopover?: () => void }) {
    if (item.isRead === 0) {
      try {
        await notificationStore.markRead(item.id)
        item.isRead = 1
      } catch {
        // 导航仍继续
      }
    }

    options?.closePopover?.()

    if (item.type === 'FOLLOW' && item.sender?.id) {
      if (auth.user?.id === item.sender.id) {
        await router.push('/profile')
      } else {
        await router.push(`/user/${item.sender.id}`)
      }
      return
    }

    if ((item.type === 'COMMENT' || item.type === 'REPLY' || item.type === 'LIKE') && item.pictureId) {
      try {
        const response = await getPictureById(item.pictureId)
        const picture = response.data.data
        if (picture?.spaceId != null) {
          await router.push({
            path: `/spaces/${picture.spaceId}`,
            query: { pictureId: String(item.pictureId) },
          })
          return
        }
      } catch {
        // 回退到公开图库深链
      }
      await router.push({ path: '/', query: { pictureId: String(item.pictureId) } })
      return
    }

    if (item.type === 'SPACE_INVITE') {
      await router.push('/spaces/invites')
    }
  }

  return {
    unreadCount,
    handleNotificationClick,
  }
}
