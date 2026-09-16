import { Client } from '@stomp/stompjs'

let stompClient = null
let reconnectTimer = null
/** @type {((event: object) => void) | null} */
let onItemChangeHandler = null

function getWebSocketUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || ''
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const url = new URL(apiBase)
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const path = url.pathname.replace(/\/api\/?$/, '')
    return `${wsProtocol}//${url.host}${path}/ws`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

function parseEventBody(message) {
  try {
    return JSON.parse(message.body)
  } catch {
    return null
  }
}

/**
 * @param {(event: object) => void} [handler] — called for each /topic/item-changes message
 */
export function connectItemChangesWebSocket(handler) {
  if (handler) {
    onItemChangeHandler = handler
  }
  const token = localStorage.getItem('token')
  if (!token || stompClient?.active) return

  disconnectItemChangesWebSocket()

  const client = new Client({
    brokerURL: getWebSocketUrl(),
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe('/topic/item-changes', (message) => {
        const event = parseEventBody(message)
        if (!event || !onItemChangeHandler) return
        onItemChangeHandler(event)
      })
    },
    onStompError: (frame) => {
      console.warn('[item-changes-ws] STOMP error', frame.headers?.message)
    },
    onWebSocketClose: () => {
      if (!localStorage.getItem('token')) return
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => connectItemChangesWebSocket(), 5000)
    }
  })

  stompClient = client
  client.activate()
}

export function disconnectItemChangesWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (stompClient) {
    stompClient.deactivate()
    stompClient = null
  }
}
