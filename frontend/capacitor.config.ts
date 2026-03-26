import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.e205.eyespeak',
  appName: 'eyespeak',
  webDir: 'dist',
  android: {
    // WebView가 시스템 바 영역까지 확장 → CSS safe-area-inset으로 제어
    backgroundColor: '#FEFEFE',
  },
  server: {
    // WebView origin을 배포 서버와 동일하게 설정
    // → WebSocket Origin 헤더가 https://j14e205.p.ssafy.io 로 전송되어 서버 CORS 통과
    hostname: 'j14e205.p.ssafy.io',
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FEFEFE',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;