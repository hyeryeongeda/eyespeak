/** STOMP/WebSocket 채팅 연동 훅 (TODO: shared/lib/websocket 연동) */
export function useChatSocket(_roomId: string | null) {
  return {
    connected: false,
    sendMessage: (_content: string) => {},
  }
}
