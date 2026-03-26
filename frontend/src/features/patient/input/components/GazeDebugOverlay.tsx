import { useGazeInputStore } from '../stores/gazeInputStore'

/**
 * DEV-ONLY: 현재 hit-test에 실제 사용되는 gaze 좌표(clientX/clientY)를
 * 화면 위에 빨간 점으로 표시한다.
 *
 * 검증 방법:
 * - 좌상단을 볼 때 점이 좌상단에 찍히면 → frontend 좌표 변환은 정상,
 *   클릭이 여전히 틀리면 hit-test 로직 문제.
 * - 점이 실제 시선과 다른 위치에 찍히면 → ai/iframe/calibration 문제.
 *
 * point-hit-test 비활성화:
 *   브라우저 콘솔에서 window.__DEV_GAZE_DISABLE_POINT_HIT_TEST = true
 *   (gaze 업데이트 다음 프레임부터 적용됨)
 */
export default function GazeDebugOverlay() {
  // 빨간 디버그 커서 비활성화 — 환자 UI에서 불필요
  return null

  const point = useGazeInputStore(state => state.point)
  const cell = useGazeInputStore(state => state.cell)

  if (!point) {
    return null
  }

  const cx = Math.round(point.clientX)
  const cy = Math.round(point.clientY)

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        overflow: 'hidden',
      }}
    >
      {/* 빨간 점: hit-test에 사용되는 좌표 */}
      <div
        style={{
          position: 'absolute',
          left: cx - 10,
          top: cy - 10,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'rgba(220, 30, 30, 0.85)',
          border: '2px solid #fff',
          boxShadow: '0 0 6px rgba(0,0,0,0.6)',
        }}
      />
      {/* 좌표 레이블 */}
      <div
        style={{
          position: 'absolute',
          left: cx + 14,
          top: cy - 10,
          background: 'rgba(0, 0, 0, 0.75)',
          color: '#fff',
          fontSize: 11,
          fontFamily: 'monospace',
          padding: '2px 6px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
          lineHeight: 1.6,
        }}
      >
        {`(${cx}, ${cy}) cell=${cell ?? 'null'}`}
        <br />
        {`vp=${window.innerWidth}×${window.innerHeight}`}
      </div>
    </div>
  )
}
