/**
 * YOLOv8n Eye Detection — ONNX Runtime Web
 *
 * YOLOv8 output layout: [1, 6, 8400]
 *   - dim 1: [cx, cy, w, h, score_right_eye, score_left_eye]
 *   - 8400 anchors (80×80 + 40×40 + 20×20 = 8400)
 *
 * Preprocessing: letterbox → 640×640, BGR→RGB, /255, CHW, float32
 */

// ── Config ─────────────────────────────────────────────────────
const MODEL_PATH  = 'best.onnx';   // served from same directory
const INPUT_SIZE  = 640;
const CLASSES     = ['right_eye', 'left_eye'];
const COLORS      = { right_eye: '#79c0ff', left_eye: '#ffb3ba' };
const IOU_THRESH  = 0.45;

// ── State ──────────────────────────────────────────────────────
let session = null;
let animId  = null;
let running = false;
let confThreshold = 0.45;

// stats
let totalFrames   = 0;
let detectFrames  = 0;
let bothEyeFrames = 0;
let sumConf       = 0;
let sumInfer      = 0;
let confCount     = 0;
let inferCount    = 0;
let fpsLastTime   = 0;
let fpsFrameCount = 0;

// ── DOM refs ───────────────────────────────────────────────────
const video       = document.getElementById('video');
const overlay     = document.getElementById('overlay');
const ctx         = overlay.getContext('2d');
const btnStart    = document.getElementById('btn-start');
const btnStop     = document.getElementById('btn-stop');
const btnShot     = document.getElementById('btn-screenshot');
const confSlider  = document.getElementById('conf-slider');
const confValEl   = document.getElementById('conf-val');
const modelStatus = document.getElementById('model-status');
const inferTimeEl = document.getElementById('infer-time');
const fpsEl       = document.getElementById('fps-val');
const resultBody  = document.getElementById('result-body');
const detectCount = document.getElementById('detect-count');

// stats DOM
const totalFramesEl  = document.getElementById('total-frames');
const detectFramesEl = document.getElementById('detect-frames');
const detectRateEl   = document.getElementById('detect-rate');
const avgConfEl      = document.getElementById('avg-conf');
const avgInferEl     = document.getElementById('avg-infer');
const bothEyesEl     = document.getElementById('both-eyes-rate');

// ── Load model ─────────────────────────────────────────────────
async function loadModel() {
  modelStatus.textContent = '로딩 중...';
  modelStatus.style.color = '#ffa657';
  try {
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    modelStatus.textContent = 'YOLOv8n (ONNX) ✓';
    modelStatus.style.color = '#3fb950';
    console.log('[ORT] Model loaded. Inputs:', session.inputNames, 'Outputs:', session.outputNames);
  } catch (e) {
    modelStatus.textContent = '로드 실패: ' + e.message;
    modelStatus.style.color = '#f78166';
    console.error('[ORT] Load error:', e);
  }
}

// ── Letterbox resize ───────────────────────────────────────────
function letterbox(srcCanvas, targetSize) {
  const sw = srcCanvas.width;
  const sh = srcCanvas.height;
  const scale = Math.min(targetSize / sw, targetSize / sh);
  const nw = Math.round(sw * scale);
  const nh = Math.round(sh * scale);
  const padX = Math.floor((targetSize - nw) / 2);
  const padY = Math.floor((targetSize - nh) / 2);

  const dst = document.createElement('canvas');
  dst.width = dst.height = targetSize;
  const dctx = dst.getContext('2d');
  dctx.fillStyle = '#808080';  // grey pad (YOLOv8 default)
  dctx.fillRect(0, 0, targetSize, targetSize);
  dctx.drawImage(srcCanvas, 0, 0, sw, sh, padX, padY, nw, nh);

  return { canvas: dst, scale, padX, padY };
}

// ── Canvas → float32 tensor (NCHW, /255) ──────────────────────
function canvasToTensor(canvas) {
  const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const n = canvas.width * canvas.height;
  const tensor = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    tensor[i]         = data[i * 4]     / 255;  // R
    tensor[n + i]     = data[i * 4 + 1] / 255;  // G
    tensor[2 * n + i] = data[i * 4 + 2] / 255;  // B
  }
  return tensor;
}

// ── NMS ───────────────────────────────────────────────────────
function iou(a, b) {
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]);
  const iy2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const ua = (a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - inter;
  return ua > 0 ? inter / ua : 0;
}

function nms(boxes, iouThresh) {
  boxes.sort((a, b) => b.score - a.score);
  const keep = [];
  const suppressed = new Uint8Array(boxes.length);
  for (let i = 0; i < boxes.length; i++) {
    if (suppressed[i]) continue;
    keep.push(boxes[i]);
    for (let j = i + 1; j < boxes.length; j++) {
      if (!suppressed[j] && iou(boxes[i].xyxy, boxes[j].xyxy) > iouThresh) {
        suppressed[j] = 1;
      }
    }
  }
  return keep;
}

// ── Parse YOLOv8 output [1, 6, 8400] ──────────────────────────
function parseOutput(output, imgW, imgH, scale, padX, padY, conf) {
  // output.dims = [1, 6, 8400] where 6 = [cx,cy,w,h, cls0, cls1]
  const data  = output.data;
  const nc    = CLASSES.length;         // 2
  const na    = output.dims[2];         // 8400
  const boxes = [];

  for (let a = 0; a < na; a++) {
    const cx = data[0 * na + a];
    const cy = data[1 * na + a];
    const w  = data[2 * na + a];
    const h  = data[3 * na + a];

    let maxScore = -1, maxCls = -1;
    for (let c = 0; c < nc; c++) {
      const s = data[(4 + c) * na + a];
      if (s > maxScore) { maxScore = s; maxCls = c; }
    }

    if (maxScore < conf) continue;

    // undo letterbox → original image coords
    const x1 = ((cx - w / 2) - padX) / scale;
    const y1 = ((cy - h / 2) - padY) / scale;
    const x2 = ((cx + w / 2) - padX) / scale;
    const y2 = ((cy + h / 2) - padY) / scale;

    boxes.push({
      xyxy:  [Math.max(0, x1), Math.max(0, y1), Math.min(imgW, x2), Math.min(imgH, y2)],
      score: maxScore,
      cls:   maxCls,
      label: CLASSES[maxCls],
    });
  }

  // per-class NMS
  const result = [];
  for (let c = 0; c < nc; c++) {
    const sub = boxes.filter(b => b.cls === c);
    result.push(...nms(sub, IOU_THRESH));
  }
  return result;
}

// ── Draw detections ───────────────────────────────────────────
function drawDetections(detections, displayW, displayH, origW, origH) {
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  const scaleX = displayW / origW;
  const scaleY = displayH / origH;

  // Offset for letterboxed video inside the canvas
  const offX = (overlay.width  - displayW) / 2;
  const offY = (overlay.height - displayH) / 2;

  for (const d of detections) {
    const [x1, y1, x2, y2] = d.xyxy;
    const rx = x1 * scaleX + offX;
    const ry = y1 * scaleY + offY;
    const rw = (x2 - x1) * scaleX;
    const rh = (y2 - y1) * scaleY;

    const color = COLORS[d.label] || '#fff';
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.strokeRect(rx, ry, rw, rh);

    // label background
    const label = `${d.label} ${(d.score * 100).toFixed(1)}%`;
    ctx.font = 'bold 13px monospace';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillRect(rx - 1, ry - 20, tw + 8, 20);
    ctx.fillStyle = '#0d1117';
    ctx.fillText(label, rx + 3, ry - 5);
  }
}

// ── Update result table ───────────────────────────────────────
function updateTable(detections) {
  resultBody.innerHTML = '';
  detectCount.textContent = `(${detections.length}건)`;
  for (const d of detections) {
    const [x1, y1, x2, y2] = d.xyxy.map(v => Math.round(v));
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="class-${d.label.replace('_eye','')}">${d.label}</td>
      <td>${(d.score * 100).toFixed(1)}%</td>
      <td>${x1}, ${y1}</td>
      <td>${x2}, ${y2}</td>
      <td>${x2-x1} × ${y2-y1}</td>
    `;
    resultBody.appendChild(tr);
  }
}

// ── Inference loop ────────────────────────────────────────────
const capCanvas = document.createElement('canvas');

async function inferFrame() {
  if (!running || !session) { animId = requestAnimationFrame(inferFrame); return; }
  if (video.readyState < 2) { animId = requestAnimationFrame(inferFrame); return; }

  const origW = video.videoWidth;
  const origH = video.videoHeight;
  capCanvas.width  = origW;
  capCanvas.height = origH;
  capCanvas.getContext('2d').drawImage(video, 0, 0);

  const { canvas: lbCanvas, scale, padX, padY } = letterbox(capCanvas, INPUT_SIZE);
  const tensorData = canvasToTensor(lbCanvas);
  const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]);

  const t0 = performance.now();
  let output;
  try {
    const results = await session.run({ [session.inputNames[0]]: inputTensor });
    output = results[session.outputNames[0]];
  } catch (e) {
    console.error('[ORT] Inference error:', e);
    animId = requestAnimationFrame(inferFrame);
    return;
  }
  const inferMs = performance.now() - t0;

  // sync overlay size to video display size
  const rect = video.getBoundingClientRect();
  overlay.width  = rect.width;
  overlay.height = rect.height;

  const detections = parseOutput(output, origW, origH, scale, padX, padY, confThreshold);

  // compute display dimensions (letterboxed video in element)
  const vidAspect = origW / origH;
  const elAspect  = rect.width / rect.height;
  let dW, dH;
  if (vidAspect > elAspect) { dW = rect.width;  dH = rect.width  / vidAspect; }
  else                       { dH = rect.height; dW = rect.height * vidAspect; }

  drawDetections(detections, dW, dH, origW, origH);
  updateTable(detections);

  // ── Stats update ────────────────────────────────────────────
  totalFrames++;
  sumInfer  += inferMs;
  inferCount++;
  inferTimeEl.textContent = inferMs.toFixed(1);

  if (detections.length > 0) {
    detectFrames++;
    const frameConf = detections.reduce((a, b) => a + b.score, 0) / detections.length;
    sumConf   += frameConf;
    confCount++;
  }
  const rightDetected = detections.some(d => d.cls === 0);
  const leftDetected  = detections.some(d => d.cls === 1);
  if (rightDetected && leftDetected) bothEyeFrames++;

  // FPS
  fpsFrameCount++;
  const now = performance.now();
  if (now - fpsLastTime >= 1000) {
    fpsEl.textContent = fpsFrameCount;
    fpsFrameCount  = 0;
    fpsLastTime    = now;
  }

  // Update summary panel
  totalFramesEl.textContent  = totalFrames;
  detectFramesEl.textContent = detectFrames;
  detectRateEl.textContent   = `${(detectFrames / totalFrames * 100).toFixed(1)}%`;
  avgConfEl.textContent      = confCount > 0 ? `${(sumConf / confCount * 100).toFixed(1)}%` : '—';
  avgInferEl.textContent     = inferCount > 0 ? `${(sumInfer / inferCount).toFixed(1)} ms` : '—';
  bothEyesEl.textContent     = `${(bothEyeFrames / totalFrames * 100).toFixed(1)}%`;

  animId = requestAnimationFrame(inferFrame);
}

// ── Webcam ───────────────────────────────────────────────────
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    running = true;
    btnStart.disabled = true;
    btnStop.disabled  = false;
    btnShot.disabled  = false;
    animId = requestAnimationFrame(inferFrame);
  } catch (e) {
    alert('카메라 접근 실패: ' + e.message);
  }
}

function stopCamera() {
  running = false;
  cancelAnimationFrame(animId);
  video.srcObject?.getTracks().forEach(t => t.stop());
  video.srcObject = null;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  btnStart.disabled = false;
  btnStop.disabled  = true;
  btnShot.disabled  = true;
}

function takeScreenshot() {
  const merged = document.createElement('canvas');
  merged.width  = video.videoWidth;
  merged.height = video.videoHeight;
  const mc = merged.getContext('2d');
  mc.drawImage(video, 0, 0);
  mc.drawImage(overlay, 0, 0, merged.width, merged.height);
  const link = document.createElement('a');
  link.download = `eye_detection_${Date.now()}.png`;
  link.href = merged.toDataURL();
  link.click();
}

// ── Event listeners ───────────────────────────────────────────
confSlider.addEventListener('input', () => {
  confThreshold = parseFloat(confSlider.value);
  confValEl.textContent = confThreshold.toFixed(2);
});
btnStart.addEventListener('click', startCamera);
btnStop.addEventListener('click',  stopCamera);
btnShot.addEventListener('click',  takeScreenshot);

// ── Init ──────────────────────────────────────────────────────
loadModel();
