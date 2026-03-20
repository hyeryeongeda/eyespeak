import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.e205.eyespeak',
  appName: 'eyespeak',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000, // 스플래시 화면을 2초(2000ms) 동안 유지
      launchAutoHide: true,     // 시간이 지나면 자동으로 사라짐
      backgroundColor: "#FEFEFE", // 배경색 (흰색)
      androidScaleType: "CENTER_CROP",
      showSpinner: false,       // 로딩 중 동그라미(스피너) 숨기기
    },
  },
};

export default config;