import { Client } from '@stomp/stompjs'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'
import type { ChatEvent } from '../types/chat'
import { buildSpaceChatWsUrl } from '../utils/spaceChat'

let client: Client | null = null
let started = false

export function useChatSocket() {
  const auth = useAuthStore()
  const chatStore = useChatStore()

  function disconnect() {
    if (client) {
      try {
        client.deactivate()
      } catch {
        // ignore
      }
      client = null
    }
    started = false
  }

  function connect() {
    const token = auth.token
    if (!token) {
      disconnect()
      return
    }
    if (client?.active) {
      return
    }
    disconnect()
    started = true

    const next = new Client({
      brokerURL: buildSpaceChatWsUrl(token),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        next.subscribe('/user/queue/chat', (frame) => {
          if (!frame.body) return
          try {
            const event = JSON.parse(frame.body) as ChatEvent
            chatStore.handleEvent(event)
          } catch {
            // ignore
          }
        })
        void chatStore.fetchConversations()
        void chatStore.syncActiveConversation()
      },
    })
    client = next
    next.activate()
  }

  function ensureConnected() {
    if (!auth.isAuthenticated) {
      disconnect()
      chatStore.reset()
      return
    }
    connect()
  }

  return {
    connect,
    disconnect,
    ensureConnected,
    isStarted: () => started,
  }
}
