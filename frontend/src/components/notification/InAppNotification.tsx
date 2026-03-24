import { useEffect, useState } from 'react';
import { useNotificationStore } from '../../shared/stores/notificationStore';
import type { FcmType } from '../../shared/stores/notificationStore';
import { apiClient } from '../../services/apiClient';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { getActiveAuthSession } from '../../services/authSessionRegistry';

/** VOICE_READY만 자동 사라짐 (확인 동작이 필요 없음) */
const AUTO_DISMISS_MS = 4000;

/** type별 배경색 */
const bgColorMap: Record<Exclude<FcmType, 'SOS'>, string> = {
  CALL: 'bg-blue-500',
  CHAT: 'bg-green-500',
  VOICE_READY: 'bg-purple-500',
};

/** type별 라벨 */
const labelMap: Record<Exclude<FcmType, 'SOS'>, string> = {
  CALL: '호출',
  CHAT: '채팅',
  VOICE_READY: '음성 완료',
};

/** 확인 버튼이 필요한 type (보호자 확인 → 환자에게 알림 전달) */
const CONFIRMABLE_TYPES: FcmType[] = ['CALL', 'CHAT'];

export default function InAppNotification() {
  const notification = useNotificationStore((s) => s.notification);
  const clearNotification = useNotificationStore((s) => s.clearNotification);
  const [confirming, setConfirming] = useState(false);

  const needsConfirm = notification
    ? CONFIRMABLE_TYPES.includes(notification.type)
    : false;

  // VOICE_READY만 자동 사라짐 (CALL, CHAT은 확인 버튼 필요)
  useEffect(() => {
    if (!notification || notification.type === 'SOS' || needsConfirm) return;

    const timer = setTimeout(() => {
      clearNotification();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [notification, clearNotification, needsConfirm]);

  // SOS는 이 컴포넌트에서 처리하지 않음
  if (!notification || notification.type === 'SOS') return null;

  const bgColor = bgColorMap[notification.type];
  const label = labelMap[notification.type];

  const handleConfirm = async () => {
    if (confirming) return;

    if (notification.type === 'CALL' && notification.callId) {
      setConfirming(true);
      const accessToken = getActiveAuthSession()?.accessToken ?? null;
      if (accessToken) {
        await apiClient.patch(
          `${API_ENDPOINTS.CALL_CONFIRM}/${notification.callId}/acknowledge`,
          undefined,
          { accessToken },
        );
      }
      setConfirming(false);
    }

    clearNotification();
  };

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 ${bgColor} rounded-2xl p-4 shadow-lg`}>
      {/* 알림 내용 */}
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-semibold text-white">
          {label}
        </span>
        <div className="flex-1 text-white">
          <p className="text-sm font-bold">{notification.title}</p>
          <p className="text-sm opacity-90">{notification.body}</p>
        </div>
      </div>

      {/* 확인 버튼 (CALL, CHAT) */}
      {needsConfirm && (
        <button
          onClick={handleConfirm}
          className="mt-3 min-h-[44px] w-full rounded-xl bg-white/20 py-2 text-sm font-bold text-white active:scale-95"
        >
          확인
        </button>
      )}
    </div>
  );
}
