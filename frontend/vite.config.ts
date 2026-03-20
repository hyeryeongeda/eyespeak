import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const eyeTrackingProxyTarget =
  process.env.VITE_EYE_TRACKING_PROXY_TARGET || 'http://localhost:5000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_URL || '/',
  server: {
    allowedHosts: ['j14e205.p.ssafy.io'],
    proxy: {
      '/eye-tracking-api': {
        target: eyeTrackingProxyTarget,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/eye-tracking-api/, ''),
      },
    },
  },
})
