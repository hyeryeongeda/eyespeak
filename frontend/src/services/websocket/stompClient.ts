// ! EyeSpeak — STOMP 클라이언트 팩토리
// - @stomp/stompjs 를 래핑하여 프로젝트 전용 설정을 캡슐화한다.
// - 환자, 보호자 모두 이 팩토리를 통해 클라이언트를 생성하며,
// - 연결/해제 타이밍은 호출 측(훅 또는 프로바이더)이 제어한다.

import { Client } from '@stomp/stompjs'
import type { IFrame, IMessage } from '@stomp/stompjs'
import type { StompClientConfig, StompConnectionStatus } from './stompTypes'

// 기본값
const DEFAULT_RECONNECT_DELAY = 5_000
const DEFAULT_HEARTBEAT_INCOMING = 10_000
const DEFAULT_HEARTBEAT_OUTGOING = 10_000

// - 콜백 인터페이스
export interface StompClientCallbacks {
  onConnect?: () => void
  onDisconnect?: () => void
  onStompError?: (frame: IFrame) => void
  onWebSocketError?: (event: Event) => void
  onStatusChange?: (status: StompConnectionStatus) => void
}

// - 래핑된 클라이언트
export interface EyeSpeakStompClient {
  /** 내부 @stomp/stompjs Client (구독 등에 직접 접근 필요 시) */
  readonly raw: Client
  /** 연결 시작 */
  activate: () => void
  /** 연결 해제 (Promise — cleanup 에서 await 가능) */
  deactivate: () => Promise<void>
  /** 특정 destination 으로 JSON 메시지 발행 */
  publish: (destination: string, body: Record<string, unknown>) => void
  /** 특정 destination 구독. unsubscribe 함수를 반환 */
  subscribe: (destination: string, callback: (message: IMessage) => void) => () => void
}

// - WS URL 빌더
function buildBrokerUrl(config: StompClientConfig): string {
  const { wsUrl, accessToken, authMode } = config

  if (authMode === 'query' || authMode === 'both') {
    const separator = wsUrl.includes('?') ? '&' : '?'
    return `${wsUrl}${separator}token=${encodeURIComponent(accessToken)}`
  }

  return wsUrl
}

// ----- 팩토리 함수 -----

export function createStompClient(
  config: StompClientConfig,
  callbacks?: StompClientCallbacks,
): EyeSpeakStompClient {
  const connectHeaders: Record<string, string> = {}

  if (config.authMode === 'header' || config.authMode === 'both') {
    connectHeaders.Authorization = `Bearer ${config.accessToken}`
  }

  const client = new Client({
    brokerURL: buildBrokerUrl(config),
    connectHeaders,
    reconnectDelay: config.reconnectDelay ?? DEFAULT_RECONNECT_DELAY,
    heartbeatIncoming: config.heartbeatIncoming ?? DEFAULT_HEARTBEAT_INCOMING,
    heartbeatOutgoing: config.heartbeatOutgoing ?? DEFAULT_HEARTBEAT_OUTGOING,

    onConnect: () => {
      callbacks?.onStatusChange?.('connected')
      callbacks?.onConnect?.()
    },

    onDisconnect: () => {
      callbacks?.onStatusChange?.('disconnected')
      callbacks?.onDisconnect?.()
    },

    onStompError: (frame: IFrame) => {
      callbacks?.onStatusChange?.('error')
      callbacks?.onStompError?.(frame)
    },

    onWebSocketError: (event: Event) => {
      callbacks?.onStatusChange?.('error')
      callbacks?.onWebSocketError?.(event)
    },
  })

  // 개발 환경에서만 디버그 로그 활성화
  if (import.meta.env.DEV) {
    client.debug = (msg: string) => {
      // STOMP heartbeat 로그는 너무 빈번하므로 제외
      if (!msg.startsWith('>>> PING') && !msg.startsWith('<<< PONG')) {
        // eslint-disable-next-line no-console
        console.debug('[STOMP]', msg)
      }
    }
  } else {
    client.debug = () => {}
  }

  return {
    raw: client,

    activate() {
      callbacks?.onStatusChange?.('connecting')
      client.activate()
    },

    deactivate() {
      return client.deactivate()
    },

    publish(destination: string, body: Record<string, unknown>) {
      if (!client.connected) {
        if (import.meta.env.DEV) {
          console.warn('[STOMP] publish 시도했으나 연결되어 있지 않음:', destination)
        }
        return
      }

      client.publish({
        destination,
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      })
    },

    subscribe(destination: string, callback: (message: IMessage) => void) {
      const subscription = client.subscribe(destination, callback)
      return () => subscription.unsubscribe()
    },
  }
}
