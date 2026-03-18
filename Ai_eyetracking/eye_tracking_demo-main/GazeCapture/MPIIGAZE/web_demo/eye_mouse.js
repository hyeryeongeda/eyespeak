/**
 * Eye Mouse — YOLO Eye Detection + Iris/Sclera YOLO + Calibration
 *
 * Pipeline (홍채 YOLO 있을 때):
 *   Camera → Eye YOLO (640×640) → eye bboxes
 *   → Iris YOLO on full frame → iris(검은자) + sclera(흰자) bboxes
 *   → iris center within sclera bounds → gaze (xNorm, yNorm)
 *   → 9-point calibration → screen (x, y) pixels
 *
 * Fallback (iris.onnx 없을 때):
 *   Camera → Eye YOLO → eye bboxes
 *   → crop 64×64 → dark-pixel centroid → gaze
 *   → 9-point calibration → screen (x, y) pixels
 */

// ── Config ────────────────────────────────────────────────────
const YOLO_MODEL    = 'best.onnx';
const IRIS_MODEL   = 'iris.onnx';    // 홍채/흰자 YOLO (없으면 fallback)
// 학습 완료 후: runs/gaze_aihub/runN/gaze_screen.onnx → web_demo/gaze_screen.onnx 로 복사
const GAZE_NN_MODEL = 'gaze_screen.onnx';  // AI Hub 학습 시선 모델 (우선 사용)
const YOLO_SIZE    = 640;
const GAZE_SIZE    = 64;
const IOU_THRESH   = 0.45;
const CONF_THRESH  = 0.25;
const IRIS_CONF    = 0.30;           // 홍채 검출 신뢰도 임계값
const CLASSES      = ['right_eye', 'left_eye'];
const IRIS_CLASSES = ['iris', 'sclera'];
const COLORS       = { right_eye: '#79c0ff', left_eye: '#ffb3ba' };
const IRIS_COLORS  = { iris: '#ffd700', sclera: '#90ee90' };

// Pupil detection params (weighted centroid: dark × spatial_gaussian)
const PUPIL_SPATIAL_SIGMA = 0.35; // spatial Gaussian sigma (fraction of crop size)
const PUPIL_DARK_POWER    = 3;    // exponent for dark-pixel weighting (higher = focus on darkest)

// YOLO frame skip: run YOLO every N+1 frames, pupil detection every frame
const YOLO_SKIP = 2;              // 0=every frame, 2=every 3rd frame

// Calibration: 9 fixation points (percentage of screen: [x%, y%])
const CALIB_PTS = [
  [0.10, 0.15], [0.50, 0.15], [0.90, 0.15],
  [0.10, 0.50], [0.50, 0.50], [0.90, 0.50],
  [0.10, 0.85], [0.50, 0.85], [0.90, 0.85],
];
const CALIB_COLLECT_MS = 2500;  // ms to collect samples per point
const CALIB_READY_MS   = 600;   // ms show-dot-before-collect phase
const GAZE_SMOOTH_ALPHA = 0.15; // EWM smoothing (낮을수록 더 부드러움)

// ── State machine ─────────────────────────────────────────────
const STATE = {
  INIT:       'INIT',
  CAM_READY:  'CAM_READY',
  CALIB_WAIT: 'CALIB_WAIT',   // ready phase before collecting
  CALIB_COLL: 'CALIB_COLL',   // collecting gaze samples
  FITTING:    'FITTING',
  EYE_MOUSE:  'EYE_MOUSE',
};
let state         = STATE.INIT;
let calibIdx      = 0;           // current calibration point index
let calibPhaseEnd = 0;           // timestamp when current phase ends
let calibSamples  = [];          // [[pupilX, pupilY], ...] for current point
let calibData     = [];          // [{screenX, screenY, xNorm, yNorm}] for each point
let coeffX        = null;        // regression coefficients for x
let coeffY        = null;        // regression coefficients for y
let smoothX       = 0;
let smoothY       = 0;
let firstPrediction = true;

// ImageNet norm (train_gaze_aihub와 동일)
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD  = [0.229, 0.224, 0.225];

// ── ONNX Sessions ─────────────────────────────────────────────
let yoloSession  = null;
let irisSession  = null;   // 홍채/흰자 YOLO (선택적)
let gazeNnSession = null;  // AI Hub 학습 시선 모델 (우선 사용)

// ── DOM refs ──────────────────────────────────────────────────
const video        = document.getElementById('video');
const detectCanvas = document.getElementById('detect-canvas');
const calibCanvas  = document.getElementById('calib-overlay');
const gazeCursor   = document.getElementById('gaze-cursor');
const collectRing  = document.getElementById('collect-ring');
const hudYolo      = document.getElementById('hud-yolo');
const hudGaze      = document.getElementById('hud-gaze');
const hudEyes      = document.getElementById('hud-eyes');
const hudInfer     = document.getElementById('hud-infer');
const hudState     = document.getElementById('hud-state');
const msgBig       = document.getElementById('msg-big');
const msgSub       = document.getElementById('msg-sub');
const infoBar      = document.getElementById('info-bar');
const infoCalibPts = document.getElementById('info-calib-pts');
const btnStartCam  = document.getElementById('btn-start-cam');
const btnCalibrate = document.getElementById('btn-calibrate');
const btnRecalib   = document.getElementById('btn-recalib');
const btnStop      = document.getElementById('btn-stop');

const dctx = detectCanvas.getContext('2d');
const cctx = calibCanvas.getContext('2d');

// ── Utility: resize canvases to viewport ──────────────────────
function resizeCanvases() {
  detectCanvas.width  = window.innerWidth;
  detectCanvas.height = window.innerHeight;
  calibCanvas.width   = window.innerWidth;
  calibCanvas.height  = window.innerHeight;
}
window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// ── Load models ───────────────────────────────────────────────
async function loadModels() {
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';

  // Eye YOLO (face/eye bbox)
  try {
    yoloSession = await ort.InferenceSession.create(YOLO_MODEL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    hudYolo.innerHTML = '<span class="dot-ok">✓ YOLOv8n (눈 검출)</span>';
  } catch (e) {
    hudYolo.innerHTML = `<span class="dot-err">✗ ${e.message.slice(0,30)}</span>`;
    console.error('[YOLO] Load error:', e);
  }

  // Gaze NN (AI Hub 학습 모델) — 있으면 시선 추정에 우선 사용
  try {
    gazeNnSession = await ort.InferenceSession.create(GAZE_NN_MODEL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    hudGaze.innerHTML = '<span class="dot-ok">✓ Gaze NN (AI Hub 학습)</span>';
    console.log('[Gaze NN] gaze_screen.onnx 로드 완료');
  } catch (e) {
    gazeNnSession = null;
    console.info('[Gaze NN] gaze_screen.onnx 없음 → 홍채/동공 방식 사용');
  }

  // Iris YOLO (홍채/흰자) — Gaze NN 없을 때만 사용
  if (!gazeNnSession) {
    try {
      irisSession = await ort.InferenceSession.create(IRIS_MODEL, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      hudGaze.innerHTML = '<span class="dot-ok">✓ 홍채 YOLO (검은자/흰자)</span>';
      console.log('[Iris YOLO] 로드 완료');
    } catch (e) {
      irisSession = null;
      hudGaze.innerHTML = '<span class="dot-ok">✓ 동공 검출 (이미지처리 fallback)</span>';
      console.info('[Iris YOLO] iris.onnx 없음 → dark-pixel 방식으로 동작');
    }
  }

  if (yoloSession) {
    btnStartCam.disabled = false;
    setMsg('모델 로드 완료', '카메라를 시작하세요');
    setState(STATE.INIT);
  }
}

// ── Letterbox (for YOLO) ──────────────────────────────────────
function letterbox(src, targetSize) {
  const sw = src.width, sh = src.height;
  const scale = Math.min(targetSize / sw, targetSize / sh);
  const nw = Math.round(sw * scale), nh = Math.round(sh * scale);
  const padX = Math.floor((targetSize - nw) / 2);
  const padY = Math.floor((targetSize - nh) / 2);
  const dst = document.createElement('canvas');
  dst.width = dst.height = targetSize;
  const ctx2 = dst.getContext('2d');
  ctx2.fillStyle = '#808080';
  ctx2.fillRect(0, 0, targetSize, targetSize);
  ctx2.drawImage(src, 0, 0, sw, sh, padX, padY, nw, nh);
  return { canvas: dst, scale, padX, padY };
}

// ── Canvas → float32 NCHW /255 ───────────────────────────────
function canvasToNCHW(canvas) {
  const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const n = canvas.width * canvas.height;
  const t = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    t[i]         = data[i*4]   / 255;
    t[n + i]     = data[i*4+1] / 255;
    t[2*n + i]   = data[i*4+2] / 255;
  }
  return t;
}

// ── Crop eye region → 64×64 ImageData ────────────────────────
function eyeCropToImageData(srcCanvas, x1, y1, x2, y2) {
  const w = Math.max(1, x2 - x1), h = Math.max(1, y2 - y1);
  const crop = document.createElement('canvas');
  crop.width = GAZE_SIZE; crop.height = GAZE_SIZE;
  const cctx2 = crop.getContext('2d');
  cctx2.drawImage(srcCanvas, x1, y1, w, h, 0, 0, GAZE_SIZE, GAZE_SIZE);
  return cctx2.getImageData(0, 0, GAZE_SIZE, GAZE_SIZE);
}

// ── 64×64 눈 크롭 → ImageNet 정규화 NCHW 텐서 (Gaze NN 입력) ───
function eyeCropToImageNetTensor(srcCanvas, x1, y1, x2, y2) {
  const w = Math.max(1, x2 - x1), h = Math.max(1, y2 - y1);
  const crop = document.createElement('canvas');
  crop.width = GAZE_SIZE; crop.height = GAZE_SIZE;
  crop.getContext('2d').drawImage(srcCanvas, x1, y1, w, h, 0, 0, GAZE_SIZE, GAZE_SIZE);
  const { data } = crop.getContext('2d').getImageData(0, 0, GAZE_SIZE, GAZE_SIZE);
  const n = GAZE_SIZE * GAZE_SIZE;
  const t = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 4]     / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255;
    t[i]         = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    t[n + i]     = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    t[2 * n + i] = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }
  return t;
}

// ── Gaze NN 추론: 눈 크롭들 → (xNorm, yNorm) 평균 ─────────────
async function runGazeNN(capCanvas, detections) {
  if (!gazeNnSession || !detections.length) return null;
  const eyes = detections.filter(d => d.xyxy[2] - d.xyxy[0] > 4 && d.xyxy[3] - d.xyxy[1] > 4);
  if (!eyes.length) return null;
  const inputName = gazeNnSession.inputNames[0];
  const outName   = gazeNnSession.outputNames[0];
  let sumX = 0, sumY = 0, count = 0;
  for (const eye of eyes) {
    const [x1, y1, x2, y2] = eye.xyxy.map(Math.round);
    const tensorData = eyeCropToImageNetTensor(capCanvas, x1, y1, x2, y2);
    const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, GAZE_SIZE, GAZE_SIZE]);
    try {
      const res = await gazeNnSession.run({ [inputName]: inputTensor });
      const out = res[outName];
      const xNorm = out.data[0], yNorm = out.data[1];
      if (Number.isFinite(xNorm) && Number.isFinite(yNorm)) {
        sumX += xNorm; sumY += yNorm; count++;
      }
    } catch (e) {
      console.warn('[Gaze NN] inference error', e);
    }
  }
  if (count === 0) return null;
  return { xNorm: sumX / count, yNorm: sumY / count };
}

// ── Pupil center detection (weighted centroid) ─────────────────
// weight = (1 - gray)^POWER × spatial_gaussian(center)
// → focuses on the very darkest pixels AND prefers the center of the crop.
// Returns { x, y } ∈ [0,1] × [0,1] within the 64×64 eye crop.
function findPupilCenter(imageData) {
  const N    = GAZE_SIZE;
  const data = imageData.data;
  const cx   = (N - 1) / 2;
  const cy   = (N - 1) / 2;
  const sig2 = 2 * Math.pow(N * PUPIL_SPATIAL_SIGMA, 2);

  let sumX = 0, sumY = 0, sumW = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i    = (y * N + x) * 4;
      const gray = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;

      // Dark weight: cube of "darkness" — very dark pixels dominate
      const darkW = Math.pow(1 - gray, PUPIL_DARK_POWER);

      // Spatial Gaussian: prefer center of the crop
      const dx = x - cx, dy = y - cy;
      const spatW = Math.exp(-(dx * dx + dy * dy) / sig2);

      const w = darkW * spatW;
      sumX += x * w;
      sumY += y * w;
      sumW += w;
    }
  }
  if (sumW < 1e-6) return null;
  return { x: sumX / sumW / N, y: sumY / sumW / N };
}

// ── NMS ───────────────────────────────────────────────────────
function iou(a, b) {
  const ix1 = Math.max(a[0], b[0]), iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]), iy2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, ix2-ix1) * Math.max(0, iy2-iy1);
  const ua = (a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - inter;
  return ua > 0 ? inter / ua : 0;
}
function nms(boxes) {
  boxes.sort((a, b) => b.score - a.score);
  const keep = []; const sup = new Uint8Array(boxes.length);
  for (let i = 0; i < boxes.length; i++) {
    if (sup[i]) continue;
    keep.push(boxes[i]);
    for (let j = i+1; j < boxes.length; j++) {
      if (!sup[j] && iou(boxes[i].xyxy, boxes[j].xyxy) > IOU_THRESH) sup[j] = 1;
    }
  }
  return keep;
}

// ── Parse YOLO output [1, (4+nc), 8400] ──────────────────────
function parseYoloGeneric(output, origW, origH, scale, padX, padY, classNames, confThresh) {
  const data = output.data, na = output.dims[2], nc = classNames.length;
  const boxes = [];
  for (let a = 0; a < na; a++) {
    const cx = data[a], cy = data[na+a], w = data[2*na+a], h = data[3*na+a];
    let best = -1, cls = -1;
    for (let c = 0; c < nc; c++) {
      const s = data[(4+c)*na+a];
      if (s > best) { best = s; cls = c; }
    }
    if (best < confThresh) continue;
    const x1 = Math.max(0, ((cx - w/2) - padX) / scale);
    const y1 = Math.max(0, ((cy - h/2) - padY) / scale);
    const x2 = Math.min(origW, ((cx + w/2) - padX) / scale);
    const y2 = Math.min(origH, ((cy + h/2) - padY) / scale);
    boxes.push({ xyxy: [x1,y1,x2,y2], score: best, cls, label: classNames[cls] });
  }
  const result = [];
  for (let c = 0; c < nc; c++) result.push(...nms(boxes.filter(b => b.cls === c)));
  return result;
}

function parseYolo(output, origW, origH, scale, padX, padY) {
  return parseYoloGeneric(output, origW, origH, scale, padX, padY, CLASSES, CONF_THRESH);
}

// ── Run Iris YOLO on full frame → { iris: [], sclera: [] } ───
async function runIrisYolo(capCanvas) {
  if (!irisSession) return null;
  const origW = capCanvas.width, origH = capCanvas.height;
  const { canvas: lb, scale, padX, padY } = letterbox(capCanvas, YOLO_SIZE);
  const tensor = new ort.Tensor('float32', canvasToNCHW(lb), [1, 3, YOLO_SIZE, YOLO_SIZE]);
  try {
    const res = await irisSession.run({ [irisSession.inputNames[0]]: tensor });
    const dets = parseYoloGeneric(
      res[irisSession.outputNames[0]], origW, origH, scale, padX, padY,
      IRIS_CLASSES, IRIS_CONF
    );
    return {
      iris:   dets.filter(d => d.label === 'iris'),
      sclera: dets.filter(d => d.label === 'sclera'),
    };
  } catch (e) {
    console.error('[Iris YOLO] inference error:', e);
    return null;
  }
}

// ── Draw iris/sclera boxes ─────────────────────────────────────
function drawIrisBoxes(irisDets, videoRect, origW, origH) {
  if (!irisDets) return;
  const vW = videoRect.width, vH = videoRect.height;
  const vidAspect = origW / origH, elAspect = vW / vH;
  let dW, dH;
  if (vidAspect > elAspect) { dW = vW; dH = vW / vidAspect; }
  else                       { dH = vH; dW = vH * vidAspect; }
  const offX = videoRect.left + (vW - dW) / 2;
  const offY = videoRect.top  + (vH - dH) / 2;
  const sX = dW / origW, sY = dH / origH;

  for (const d of [...irisDets.iris, ...irisDets.sclera]) {
    const rx1 = offX + (origW - d.xyxy[2]) * sX;
    const ry1 = offY + d.xyxy[1] * sY;
    const rw  = (d.xyxy[2] - d.xyxy[0]) * sX;
    const rh  = (d.xyxy[3] - d.xyxy[1]) * sY;
    const color = IRIS_COLORS[d.label] || '#fff';
    dctx.strokeStyle = color; dctx.lineWidth = 2;
    dctx.strokeRect(rx1, ry1, rw, rh);
    // center dot for iris
    if (d.label === 'iris') {
      const icx = rx1 + rw / 2, icy = ry1 + rh / 2;
      dctx.beginPath();
      dctx.arc(icx, icy, 3, 0, Math.PI * 2);
      dctx.fillStyle = color;
      dctx.fill();
    }
  }
}

// ── Draw detection boxes on detect-canvas ────────────────────
function drawBoxes(detections, videoRect, origW, origH) {
  dctx.clearRect(0, 0, detectCanvas.width, detectCanvas.height);
  if (!detections.length) return;

  // video element fills viewport via object-fit:contain, mirrored
  const vW = videoRect.width, vH = videoRect.height;
  const vidAspect = origW / origH, elAspect = vW / vH;
  let dW, dH;
  if (vidAspect > elAspect) { dW = vW; dH = vW / vidAspect; }
  else                       { dH = vH; dW = vH * vidAspect; }
  const offX = videoRect.left + (vW - dW) / 2;
  const offY = videoRect.top  + (vH - dH) / 2;
  const sX = dW / origW, sY = dH / origH;

  for (const d of detections) {
    // mirror x because video is CSS-mirrored
    const rx1 = offX + (origW - d.xyxy[2]) * sX;
    const ry1 = offY + d.xyxy[1] * sY;
    const rw  = (d.xyxy[2] - d.xyxy[0]) * sX;
    const rh  = (d.xyxy[3] - d.xyxy[1]) * sY;

    const color = COLORS[d.label] || '#fff';
    dctx.strokeStyle = color; dctx.lineWidth = 2.5;
    dctx.strokeRect(rx1, ry1, rw, rh);

    const label = `${d.label} ${(d.score*100).toFixed(0)}%`;
    dctx.font = 'bold 12px monospace';
    const tw = dctx.measureText(label).width;
    dctx.fillStyle = color;
    dctx.fillRect(rx1-1, ry1-18, tw+8, 18);
    dctx.fillStyle = '#0d1117';
    dctx.fillText(label, rx1+3, ry1-4);
  }
}

// ── Calibration dot renderer ──────────────────────────────────
function getCalibPxPos(idx) {
  const [px, py] = CALIB_PTS[idx];
  return { x: px * window.innerWidth, y: py * window.innerHeight };
}

function drawCalibDot(idx, phase, progress) {
  // phase: 'ready' | 'collect', progress: 0..1 (only for collect)
  cctx.clearRect(0, 0, calibCanvas.width, calibCanvas.height);
  const { x, y } = getCalibPxPos(idx);
  const R = 22;

  // dark vignette during calibration
  cctx.fillStyle = 'rgba(0,0,0,0.5)';
  cctx.fillRect(0, 0, calibCanvas.width, calibCanvas.height);

  // progress arc (blue fill during collect)
  if (phase === 'collect' && progress > 0) {
    cctx.beginPath();
    cctx.moveTo(x, y);
    cctx.arc(x, y, R + 8, -Math.PI/2, -Math.PI/2 + progress * Math.PI * 2);
    cctx.closePath();
    cctx.fillStyle = 'rgba(88,166,255,0.25)';
    cctx.fill();

    cctx.beginPath();
    cctx.arc(x, y, R + 8, -Math.PI/2, -Math.PI/2 + progress * Math.PI * 2);
    cctx.strokeStyle = '#58a6ff';
    cctx.lineWidth = 3;
    cctx.stroke();
  }

  // outer ring
  cctx.beginPath();
  cctx.arc(x, y, R, 0, Math.PI*2);
  cctx.strokeStyle = phase === 'ready' ? 'rgba(255,255,255,0.5)' : '#58a6ff';
  cctx.lineWidth = 2;
  cctx.stroke();

  // center dot
  cctx.beginPath();
  cctx.arc(x, y, 5, 0, Math.PI*2);
  cctx.fillStyle = phase === 'ready' ? '#e6edf3' : '#58a6ff';
  cctx.fill();

  // point counter
  cctx.font = '13px monospace';
  cctx.fillStyle = 'rgba(255,255,255,0.7)';
  cctx.textAlign = 'center';
  cctx.fillText(`${idx+1} / ${CALIB_PTS.length}`, x, y + R + 20);
  cctx.textAlign = 'left';
}

function clearCalibCanvas() {
  cctx.clearRect(0, 0, calibCanvas.width, calibCanvas.height);
}

// ── Draw gaze cursor ──────────────────────────────────────────
function showCursor(x, y) {
  gazeCursor.style.display = 'block';
  gazeCursor.style.left    = x + 'px';
  gazeCursor.style.top     = y + 'px';
}
function hideCursor() { gazeCursor.style.display = 'none'; }

// ── Polynomial regression (2nd order, 6 features) ────────────
// Features: [1, x, y, x*y, x², y²]
function polyFeats(x, y) {
  return [1, x, y, x * y, x * x, y * y];
}

// Solve Ax = b via Gaussian elimination with partial pivoting
function solve(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivRow = col;
    for (let r = col+1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivRow][col])) pivRow = r;
    }
    [M[col], M[pivRow]] = [M[pivRow], M[col]];
    const pv = M[col][col];
    if (Math.abs(pv) < 1e-12) continue; // singular column
    for (let r = col+1; r < n; r++) {
      const f = M[r][col] / pv;
      for (let k = col; k <= n; k++) M[r][k] -= f * M[col][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n-1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i+1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

// Least squares: (X^T X) a = X^T y
function lstsq(X, y) {
  const N = X.length, M = X[0].length;
  const XtX = Array.from({length: M}, (_, i) =>
    Array.from({length: M}, (_, j) => X.reduce((s, r) => s + r[i]*r[j], 0))
  );
  const Xty = Array.from({length: M}, (_, i) => X.reduce((s, r, k) => s + r[i]*y[k], 0));
  return solve(XtX, Xty);
}

function fitCalibration(calibData) {
  // calibData: [{screenX, screenY, xNorm, yNorm}]
  const X  = calibData.map(d => polyFeats(d.xNorm, d.yNorm));
  const sy = calibData.map(d => d.screenX);
  const sx = calibData.map(d => d.screenY);
  return { cx: lstsq(X, sy), cy: lstsq(X, sx) };
}

function predictScreen(xNorm, yNorm, cx, cy) {
  const f = polyFeats(xNorm, yNorm);
  const x = f.reduce((s, fi, i) => s + fi * cx[i], 0);
  const y = f.reduce((s, fi, i) => s + fi * cy[i], 0);
  return {
    x: Math.max(0, Math.min(window.innerWidth,  x)),
    y: Math.max(0, Math.min(window.innerHeight, y)),
  };
}

// ── Gaze from Iris YOLO detections ────────────────────────────
// 홍채 중심 위치를 흰자(sclera) 범위로 정규화 → gaze (xNorm, yNorm)
// xNorm/yNorm: 0=왼쪽/위, 1=오른쪽/아래 (흰자 안에서의 홍채 위치)
function gazeFromIris(irisDets) {
  const { iris, sclera } = irisDets;
  if (!iris.length) return null;

  // 양쪽 눈 홍채를 평균
  let sumX = 0, sumY = 0, count = 0;
  for (const ir of iris) {
    const irCx = (ir.xyxy[0] + ir.xyxy[2]) / 2;
    const irCy = (ir.xyxy[1] + ir.xyxy[3]) / 2;

    // 같은 쪽 sclera 찾기 (홍채 중심에 가장 가까운 것)
    let sc = null, minD = Infinity;
    for (const s of sclera) {
      const scCx = (s.xyxy[0] + s.xyxy[2]) / 2;
      const scCy = (s.xyxy[1] + s.xyxy[3]) / 2;
      const d = Math.hypot(irCx - scCx, irCy - scCy);
      if (d < minD) { minD = d; sc = s; }
    }

    let xNorm, yNorm;
    if (sc && minD < 80) {
      // sclera 기준 정규화: 홍채가 흰자 안 어디에 있는지
      const scW = sc.xyxy[2] - sc.xyxy[0];
      const scH = sc.xyxy[3] - sc.xyxy[1];
      xNorm = (irCx - sc.xyxy[0]) / (scW || 1);
      yNorm = (irCy - sc.xyxy[1]) / (scH || 1);
    } else {
      // sclera 없으면 전체 프레임 기준 정규화
      xNorm = irCx / (capCanvas.width  || 1);
      yNorm = irCy / (capCanvas.height || 1);
    }
    sumX += xNorm; sumY += yNorm; count++;
  }
  if (!count) return null;
  return { xNorm: sumX / count, yNorm: sumY / count };
}

// ── Gaze: iris YOLO 우선, fallback → dark-pixel centroid ─────
// Returns { xNorm, yNorm }
function runGazeFallback(capCanvas, detections) {
  // dark-pixel centroid fallback (기존 방식)
  const eyes = detections.filter(d => d.xyxy[2] > d.xyxy[0] + 4 && d.xyxy[3] > d.xyxy[1] + 4);
  if (!eyes.length) return null;
  let sumX = 0, sumY = 0, count = 0;
  for (const eye of eyes) {
    const [x1, y1, x2, y2] = eye.xyxy.map(Math.round);
    const imgData = eyeCropToImageData(capCanvas, x1, y1, x2, y2);
    const pupil   = findPupilCenter(imgData);
    if (pupil) { sumX += pupil.x; sumY += pupil.y; count++; }
  }
  if (!count) return null;
  return { xNorm: sumX / count, yNorm: sumY / count };
}

// ── Median of array ───────────────────────────────────────────
function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
}

// ── State helpers ─────────────────────────────────────────────
function setState(s) {
  state = s;
  const labels = {
    [STATE.INIT]:       '대기',
    [STATE.CAM_READY]:  '카메라 준비',
    [STATE.CALIB_WAIT]: '캘리브레이션 준비',
    [STATE.CALIB_COLL]: '데이터 수집 중',
    [STATE.FITTING]:    '모델 피팅',
    [STATE.EYE_MOUSE]:  '시선 마우스 동작 중',
  };
  hudState.textContent = labels[s] || s;
}

function setMsg(big, sub='') {
  msgBig.textContent = big;
  msgSub.textContent = sub;
}

// ── Main inference loop ───────────────────────────────────────
const capCanvas = document.createElement('canvas');
let running      = false;
let animId       = null;
let frameCount   = 0;
let lastDets     = [];   // cached YOLO detections from previous frame

async function inferLoop() {
  if (!running) return;
  if (video.readyState < 2) { animId = requestAnimationFrame(inferLoop); return; }

  const origW = video.videoWidth, origH = video.videoHeight;
  capCanvas.width = origW; capCanvas.height = origH;
  // Flip horizontally to match the CSS-mirrored video
  const cc = capCanvas.getContext('2d');
  cc.save();
  cc.translate(origW, 0);
  cc.scale(-1, 1);
  cc.drawImage(video, 0, 0);
  cc.restore();

  const t0 = performance.now();

  // Run YOLO only every YOLO_SKIP+1 frames for speed; reuse cached bbox otherwise
  frameCount++;
  if (frameCount % (YOLO_SKIP + 1) === 1) {
    const { canvas: lbCanvas, scale, padX, padY } = letterbox(capCanvas, YOLO_SIZE);
    const yoloTensor = new ort.Tensor('float32', canvasToNCHW(lbCanvas), [1, 3, YOLO_SIZE, YOLO_SIZE]);
    try {
      const res = await yoloSession.run({ [yoloSession.inputNames[0]]: yoloTensor });
      lastDets = parseYolo(res[yoloSession.outputNames[0]], origW, origH, scale, padX, padY);
    } catch (e) {
      console.error('[YOLO] inference error:', e);
    }
  }
  const detections = lastDets;

  // Gaze 계산: Gaze NN(학습 모델) 우선 → iris YOLO → dark-pixel fallback
  let gaze = null;
  let irisDets = null;
  if (gazeNnSession && detections.length > 0) {
    gaze = await runGazeNN(capCanvas, detections);
  }
  if (!gaze && irisSession) {
    irisDets = await runIrisYolo(capCanvas);
    if (irisDets) gaze = gazeFromIris(irisDets);
  }
  if (!gaze && detections.length > 0) {
    gaze = runGazeFallback(capCanvas, detections);
  }

  const inferMs = performance.now() - t0;
  hudInfer.textContent = inferMs.toFixed(0) + ' ms';
  const irisCount = irisDets ? irisDets.iris.length : 0;
  hudEyes.textContent = detections.length
    ? `눈 ${detections.length}개${irisCount ? ` / 홍채 ${irisCount}개` : ''}`
    : '없음';

  // Draw detection boxes
  const videoRect = video.getBoundingClientRect();
  drawBoxes(detections, videoRect, origW, origH);
  if (irisDets) drawIrisBoxes(irisDets, videoRect, origW, origH);

  const now = performance.now();

  // ── State-specific logic ─────────────────────────────────────
  if (state === STATE.CALIB_WAIT) {
    const { x, y } = getCalibPxPos(calibIdx);
    drawCalibDot(calibIdx, 'ready', 0);

    // Position collect-ring
    collectRing.style.display = 'block';
    collectRing.style.left    = x + 'px';
    collectRing.style.top     = y + 'px';
    collectRing.style.width   = collectRing.style.height = '60px';

    if (now >= calibPhaseEnd) {
      // Start collecting
      calibSamples = [];
      calibPhaseEnd = now + CALIB_COLLECT_MS;
      setState(STATE.CALIB_COLL);
      setMsg(`포인트 ${calibIdx + 1} / ${CALIB_PTS.length}`, '점을 바라보세요');
    }
  }

  else if (state === STATE.CALIB_COLL) {
    const elapsed  = CALIB_COLLECT_MS - (calibPhaseEnd - now);
    const progress = Math.min(1, elapsed / CALIB_COLLECT_MS);
    drawCalibDot(calibIdx, 'collect', progress);

    if (gaze) calibSamples.push([gaze.xNorm, gaze.yNorm]);

    if (now >= calibPhaseEnd) {
      // Store median of collected samples
      if (calibSamples.length >= 3) {
        const xs = calibSamples.map(s => s[0]);
        const ys = calibSamples.map(s => s[1]);
        const { x, y } = getCalibPxPos(calibIdx);
        calibData.push({ screenX: x, screenY: y, xNorm: median(xs), yNorm: median(ys) });
        infoCalibPts.textContent = calibData.length;
      }

      calibIdx++;
      if (calibIdx >= CALIB_PTS.length) {
        // All points done → fit
        setState(STATE.FITTING);
        clearCalibCanvas();
        collectRing.style.display = 'none';
        setMsg('피팅 중...', '');
        animId = requestAnimationFrame(inferLoop);
        return;
      } else {
        // Next point: ready phase
        calibPhaseEnd = now + CALIB_READY_MS;
        setState(STATE.CALIB_WAIT);
        setMsg(`포인트 ${calibIdx + 1} / ${CALIB_PTS.length}`, '다음 점으로 시선을 이동하세요');
      }
    }
  }

  else if (state === STATE.FITTING) {
    if (calibData.length < 4) {
      setMsg('데이터 부족', `${calibData.length}개 포인트만 수집됨. 재캘리브레이션 필요`);
      setState(STATE.CAM_READY);
    } else {
      const result = fitCalibration(calibData);
      coeffX = result.cx;
      coeffY = result.cy;
      firstPrediction = true;
      setState(STATE.EYE_MOUSE);
      setMsg('', '');
      infoBar.style.display = 'block';
      gazeCursor.style.display = 'block';
      btnRecalib.disabled = false;
      setMsg('시선 마우스 활성화', '');
      setTimeout(() => { if (state === STATE.EYE_MOUSE) setMsg('', ''); }, 1500);
    }
    animId = requestAnimationFrame(inferLoop);
    return;
  }

  else if (state === STATE.EYE_MOUSE) {
    if (gaze) {
      let px, py;
      if (coeffX && coeffY) {
        // Calibrated: use polynomial regression mapping pupil → screen
        const pos = predictScreen(gaze.xNorm, gaze.yNorm, coeffX, coeffY);
        px = pos.x; py = pos.y;
      } else {
        // No calibration — cannot use pupil coords directly (need calibration)
        animId = requestAnimationFrame(inferLoop);
        return;
      }
      if (firstPrediction) {
        smoothX = px; smoothY = py;
        firstPrediction = false;
      } else {
        smoothX = GAZE_SMOOTH_ALPHA * px + (1 - GAZE_SMOOTH_ALPHA) * smoothX;
        smoothY = GAZE_SMOOTH_ALPHA * py + (1 - GAZE_SMOOTH_ALPHA) * smoothY;
      }
      showCursor(smoothX, smoothY);
    }
  }

  animId = requestAnimationFrame(inferLoop);
}

// ── Camera control ────────────────────────────────────────────
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    running = true;
    setState(STATE.CAM_READY);
    setMsg('카메라 준비 완료', '캘리브레이션을 시작하세요');

    btnStartCam.disabled = true;
    btnCalibrate.disabled = false;
    btnStop.disabled = false;

    animId = requestAnimationFrame(inferLoop);
  } catch (e) {
    setMsg('카메라 오류', e.message);
  }
}

function stopCamera() {
  running = false;
  frameCount = 0; lastDets = [];
  cancelAnimationFrame(animId);
  video.srcObject?.getTracks().forEach(t => t.stop());
  video.srcObject = null;
  dctx.clearRect(0, 0, detectCanvas.width, detectCanvas.height);
  clearCalibCanvas();
  hideCursor();
  collectRing.style.display = 'none';
  infoBar.style.display = 'none';
  setMsg('중지됨', '카메라를 다시 시작하세요');
  setState(STATE.INIT);
  btnStartCam.disabled = false;
  btnCalibrate.disabled = true;
  btnRecalib.disabled = true;
  btnStop.disabled = true;
}

function startCalibration() {
  calibIdx   = 0;
  calibData  = [];
  calibSamples = [];
  coeffX = null; coeffY = null;
  hideCursor();
  infoBar.style.display = 'none';
  infoCalibPts.textContent = '0';

  btnCalibrate.disabled = true;
  btnRecalib.disabled   = true;

  calibPhaseEnd = performance.now() + CALIB_READY_MS;
  setState(STATE.CALIB_WAIT);
  setMsg(`포인트 1 / ${CALIB_PTS.length}`, '화면에 나타나는 점을 차례로 바라보세요');
}

function recalibrate() {
  clearCalibCanvas();
  hideCursor();
  startCalibration();
}

// ── Button events ─────────────────────────────────────────────
btnStartCam.addEventListener('click', startCamera);
btnCalibrate.addEventListener('click', startCalibration);
btnRecalib.addEventListener('click',  recalibrate);
btnStop.addEventListener('click',     stopCamera);

// ── Init ──────────────────────────────────────────────────────
setMsg('모델 로딩 중...', 'YOLOv8n (약 5-10초)');
loadModels();
