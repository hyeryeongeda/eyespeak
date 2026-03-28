import type { StompContentType } from './websocket'
import type { PatientChatMessage, PatientChatMessageType } from '../types/chat'

type DispatchablePatientChatType = Extract<
  PatientChatMessageType,
  'text' | 'suggested_reply' | 'manual_text' | 'word_combination'
>

export interface DispatchPatientChatInput {
  text: string
  type?: DispatchablePatientChatType
  contentType?: StompContentType
  clientMessageId?: string
  phraseId?: number | null
  exprId?: number | null
  replyToId?: string
}

export interface DispatchPatientChatResult {
  success: boolean
  message?: PatientChatMessage
  error?: string
}

type PatientChatDispatcher = (
  input: DispatchPatientChatInput,
) => Promise<DispatchPatientChatResult>

let patientChatDispatcher: PatientChatDispatcher | null = null

export function registerPatientChatDispatcher(
  dispatcher: PatientChatDispatcher | null,
) {
  patientChatDispatcher = dispatcher

  return () => {
    if (patientChatDispatcher === dispatcher) {
      patientChatDispatcher = null
    }
  }
}

export async function dispatchPatientChatMessage(
  input: DispatchPatientChatInput,
): Promise<DispatchPatientChatResult> {
  if (!patientChatDispatcher) {
    return {
      success: false,
      error: 'Patient chat dispatcher is unavailable.',
    }
  }

  return patientChatDispatcher(input)
}
