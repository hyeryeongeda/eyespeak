import { create } from 'zustand'

type CallStatus = 'idle' | 'pending' | 'confirmed'

interface CallStatusState {
  status: CallStatus
  setPending: () => void
  setConfirmed: () => void
  reset: () => void
}

export const useCallStatusStore = create<CallStatusState>((set) => ({
  status: 'idle',
  setPending: () => set({ status: 'pending' }),
  setConfirmed: () => set({ status: 'confirmed' }),
  reset: () => set({ status: 'idle' }),
}))
