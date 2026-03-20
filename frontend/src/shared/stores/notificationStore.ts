import { create } from 'zustand';

export type FcmType = 'CALL' | 'SOS' | 'VOICE_READY' | 'CHAT';

export interface NotificationData {
  type: FcmType;
  title: string;
  body: string;
  /** ERD matching.id (bigint → number). FCM 에서는 string 으로 수신되므로 선택적 */
  matchingId?: number;
  senderId?: string;
  senderRole?: string;
  messageId?: string;
  /** CALL_CONFIRMED 시 call.id */
  callId?: number;
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
