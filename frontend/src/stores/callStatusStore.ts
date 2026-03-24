import { create } from 'zustand'

type CallStatus = 'idle' | 'pending' | 'confirmed'
export type CallStatusTone = 'call' | 'sos'

interface CallStatusState {
  status: CallStatus
  tone: CallStatusTone
  message: string | null
  setPending: (tone?: CallStatusTone, message?: string | null) => void
  setConfirmed: (tone?: CallStatusTone, message?: string | null) => void
  reset: () => void
}

export const useCallStatusStore = create<CallStatusState>((set) => ({
  status: 'idle',
  tone: 'call',
  message: null,
  setPending: (tone = 'call', message = null) => set({ status: 'pending', tone, message }),
  setConfirmed: (tone = 'call', message = null) => set({ status: 'confirmed', tone, message }),
  reset: () => set({ status: 'idle', tone: 'call', message: null }),
}))
