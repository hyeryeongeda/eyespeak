import { create } from 'zustand';

export type FcmType = 'CALL' | 'SOS' | 'VOICE_READY' | 'CHAT';

export interface NotificationData {
  type: FcmType;
  title: string;
  body: string;
  teamCode?: string;
  senderId?: string;
  senderRole?: string;
  messageId?: string;
}

interface NotificationState {
  notification: NotificationData | null;
  showNotification: (data: NotificationData) => void;
  clearNotification: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notification: null,
  showNotification: (data) => set({ notification: data }),
  clearNotification: () => set({ notification: null }),
}));
