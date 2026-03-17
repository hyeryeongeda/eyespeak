import { create } from 'zustand';

interface FcmState {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useFcmStore = create<FcmState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
  clearToken: () => set({ token: null }),
}));
