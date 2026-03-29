/**
 * calibration_6_to_9.js
 * =====================
 * 6~9분할 화면을 위한 캘리브레이션 포인트 생성, 스크린 좌표 예측, 영역 인덱스 매핑.
 * - 캘리 포인트: 9점(3×3), 12점(3×3+보강3점), 25점(5×5) 선택 가능
 * - 매핑: 2차 다항식 (9점) 또는 RBF (25점 권장)는 호출측에서 구현 후 predictScreen만 사용 가능
 * - 영역: 그리드 경계 또는 최근접 중심(Voronoi) + 선택적 inertia
 *
 * 사용 예:
 *   const pts = CalibrationRegion.getCalibPoints(9, { cols: 3, rows: 3 });  // 9점
 *   const pts12 = CalibrationRegion.getCalibPoints(12);                     // 12점 (셀2,5 보강)
 *   const pts25 = CalibrationRegion.getCalibPoints(25);                     // 25점
 *   const idx = CalibrationRegion.getRegionIndex(sx, sy, { cols: 3, rows: 3 }, 'nearest');
 */

const CalibrationRegion = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1) 캘리브레이션 포인트 배치 (화면 비율 0~1)
  // ---------------------------------------------------------------------------

  /**
   * 그리드 포인트 생성. 각 점은 (xRatio, yRatio) in [0,1]^2
   * @param {number} nPoints - 9 (3×3), 12 (3×3+보강3), 또는 25 (5×5)
   * @returns {{ x: number, y: number }[]} 화면 비율 좌표 배열
   */
  function getCalibPoints(nPoints) {
    if (nPoints === 9) {
      const xs = [0.03, 0.50, 0.97];
      const ys = [0.03, 0.50, 0.97];
      const out = [];
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++)
          out.push({ x: xs[col], y: ys[row] });
      return out;
    }
    if (nPoints === 12) {
      return [
        { x: 0.03, y: 0.03 }, { x: 0.20, y: 0.03 }, { x: 0.40, y: 0.03 },
        { x: 0.60, y: 0.03 }, { x: 0.80, y: 0.03 }, { x: 0.97, y: 0.03 },
        { x: 0.03, y: 0.97 }, { x: 0.20, y: 0.97 }, { x: 0.40, y: 0.97 },
        { x: 0.60, y: 0.97 }, { x: 0.80, y: 0.97 }, { x: 0.97, y: 0.97 },
      ];
    }
    if (nPoints === 18) {
      // 3×6 그리드, 센터-퍼스트 순서
      return [
        { x: 0.50, y: 0.50 },
        { x: 0.30, y: 0.50 },
        { x: 0.70, y: 0.50 },
        { x: 0.10, y: 0.50 },
        { x: 0.90, y: 0.50 },
        { x: 0.01, y: 0.50 },
        { x: 0.50, y: 0.01 },
        { x: 0.30, y: 0.01 },
        { x: 0.70, y: 0.01 },
        { x: 0.10, y: 0.01 },
        { x: 0.90, y: 0.01 },
        { x: 0.01, y: 0.01 },
        { x: 0.50, y: 0.99 },
        { x: 0.30, y: 0.99 },
        { x: 0.70, y: 0.99 },
        { x: 0.10, y: 0.99 },
        { x: 0.90, y: 0.99 },
        { x: 0.99, y: 0.99 },
      ];
    }
    if (nPoints === 25) {
      const xy = [0.1, 0.3, 0.5, 0.7, 0.9];
      const out = [];
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 5; col++)
          out.push({ x: xy[col], y: xy[row] });
      return out;
    }
    throw new Error('getCalibPoints: nPoints must be 9, 12, 18, or 25');
  }

  /**
   * 화면 픽셀 크기에 맞춰 캘리 포인트 픽셀 좌표 반환
   */
  function getCalibPointsPx(nPoints, screenWidth, screenHeight) {
    return getCalibPoints(nPoints).map(p => ({
      x: p.x * screenWidth,
      y: p.y * screenHeight,
    }));
  }

  // ---------------------------------------------------------------------------
  // 2) 2차 다항식 특징 (9점 캘리용)
  // ---------------------------------------------------------------------------

  function polyFeats(xNorm, yNorm) {
    return [1, xNorm, yNorm, xNorm * yNorm, xNorm * xNorm, yNorm * yNorm];
  }

  /** Ax = b 최소제곱 해 (정규방정식) */
  function lstsq(X, y) {
    const M = X[0].length;
    const XtX = Array.from({ length: M }, (_, i) =>
      Array.from({ length: M }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0))
    );
    const Xty = Array.from({ length: M }, (_, i) => X.reduce((s, r, k) => s + r[i] * y[k], 0));
    return solve(XtX, Xty);
  }

  function solve(A, b) {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++)
        if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
      const piv = M[col][col];
      if (Math.abs(piv) < 1e-12) continue;
      for (let j = col; j <= n; j++) M[col][j] /= piv;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const f = M[row][col];
        for (let j = col; j <= n; j++) M[row][j] -= f * M[col][j];
      }
    }
    return M.map(row => row[n]);
  }

  /**
   * 캘리 데이터로 2차 다항식 계수 피팅
   * @param {{ screenX: number, screenY: number, xNorm: number, yNorm: number }[]} calibData
   * @returns {{ cx: number[], cy: number[] }}
   */
  function fitPolynomialCalibration(calibData) {
    const X = calibData.map(d => polyFeats(d.xNorm, d.yNorm));
    const sy = calibData.map(d => d.screenX);
    const sx = calibData.map(d => d.screenY);
    return { cx: lstsq(X, sy), cy: lstsq(X, sx) };
  }

  /**
   * (xNorm, yNorm) → 스크린 픽셀 (다항식)
   */
  function predictScreenPolynomial(xNorm, yNorm, cx, cy, screenWidth, screenHeight) {
    const f = polyFeats(xNorm, yNorm);
    const x = f.reduce((s, fi, i) => s + fi * cx[i], 0);
    const y = f.reduce((s, fi, i) => s + fi * cy[i], 0);
    return {
      x: Math.max(0, Math.min(screenWidth, x)),
      y: Math.max(0, Math.min(screenHeight, y)),
    };
  }

  // ---------------------------------------------------------------------------
  // 3) 영역 인덱스 (6분할 / 9분할)
  // These helpers are only for the standalone demo runtime in gaze_server_9grid.html.
  // The frontend integration path keeps using the calibration fit/predict helpers above.
  // ---------------------------------------------------------------------------

  /**
   * 타일 중심 좌표 배열 계산 (픽셀)
   * @param {number} cols - 2(6분할) or 3(9분할)
   * @param {number} rows - 3(6분할) or 3(9분할)
   * @param {number} screenWidth
   * @param {number} screenHeight
   * @returns {[number, number][]} [cx, cy] per tile
   */
  function getTileCentersPx(cols, rows, screenWidth, screenHeight) {
    const centers = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = (col + 0.5) / cols * screenWidth;
        const cy = (row + 0.5) / rows * screenHeight;
        centers.push([cx, cy]);
      }
    }
    return centers;
  }

  /**
   * 스크린 좌표 (sx, sy)를 영역 인덱스로 변환
   * @param {number} sx - 픽셀 x
   * @param {number} sy - 픽셀 y
   * @param {{ cols: number, rows: number }} layout - 6분할 { cols:2, rows:3 } or { cols:3, rows:2 }, 9분할 { cols:3, rows:3 }
   * @param {'grid'|'nearest'} method - 'grid': 경계 기준, 'nearest': 타일 중심 최근접
   * @param {number} screenWidth
   * @param {number} screenHeight
   * @returns {number} 0 ~ (cols*rows - 1)
   */
  function getRegionIndex(sx, sy, layout, method, screenWidth, screenHeight) {
    const { cols, rows } = layout;
    const n = cols * rows;

    if (method === 'grid') {
      const col = Math.floor((sx / screenWidth) * cols);
      const row = Math.floor((sy / screenHeight) * rows);
      const c = Math.max(0, Math.min(cols - 1, col));
      const r = Math.max(0, Math.min(rows - 1, row));
      return r * cols + c;
    }

    // nearest
    const centers = getTileCentersPx(cols, rows, screenWidth, screenHeight);
    let best = 0;
    let bestD2 = Infinity;
    for (let i = 0; i < centers.length; i++) {
      const dx = sx - centers[i][0];
      const dy = sy - centers[i][1];
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    return best;
  }

  /**
   * Inertia 적용: 이전 인덱스 유지, 전환 시 일정 시간 같은 영역이 더 가까워야 전환
   * @param {number} currentIdx - 이번 프레임에서 계산한 영역 인덱스
   * @param {{ lastIdx: number, candidateIdx: number, candidateSince: number }} state
   * @param {number} now - performance.now()
   * @param {{ holdMs: number, margin: number }} options - holdMs: 전환 유지 시간, margin: 거리 비율 (같은 영역이 margin 이상 가까울 때만 전환 후보)
   * @returns {{ idx: number, state: object }}
   */
  function applyInertia(currentIdx, state, now, options) {
    const { holdMs = 260, margin = 0.1 } = options || {};
    let { lastIdx, candidateIdx, candidateSince } = state || { lastIdx: -1, candidateIdx: -1, candidateSince: 0 };

    if (lastIdx < 0) {
      return { idx: currentIdx, state: { lastIdx: currentIdx, candidateIdx: -1, candidateSince: 0 } };
    }
    if (currentIdx === lastIdx) {
      return { idx: lastIdx, state: { lastIdx, candidateIdx: -1, candidateSince: 0 } };
    }

    if (candidateIdx !== currentIdx) {
      candidateIdx = currentIdx;
      candidateSince = now;
    }
    if (now - candidateSince >= holdMs) {
      lastIdx = currentIdx;
      candidateIdx = -1;
    }
    return {
      idx: lastIdx,
      state: { lastIdx, candidateIdx, candidateSince },
    };
  }

  // ---------------------------------------------------------------------------
  // 4) 6 / 9 분할 레이아웃 프리셋
  // ---------------------------------------------------------------------------

  const LAYOUTS = {
    /** 6분할: 2열×3행 (세로로 긴 선택지) */
    split6_2x3: { cols: 2, rows: 3 },
    /** 6분할: 3열×2행 */
    split6_3x2: { cols: 3, rows: 2 },
    /** 9분할: 3×3 */
    split9: { cols: 3, rows: 3 },
  };

  return {
    getCalibPoints,
    getCalibPointsPx,
    polyFeats,
    fitPolynomialCalibration,
    predictScreenPolynomial,
    getTileCentersPx,
    getRegionIndex,
    applyInertia,
    LAYOUTS,
  };
})();

// Export for ES module if present
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CalibrationRegion };
}
