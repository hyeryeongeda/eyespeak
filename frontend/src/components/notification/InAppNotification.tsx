import { useEffect, useState } from 'react';
import { useNotificationStore } from '../../shared/stores/notificationStore';
import type { FcmType } from '../../shared/stores/notificationStore';
import { apiClient } from '../../services/apiClient';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { getActiveAuthSession } from '../../services/authSessionRegistry';

/** VOICE_READY만 자동 사라짐 (확인 동작이 필요 없음) */
const AUTO_DISMISS_MS = 4000;

/** type별 스타일 (배경 + 텍스트) */
const styleMap: Record<Exclude<FcmType, 'SOS'>, { bg: string; text: string; badge: string; button: string }> = {
  CALL: { bg: 'bg-blue-100', text: 'text-blue-800', badge: 'bg-blue-200 text-blue-800', button: 'bg-blue-200 text-blue-800' },
  CHAT: { bg: 'bg-green-100', text: 'text-green-800', badge: 'bg-green-200 text-green-800', button: 'bg-green-200 text-green-800' },
  VOICE_READY: { bg: 'bg-purple-100', text: 'text-purple-800', badge: 'bg-purple-200 text-purple-800', button: 'bg-purple-200 text-purple-800' },
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

  const style = styleMap[notification.type];
  const label = labelMap[notification.type];

  const handleConfirm = async () => {
    if (confirming) return;

    if (notification.type === 'CALL' && notification.callId) {
      setConfirming(true);
      try {
        const accessToken = getActiveAuthSession()?.accessToken ?? null;
        if (accessToken) {
          await apiClient.patch(
            `${API_ENDPOINTS.CALL_CONFIRM}/${notification.callId}/acknowledge`,
            undefined,
            { accessToken },
          );
        }
      } catch (error) {
        console.error('[알림] 호출 확인 실패:', error);
      } finally {
        setConfirming(false);
      }
    }

    clearNotification();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className={`mx-4 w-full max-w-sm ${style.bg} rounded-2xl p-4 shadow-lg`}>
        {/* 알림 내용 */}
        <div className="flex items-center gap-3">
          <span className={`rounded-full ${style.badge} px-2 py-1 text-xs font-semibold`}>
            {label}
          </span>
          <div className={`flex-1 ${style.text}`}>
            <p className="text-sm font-bold">{notification.title}</p>
            <p className="text-sm opacity-75">{notification.body}</p>
          </div>
        </div>

        {/* 확인 버튼 (CALL, CHAT) */}
        {needsConfirm && (
          <button
            onClick={handleConfirm}
            className={`mt-3 min-h-[44px] w-full rounded-xl ${style.button} py-2 text-sm font-bold active:scale-95`}
          >
            확인
          </button>
        )}
      </div>
    </div>
  );
}
