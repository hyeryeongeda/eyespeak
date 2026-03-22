import { useCallback, useRef, useState } from 'react'
import { useAuthStore } from '../../../../stores/authStore'
import { fetchChatHistory } from '../services/chatService'
import type { ChatMessage, ChatMessageDto } from '../../types/chat'

function dtoToChatMessage(dto: ChatMessageDto): ChatMessage {
  return {
    id: String(dto.messageId),
    senderId: String(dto.senderId),
    senderRole: dto.senderRole === 'PATIENT' ? 'patient' : 'care',
    content: dto.text,
    contentType: dto.contentType,
    sentAt: dto.timestamp,
  }
}

export interface UseChatHistoryReturn {
  messages: ChatMessage[]
  isLoading: boolean
  hasMore: boolean
  loadInitial: () => Promise<void>
  loadMore: () => Promise<void>
}

export function useChatHistory(): UseChatHistoryReturn {
  const user = useAuthStore(state => state.user)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const cursorRef = useRef<number | null>(null)
  const initialLoadedRef = useRef(false)

  const loadInitial = useCallback(async () => {
    if (!user?.matchingId || !user.accessToken) return
    if (initialLoadedRef.current) return

    initialLoadedRef.current = true
    setIsLoading(true)
    try {
      const response = await fetchChatHistory(user.matchingId, user.accessToken)
      const converted = response.messages.map(dtoToChatMessage).reverse()
      setMessages(converted)
      setHasMore(response.hasNext)
      cursorRef.current = response.nextCursor
    } catch {
      // 서버 미연결 등 네트워크 에러 — 빈 채팅으로 시작
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [user?.matchingId, user?.accessToken])

  const loadMore = useCallback(async () => {
    if (!user?.matchingId || !user.accessToken) return
    if (isLoading || !hasMore || cursorRef.current == null) return

    setIsLoading(true)
    try {
      const response = await fetchChatHistory(
        user.matchingId,
        user.accessToken,
        cursorRef.current,
      )
      const older = response.messages.map(dtoToChatMessage).reverse()
      setMessages(prev => [...older, ...prev])
      setHasMore(response.hasNext)
      cursorRef.current = response.nextCursor
    } catch {
      // 네트워크 에러 시 추가 로드 중단
    } finally {
      setIsLoading(false)
    }
  }, [user?.matchingId, user?.accessToken, isLoading, hasMore])

  return { messages, isLoading, hasMore, loadInitial, loadMore }
}
