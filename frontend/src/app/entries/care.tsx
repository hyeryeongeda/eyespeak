import { RouterProvider } from 'react-router-dom'
import router from '../router'

/**
 * Care 모드 엔트리 (보호자, Capacitor / FCM / WebSocket(STOMP) 연동 예정).
 * Vite 멀티 엔트리 시 이 컴포넌트를 care 진입점으로 사용.
 */
export default function CareEntry() {
  return <RouterProvider router={router} />
}
