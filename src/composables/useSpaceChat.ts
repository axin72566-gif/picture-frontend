import { Client } from '@stomp/stompjs'
import { useAuthStore } from '../stores/authStore'
import type { SpaceChatEvent, SpaceMessageVO } from '../types/spaceMessage'
import { buildSpaceChatWsUrl } from '../utils/spaceChat'

export interface UseSpaceChatOptions {
  onMessageNew: (message: SpaceMessageVO) => void
  onMessageDeleted: (messageId: number, spaceId?: number | null) => void
  onError?: (message: string) => void
}

/**
 * 空间群聊 STOMP：连接 /ws?token=，订阅 /topic/space.{id}
 */
export function useSpaceChat(options: UseSpaceChatOptions) {
  const auth = useAuthStore()
  let client: Client | null = null
  let subscribedSpaceId: number | null = null
  let errorNotified = false

  function disconnect() {
    if (client) {
      try {
        client.deactivate()
      } catch {
        // ignore
      }
      client = null
    }
    subscribedSpaceId = null
    errorNotified = false
  }

  function notifyError(text: string) {
    if (errorNotified) return
    errorNotified = true
    options.onError?.(text)
  }

  function connect(spaceId: number) {
    disconnect()

    const token = auth.token
    if (!token || !spaceId) {
      return
    }

    subscribedSpaceId = spaceId
    const nextClient = new Client({
      brokerURL: buildSpaceChatWsUrl(token),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        errorNotified = false
        nextClient.subscribe(`/topic/space.${spaceId}`, (frame) => {
          if (!frame.body) return
          try {
            const event = JSON.parse(frame.body) as SpaceChatEvent
            if (event.type === 'MESSAGE_NEW' && event.message) {
              options.onMessageNew(event.message)
              return
            }
            if (event.type === 'MESSAGE_DELETED' && event.messageId != null) {
              options.onMessageDeleted(event.messageId, event.spaceId)
            }
          } catch {
            // ignore malformed payload
          }
        })
      },
      onStompError: () => {
        notifyError('群聊实时连接异常，仍可通过刷新获取消息')
      },
      onWebSocketError: () => {
        notifyError('群聊实时连接失败，仍可通过刷新获取消息')
      },
    })

    client = nextClient
    nextClient.activate()
  }

  function reconnectIfNeeded(spaceId: number) {
    if (!auth.token) {
      disconnect()
      return
    }
    if (subscribedSpaceId === spaceId && client?.active) {
      return
    }
    connect(spaceId)
  }

  return {
    connect,
    disconnect,
    reconnectIfNeeded,
  }
}
