// ============================================================
// 호환 래퍼 — 기존 ChatPage 의 import 를 깨뜨리지 않기 위해 유지.
// 실제 로직은 useCareChat.ts 로 이동됨.
// 마이그레이션 완료 후 이 파일은 삭제하고 ChatPage 의 import 를 변경할 것.
// ============================================================

import { useCareChat } from './useCareChat'

/**
 * @deprecated useCareChat() 을 직접 사용하세요.
 */
export function useChatSocket(_roomId: string | null) {
  const { connected, sendMessage } = useCareChat()

  return {
    connected,
    sendMessage,
  }
}
