import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.e205.eyespeak',
  appName: 'eyespeak',
  webDir: 'dist',
  android: {
    // WebView가 시스템 바 영역까지 확장 → CSS safe-area-inset으로 제어
    backgroundColor: '#FEFEFE',
  },
  plugins: {
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