import type { ChatMessage, ChatRoom } from '../../types/chat'

/** 채팅 목록/메시지 조회 (TODO: STOMP/API 연동) */
export async function fetchChatRooms(_careUserId: string): Promise<ChatRoom[]> {
  return []
}

export async function fetchMessages(_roomId: string): Promise<ChatMessage[]> {
  return []
}
