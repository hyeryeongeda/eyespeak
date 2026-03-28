import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function joinBasePath(basePath: string | undefined, suffix: string) {
  const normalizedBasePath = basePath?.trim().replace(/\/+$/, '') ?? ''
  const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`

  return normalizedBasePath && normalizedBasePath !== '/'
    ? `${normalizedBasePath}${normalizedSuffix}`
    : normalizedSuffix
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const eyeTrackingProxyTarget =
  process.env.VITE_EYE_TRACKING_PROXY_TARGET || 'http://localhost:5000'
const basePath = process.env.VITE_BASE_URL || '/'
const configuredEyeTrackingApiBaseUrl = process.env.VITE_EYE_TRACKING_API_BASE_URL || ''
const eyeTrackingProxyPaths = Array.from(
  new Set(
    [
      configuredEyeTrackingApiBaseUrl.trim(),
      joinBasePath(basePath, '/eye-tracking-api'),
      '/eye-tracking-api',
    ].filter(path => path.startsWith('/')),
  ),
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: basePath,
  server: {
    allowedHosts: ['j14e205.p.ssafy.io'],
    proxy: Object.fromEntries(
      eyeTrackingProxyPaths.map(path => [
        path,
        {
          target: eyeTrackingProxyTarget,
          changeOrigin: true,
          rewrite: requestPath => requestPath.replace(new RegExp(`^${escapeRegExp(path)}`), ''),
        },
      ]),
    ),
  },
})
