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
  queue: NotificationData[];
  pushNotification: (data: NotificationData) => void;
  clearNotification: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notification: null,
  queue: [],
  pushNotification: (data) => {
    const { notification } = get();
    if (notification) {
      // 현재 표시 중인 알림이 있으면 큐에 추가
      set((state) => ({ queue: [...state.queue, data] }));
    } else {
      set({ notification: data });
    }
  },
  clearNotification: () => {
    const { queue } = get();
    if (queue.length > 0) {
      // 큐에서 다음 알림을 꺼내 표시
      const [next, ...rest] = queue;
      set({ notification: next, queue: rest });
    } else {
      set({ notification: null });
    }
  },
}));
