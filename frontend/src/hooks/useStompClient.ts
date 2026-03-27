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
import { Capacitor } from '@capacitor/core'
import { createStompClient } from '../services/websocket/stompClient'
import type { EyeSpeakStompClient } from '../services/websocket/stompClient'
import type { StompConnectionStatus } from '../services/websocket/stompTypes'
import { useAuthStore } from '../stores/authStore'

// ----- Env -----

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? ''
const WS_ENDPOINT = import.meta.env.VITE_WS_ENDPOINT ?? '/ws'
const WS_AUTH_MODE = (import.meta.env.VITE_WS_AUTH_MODE ?? 'both') as 'header' | 'query' | 'both'

// Vite가 base 설정값을 import.meta.env.BASE_URL로 주입한다.
// dev 빌드 시 VITE_BASE_URL=/dev → BASE_URL=/dev/ 이므로 /dev/ws로 연결된다.
const BASE_PATH = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')

function buildWsUrl(): string {
  const endpoint = `${BASE_PATH}${WS_ENDPOINT}`

  if (WS_BASE_URL) {
    return `${WS_BASE_URL}${endpoint}`
  }

  // Capacitor 네이티브 앱: window.location 기반 감지가 불가하므로 직접 지정
  if (Capacitor.isNativePlatform()) {
    return `wss://j14e205.p.ssafy.io/dev${WS_ENDPOINT}`
  }

  // 웹 브라우저: 현재 호스트 기준으로 자동 생성
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // Dev 환경(/dev/) 경로 자동 감지: /dev/ws 로 연결
  const basePath = window.location.pathname.startsWith('/dev') ? '/dev' : ''
  return `${protocol}//${window.location.host}${basePath}${WS_ENDPOINT}`
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
  const [client, setClient] = useState<EyeSpeakStompClient | null>(null)
  const clientRef = useRef<EyeSpeakStompClient | null>(null)
  // 세대 카운터: 구 클라이언트의 콜백이 새 클라이언트의 상태를 덮어쓰는 것을 방지
  const genRef = useRef(0)

  // cleanup 함수 — useEffect 와 reconnect 양쪽에서 사용
  const cleanup = useCallback(async () => {
    const clientToCleanup = clientRef.current
    if (!clientToCleanup) return

    try {
      await clientToCleanup.deactivate()
    } catch {
      // deactivate 실패는 무시 (이미 끊어진 상태 등)
    }
    // deactivate 사이에 새 클라이언트가 생성되었으면 덮어쓰지 않는다
    if (clientRef.current === clientToCleanup) {
      clientRef.current = null
      setClient(null)
    }
  }, [])

  // 연결 생성 함수
  const connect = useCallback(() => {
    if (!accessToken || !enabled) {
      setStatus('disconnected')
      return
    }

    const wsUrl = buildWsUrl()
    const gen = ++genRef.current
    // 디버그: 연결 시도 URL 확인 (Android 디버깅용, 추후 제거)
    console.log('[STOMP] 연결 시도 URL:', wsUrl, 'gen:', gen)
    console.log('[STOMP] isNative:', Capacitor.isNativePlatform(), 'platform:', Capacitor.getPlatform())

    const stompClient = createStompClient(
      {
        wsUrl,
        accessToken,
        authMode: WS_AUTH_MODE,
      },
      {
        onStatusChange: (newStatus) => {
          // 구 클라이언트의 콜백이면 무시 (토큰 갱신 등으로 새 클라이언트가 생성된 경우)
          if (genRef.current !== gen) return
          console.log('[STOMP] 상태 변경:', newStatus, 'gen:', gen)
          setStatus(newStatus)
        },
        onStompError: (frame) => {
          if (genRef.current !== gen) return
          console.error('[STOMP] 에러:', frame.headers.message ?? frame.body)
        },
        onWebSocketError: (event) => {
          if (genRef.current !== gen) return
          console.error('[STOMP] WebSocket 에러:', event)
        },
      },
    )

    clientRef.current = stompClient
    setClient(stompClient)
    stompClient.activate()
  }, [accessToken, enabled])

  // mount / token 변경 / enabled 변경 시 재연결
  useEffect(() => {
    if (!enabled || !accessToken) {
      const timeoutId = window.setTimeout(() => {
        void cleanup()
        setStatus('disconnected')
      }, 0)

      return () => {
        window.clearTimeout(timeoutId)
      }
    }

    const timeoutId = window.setTimeout(() => {
      connect()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
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
    client,
    status,
    reconnect,
  }
}
