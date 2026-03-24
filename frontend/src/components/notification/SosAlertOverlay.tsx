import { useState } from 'react';
import { useNotificationStore } from '../../shared/stores/notificationStore';
import { apiClient } from '../../services/apiClient';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { getActiveAuthSession } from '../../services/authSessionRegistry';

export default function SosAlertOverlay() {
  const notification = useNotificationStore((s) => s.notification);
  const clearNotification = useNotificationStore((s) => s.clearNotification);
  const [confirming, setConfirming] = useState(false);

  // SOS가 아니면 렌더링 안 함
  if (!notification || notification.type !== 'SOS') return null;

  const handleConfirm = async () => {
    if (confirming) return;

    if (notification.callId) {
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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-red-600 p-8">
      {/* 긴급 아이콘 */}
      <div className="mb-6 text-7xl">
        <span role="img" aria-label="긴급">&#x1F6A8;</span>
      </div>

      {/* 타이틀 */}
      <h1 className="mb-4 text-3xl font-extrabold text-white">
        긴급 호출
      </h1>

      {/* 내용 */}
      <p className="mb-2 text-xl font-semibold text-white">
        {notification.title}
      </p>
      <p className="mb-12 text-lg text-white/90">
        {notification.body}
      </p>

      {/* 확인 버튼 */}
      <button
        onClick={handleConfirm}
        className="min-h-[44px] w-full max-w-xs rounded-2xl bg-white px-8 py-4 text-lg font-bold text-red-600 shadow-lg active:scale-95"
      >
        확인
      </button>
    </div>
  );
}
