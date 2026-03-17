import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useFcmStore } from '../stores/fcmStore';
import { useNotificationStore } from '../stores/notificationStore';
import type { FcmType } from '../stores/notificationStore';

/**
 * FCM 토큰을 서버에 등록합니다.
 * TODO: 백엔드 API 완성 후 실제 API 호출로 교체
 */
const sendTokenToServer = async (token: string): Promise<void> => {
  console.log('[FCM] 서버에 토큰 전송:', token);

  // TODO: 백엔드 API 연동 시 아래 주석 해제
  // await apiClient.post('/api/fcm/token', {
  //   token,
  //   deviceType: 'ANDROID',
  // });
};

/**
 * 서버에서 FCM 토큰을 삭제함 (로그아웃 시 호출)
 * TODO: 백엔드 API 완성 후 실제 API 호출로 교체
 */
export const removeTokenFromServer = async (): Promise<void> => {
  console.log('[FCM] 서버에서 토큰 삭제 요청');
  useFcmStore.getState().clearToken();

  // TODO: 백엔드 API 연동 시 아래 주석 해제
  // await apiClient.delete('/api/fcm/token');
};

/**
 * FCM 푸시 알림을 초기화합니다.
 * - 권한 요청
 * - 토큰 발급 및 서버 전송
 * - 토큰 갱신 리스너 등록
 *
 * 네이티브 환경(Android)에서만 동작하며, 웹 브라우저에서는 스킵됩니다.
 */
export const initFcm = async (): Promise<void> => {
  // 웹 브라우저에서는 FCM 사용 불가 → 스킵
  if (!Capacitor.isNativePlatform()) {
    console.log('[FCM] 웹 환경 — FCM 초기화 스킵');
    return;
  }

  // 1. 푸시 알림 권한 요청
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') {
    console.warn('[FCM] 푸시 알림 권한이 거부되었습니다.');
    return;
  }

  // 2. 토큰 발급 성공 리스너
  PushNotifications.addListener('registration', async (tokenData) => {
    const newToken = tokenData.value;
    const currentToken = useFcmStore.getState().token;

    console.log('[FCM] 토큰 발급 성공:', newToken);

    // 토큰이 변경된 경우에만 서버에 전송
    if (newToken !== currentToken) {
      useFcmStore.getState().setToken(newToken);
      await sendTokenToServer(newToken);
    }
  });

  // 3. 토큰 발급 실패 리스너
  PushNotifications.addListener('registrationError', (error) => {
    console.error('[FCM] 토큰 발급 실패:', error);
  });

  // 앱 포그라운드 상태에서 알림 수신
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const data = notification.data;
    console.log('[FCM] 포그라운드 알림 수신:', data);

    const type = data?.type as FcmType | undefined;
    if (type) {
      useNotificationStore.getState().showNotification({
        type,
        title: data.title ?? '',
        body: data.body ?? '',
        teamCode: data.teamCode,
        senderId: data.senderId,
        senderRole: data.senderRole,
        messageId: data.messageId,
      });
    }
  });

  // 사용자가 알림 탭해서 앱 진입
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data;
    console.log('[FCM] 알림 탭:', data);

    const type = data?.type as FcmType | undefined;
    // TODO: type별 화면 이동 (라우터 연동 후)
    if (type) {
      console.log(`[FCM] ${type} 알림 탭 → 화면 이동 예정`);
    }
  });

  // 4. 푸시 알림 등록 시작 (토큰 발급 요청)
  await PushNotifications.register();
};
