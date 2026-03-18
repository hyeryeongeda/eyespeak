import { RouterProvider } from 'react-router-dom'
import router from '../router'

/**
 * Patient 모드 엔트리 (웹, 시선 추적 등).
 * Vite 멀티 엔트리 시 이 컴포넌트를 patient 진입점으로 사용.
 */
export default function PatientEntry() {
  return <RouterProvider router={router} />
}
