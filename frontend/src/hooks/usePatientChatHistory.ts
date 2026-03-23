import { useCallback, useRef, useState } from 'react'
import { fetchChatHistory } from '../features/care/chat/services/chatService'
import type { ChatMessageDto } from '../features/care/types/chat'
import { useAuthStore } from '../stores/authStore'
import type { PatientChatMessage } from '../types/chat'

function normalizeDateTime(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    const [y, m, d, h = 0, min = 0, s = 0] = value as number[]
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return new Date().toISOString()
}

function dtoToPatientChatMessage(dto: ChatMessageDto): PatientChatMessage {
  return {
    id: String(dto.messageId),
    sender: dto.senderRole === 'PATIENT' ? 'patient' : 'guardian',
    type: 'text',
    content: dto.text,
    createdAt: normalizeDateTime(dto.createdAt ?? dto.timestamp),
    status: 'replied',
    meta: {
      contentType: dto.contentType,
      historySource: 'rest',
    },
  }
}

function inferHistoryReplyState(messages: PatientChatMessage[]) {
  const nextMessages: PatientChatMessage[] = messages.map(message => ({
    ...message,
    status: 'replied',
  }))

  let latestGuardianIndex: number | null = null

  nextMessages.forEach((message, index) => {
    if (message.sender === 'guardian') {
      latestGuardianIndex = index
      return
    }

    if (latestGuardianIndex == null) {
      return
    }

    nextMessages[index] = {
      ...message,
      replyToId: nextMessages[latestGuardianIndex].id,
    }
    latestGuardianIndex = null
  })

  if (latestGuardianIndex != null) {
    nextMessages[latestGuardianIndex] = {
      ...nextMessages[latestGuardianIndex],
      status: 'received',
    }
  }

  return nextMessages
}

export interface UsePatientChatHistoryReturn {
  messages: PatientChatMessage[]
  isLoading: boolean
  loadAll: () => Promise<void>
}

export function usePatientChatHistory(): UsePatientChatHistoryReturn {
  const user = useAuthStore(state => state.user)
  const [messages, setMessages] = useState<PatientChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const loadedSessionKeyRef = useRef<string | null>(null)

  const loadAll = useCallback(async () => {
    if (!user?.matchingId || !user.accessToken) {
      return
    }

    const sessionKey = `${user.matchingId}:${user.accessToken}`

    if (loadedSessionKeyRef.current === sessionKey) {
      return
    }

    loadedSessionKeyRef.current = sessionKey
    setIsLoading(true)

    try {
      const allMessages: ChatMessageDto[] = []
      let cursor: number | null | undefined = undefined
      let hasNext = true

      while (hasNext) {
        const response = await fetchChatHistory(
          user.matchingId,
          user.accessToken,
          cursor,
        )

        allMessages.push(...response.messages)
        hasNext = response.hasNext && response.nextCursor != null
        cursor = response.nextCursor
      }

      const chronologicalMessages = [...allMessages]
        .reverse()
        .map(dtoToPatientChatMessage)

      setMessages(inferHistoryReplyState(chronologicalMessages))
    } catch {
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.accessToken, user?.matchingId])

  return {
    messages,
    isLoading,
    loadAll,
  }
}
