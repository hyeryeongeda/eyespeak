// ============================================================
// EyeSpeak — 공통 STOMP 연결 훅
// ============================================================
// STOMP 클라이언트 인스턴스를 생성하고 연결 상태를 관리한다.
// 연결/해제 생명주기는 이 훅을 호출하는 컴포넌트의 mount/unmount 에 바인딩된다.
//
// 사용처:
//   - 보호자: 채팅 화면(ChatPage) mount 시 연결, unmount 시 해제
//   - 환자:   PatientLayout mount 시 연결 (로그인~로그아웃 전체 생명주기)
//
// 이 훅은 역할(role)을 모른다. 역할별 분기는 각 어댑터 훅이 담당한다.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { createStompClient } from '../services/websocket/stompClient'
import type { EyeSpeakStompClient } from '../services/websocket/stompClient'
import type { StompConnectionStatus } from '../services/websocket/stompTypes'
import { useAuthStore } from '../stores/authStore'

// ----- Env -----

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? ''
const WS_ENDPOINT = import.meta.env.VITE_WS_ENDPOINT ?? '/ws'
const WS_AUTH_MODE = (import.meta.env.VITE_WS_AUTH_MODE ?? 'both') as 'header' | 'query' | 'both'

function buildWsUrl(): string {
  if (WS_BASE_URL) {
    return `${WS_BASE_URL}${WS_ENDPOINT}`
  }

  // WS_BASE_URL 미설정 시 현재 호스트 기준으로 자동 생성
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${WS_ENDPOINT}`
}

// ----- 훅 반환 타입 -----

export interface UseStompClientReturn {
  /** 현재 STOMP 클라이언트 인스턴스. 연결 전이면 null */
  client: EyeSpeakStompClient | null
  /** 연결 상태 */
  status: StompConnectionStatus
  /** 수동 재연결 (토큰 갱신 시 등) */
  reconnect: () => void
}

// ----- 훅 -----

/**
 * STOMP WebSocket 연결을 관리하는 공통 훅.
 *
 * @param enabled - false 로 설정하면 연결하지 않는다 (조건부 연결에 사용)
 */
export function useStompClient(enabled = true): UseStompClientReturn {
  const accessToken = useAuthStore(state => state.user?.accessToken ?? null)
  const [status, setStatus] = useState<StompConnectionStatus>('disconnected')
  const clientRef = useRef<EyeSpeakStompClient | null>(null)

  // cleanup 함수 — useEffect 와 reconnect 양쪽에서 사용
  const cleanup = useCallback(async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.deactivate()
      } catch {
        // deactivate 실패는 무시 (이미 끊어진 상태 등)
      }
      clientRef.current = null
    }
  }, [])

  // 연결 생성 함수
  const connect = useCallback(() => {
    if (!accessToken || !enabled) {
      setStatus('disconnected')
      return
    }

    const stompClient = createStompClient(
      {
        wsUrl: buildWsUrl(),
        accessToken,
        authMode: WS_AUTH_MODE,
      },
      {
        onStatusChange: setStatus,
        onStompError: (frame) => {
          if (import.meta.env.DEV) {
            console.error('[STOMP] 에러:', frame.headers.message ?? frame.body)
          }
        },
        onWebSocketError: (event) => {
          if (import.meta.env.DEV) {
            console.error('[STOMP] WebSocket 에러:', event)
          }
        },
      },
    )

    clientRef.current = stompClient
    stompClient.activate()
  }, [accessToken, enabled])

  // mount / token 변경 / enabled 변경 시 재연결
  useEffect(() => {
    if (!enabled || !accessToken) {
      void cleanup()
      setStatus('disconnected')
      return
    }

    connect()

    return () => {
      void cleanup()
    }
  }, [accessToken, enabled, connect, cleanup])

  // 수동 재연결
  const reconnect = useCallback(() => {
    void cleanup().then(() => {
      connect()
    })
  }, [cleanup, connect])

  return {
    client: clientRef.current,
    status,
    reconnect,
  }
}
