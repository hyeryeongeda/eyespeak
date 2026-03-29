import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useFcmStore } from '../stores/fcmStore';
import { useNotificationStore } from '../shared/stores/notificationStore';
import type { FcmType } from '../shared/stores/notificationStore';
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';
import { getActiveAuthSession } from './authSessionRegistry';
import { playNotificationSound } from '../utils/notificationSound';

function getAccessToken(): string | null {
  return getActiveAuthSession()?.accessToken ?? null;
}

/**
 * FCM 토큰을 서버에 등록합니다.
 * accessToken이 아직 없으면 최대 3회 재시도합니다.
 */
const sendTokenToServer = async (token: string): Promise<void> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const accessToken = getAccessToken();
    if (accessToken) {
      await apiClient.post(API_ENDPOINTS.FCM_TOKEN, { token }, { accessToken });
      return;
    }

    if (attempt < MAX_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  console.warn('[FCM] accessToken이 없어 토큰 서버 등록을 건너뜁니다.');
};

/* 서버에서 FCM 토큰 삭제 (로그아웃 시 호출) */
export const removeTokenFromServer = async (): Promise<void> => {
  const accessToken = getAccessToken();
  if (accessToken) {
    await apiClient.delete(API_ENDPOINTS.FCM_TOKEN, undefined, { accessToken });
  }
  useFcmStore.getState().clearToken();
};

/**
 * 시스템 트레이에 로컬 알림을 표시합니다 (백그라운드 전용).
 */
let notificationIdCounter = 0;

async function showSystemNotification(type: FcmType, title: string, body: string): Promise<void> {
  notificationIdCounter += 1;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationIdCounter,
        title,
        body,
        channelId: type === 'SOS' ? 'sos-channel-v3' : 'default-channel-v3',
        sound: type === 'SOS' ? 'sos_alert.mp3' : 'basic_alert.mp3',
      },
    ],
  });
}

// 안드로이드 알림 채널 생성 (Android 8+ 필수)
async function createNotificationChannels(): Promise<void> {
  await LocalNotifications.createChannel({
    id: 'default-channel-v3',
    name: '일반 알림',
    importance: 4,
    sound: 'basic_alert.mp3',
    vibration: true,
  });

  await LocalNotifications.createChannel({
    id: 'sos-channel-v3',
    name: '긴급 호출',
    importance: 5,
    sound: 'sos_alert.mp3',
    vibration: true,
  })
}

/* FCM 푸시 알림을 초기화 (권한 요청, 토큰 발급 및 서버 전송, 토큰 갱신 리스너 등록)
  네이티브 환경(Android)에서만 동작하며, 웹 브라우저에서는 스킵됨 */
export const initFcm = async (): Promise<void> => {
  // 웹 브라우저에서는 FCM 사용 불가 → 스킵
  if (!Capacitor.isNativePlatform()) {
    console.log('[FCM] 웹 환경 — FCM 초기화 스킵');
    return;
  }

  try {
    // 기존 리스너 정리 (중복 등록 방지)
    await PushNotifications.removeAllListeners();
    await LocalNotifications.removeAllListeners();

    // 알림 채널 생성
    await createNotificationChannels();

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

    // 알림 수신 (포그라운드 + 백그라운드 WebView 활성 시 모두 발동)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const data = notification.data;
      console.log('[FCM] 알림 수신:', data);

      const type = data?.type as FcmType | undefined;
      if (type) {
        if (document.hidden) {
          // 백그라운드: 시스템 트레이 알림 (채널 사운드로 알림음 재생)
          showSystemNotification(type, data.title ?? '', data.body ?? '');
        } else {
          // 포그라운드: 인앱 UI + 사운드
          playNotificationSound(type);
          useNotificationStore.getState().pushNotification({
            type,
            title: data.title ?? '',
            body: data.body ?? '',
            matchingId: data.matchingId ? Number(data.matchingId) : undefined,
            senderId: data.senderId,
            senderRole: data.senderRole,
            messageId: data.messageId,
            callId: data.callId ? Number(data.callId) : undefined,
          });
        }
      }
    });

    // 사용자가 알림 탭해서 앱 진입 (백그라운드/종료 상태에서)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data;
      console.log('[FCM] 알림 탭:', data);

      const type = data?.type as FcmType | undefined;
      if (type) {
        // 백그라운드 알림 탭 시 인앱 알림 UI를 표시하여 보호자가 확인 버튼을 누를 수 있게 함
        useNotificationStore.getState().pushNotification({
          type,
          title: data.title ?? '',
          body: data.body ?? '',
          matchingId: data.matchingId ? Number(data.matchingId) : undefined,
          senderId: data.senderId,
          senderRole: data.senderRole,
          messageId: data.messageId,
          callId: data.callId ? Number(data.callId) : undefined,
        });
      }
    });

    // 로컬 알림 탭 시 앱 진입
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('[LocalNotification] 알림 탭:', action);
      });

    // 푸시 알림 등록 시작 (토큰 발급 요청)
    await PushNotifications.register();
  } catch (error) {
    console.error('[FCM] 초기화 실패 (google-services.json 누락 가능):', error);
  }
};
