/**
 * 构建空间群聊 STOMP WebSocket URL：ws(s)://host/ws?token=...
 * 开发环境优先走 Vite 同源代理 /ws。
 */
export function buildSpaceChatWsUrl(token: string): string {
  const encoded = encodeURIComponent(token)
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws?token=${encoded}`
  }

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || window.location.origin
  const url = new URL(apiBase)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws'
  url.search = `token=${encoded}`
  url.hash = ''
  return url.toString()
}
