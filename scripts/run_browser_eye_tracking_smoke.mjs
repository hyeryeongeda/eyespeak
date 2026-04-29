import { spawn } from 'node:child_process'
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const frontendRoot = join(repoRoot, 'frontend')
const artifactRoot = join(repoRoot, 'artifacts', 'smoke')
const vitePort = 4173
const viteUrl = `http://127.0.0.1:${vitePort}`
const browserPort = 9222
const browserUrl = `http://127.0.0.1:${browserPort}`
const edgePath =
  process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const windowsCommandShell = process.env.ComSpec || 'C:\\WINDOWS\\system32\\cmd.exe'

const authSession = {
  id: 'smoke-patient-session',
  userId: 101,
  matchingId: 1,
  role: 'patient',
  authMode: 'mock',
  name: 'Smoke Patient',
  accessToken: 'mock-access:smoke-patient',
  refreshToken: null,
}

const initScript = `
(() => {
  const authSession = ${JSON.stringify(authSession)};
  const authSessionJson = JSON.stringify(authSession);
  const loadBooleanFlag = key => sessionStorage.getItem(key) === '1';
  const state = {
    failCamera: loadBooleanFlag('__smokeFailCamera'),
    useRealStep: loadBooleanFlag('__smokeUseRealStep'),
    mainTarget: sessionStorage.getItem('__smokeMainTarget') || 'leisure',
    menuTarget: sessionStorage.getItem('__smokeMenuTarget') || 'home',
    pendingTrigger: null,
    streamSeed: 0,
  };

  function persistSession() {
    sessionStorage.setItem('selectedRole', 'patient');
    sessionStorage.setItem('authSession', authSessionJson);
  }

  function persistSmokeState() {
    sessionStorage.setItem('__smokeFailCamera', state.failCamera ? '1' : '0');
    sessionStorage.setItem('__smokeUseRealStep', state.useRealStep ? '1' : '0');
    sessionStorage.setItem('__smokeMainTarget', state.mainTarget);
    sessionStorage.setItem('__smokeMenuTarget', state.menuTarget);
  }

  function drawSyntheticFace(context, width, height, seed) {
    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#f8fafc';
    context.beginPath();
    context.ellipse(width / 2, height / 2, 150, 190, 0, 0, Math.PI * 2);
    context.fill();

    const eyeOffset = Math.sin(seed / 7) * 8;
    context.fillStyle = '#0f172a';
    context.beginPath();
    context.arc(width / 2 - 54 + eyeOffset, height / 2 - 36, 18, 0, Math.PI * 2);
    context.arc(width / 2 + 54 + eyeOffset, height / 2 - 36, 18, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = '#0f172a';
    context.lineWidth = 8;
    context.beginPath();
    context.arc(width / 2, height / 2 + 46, 50, 0.15, Math.PI - 0.15);
    context.stroke();
  }

  const mediaDevices = navigator.mediaDevices ?? {};
  navigator.mediaDevices = mediaDevices;
  mediaDevices.getUserMedia = async () => {
    persistSession();

    if (state.failCamera) {
      throw new Error('Synthetic camera failure');
    }

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Synthetic camera context is unavailable');
    }

    let frame = 0;
    const timerId = window.setInterval(() => {
      drawSyntheticFace(context, canvas.width, canvas.height, state.streamSeed + frame);
      frame += 1;
    }, 33);

    drawSyntheticFace(context, canvas.width, canvas.height, state.streamSeed);
    state.streamSeed += 1;

    const stream = canvas.captureStream(30);

    stream.getTracks().forEach(track => {
      const originalStop = track.stop.bind(track);
      track.stop = () => {
        window.clearInterval(timerId);
        originalStop();
      };
    });

    return stream;
  };

  persistSmokeState();
  window.__smokeState = state;
  window.__setSmokeCameraFailure = value => {
    state.failCamera = Boolean(value);
    persistSmokeState();
  };
  window.__setSmokeMainTarget = value => {
    state.mainTarget = String(value || 'leisure');
    persistSmokeState();
  };
  window.__setSmokeMenuTarget = value => {
    state.menuTarget = String(value || 'home');
    persistSmokeState();
  };

  window.__installBrowserEyeTrackingSmokePatch = async () => {
    persistSession();

    if (window.__browserEyeTrackingSmokePatched) {
      return true;
    }

    const [{ BrowserEyeTrackingSession }, { DEFAULT_CALIBRATION_POINTS }] = await Promise.all([
      import('/src/features/patient/input/services/browserEyeTracking/browserEyeTrackingRuntime.ts'),
      import('/src/services/calibration/calibrationConstants.ts'),
    ]);

    const originalStep = BrowserEyeTrackingSession.prototype.step;

    const toCell = (screenX, screenY) => {
      const column = screenX < 1 / 3 ? 0 : screenX < 2 / 3 ? 1 : 2;
      const row = screenY < 0.5 ? 0 : 1;
      return row * 3 + column;
    };

    const getElementCenter = element => {
      if (!(element instanceof Element)) {
        return null;
      }

      const rect = element.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      return {
        screenX: (rect.left + rect.width / 2) / window.innerWidth,
        screenY: (rect.top + rect.height / 2) / window.innerHeight,
      };
    };

    const resolveCalibrationPoint = () => {
      const statusText = document.body?.innerText ?? '';
      const match = statusText.match(/(\\d+)\\/12/);
      const completedCount = match ? Number.parseInt(match[1], 10) : 0;
      const pointIndex = Number.isFinite(completedCount)
        ? Math.min(DEFAULT_CALIBRATION_POINTS.length - 1, Math.max(0, completedCount))
        : 0;
      const point = DEFAULT_CALIBRATION_POINTS[pointIndex] ?? DEFAULT_CALIBRATION_POINTS[0];

      return {
        screenX: point.xPercent / 100,
        screenY: point.yPercent / 100,
      };
    };

    const resolveMainTarget = () => {
      const smokeState = window.__smokeState ?? state;
      const isGlobalMenuOpen = Boolean(document.querySelector('[data-tracking-id="yes"]'));

      if (isGlobalMenuOpen) {
        return (
          getElementCenter(
            document.querySelector('[data-tracking-id="' + smokeState.menuTarget + '"]'),
          ) ??
          getElementCenter(document.querySelector('[data-tracking-id="home"]')) ?? {
            screenX: 0.5,
            screenY: 0.5,
          }
        );
      }

      const cards = Array.from(document.querySelectorAll('button.patient-main-card'));
      const cardIndexById = {
        talk: 0,
        call: 1,
        leisure: 2,
      };

      return (
        getElementCenter(cards[cardIndexById[smokeState.mainTarget] ?? 2]) ?? {
          screenX: 0.5,
          screenY: 0.5,
        }
      );
    };

    BrowserEyeTrackingSession.prototype.step = async function step(timestampMs = performance.now()) {
      const smokeState = window.__smokeState ?? state;

      if (smokeState.useRealStep) {
        return originalStep.call(this, timestampMs);
      }

      let point = { screenX: 0.5, screenY: 0.5 };

      if (window.location.pathname.includes('/patient/calibration')) {
        point = resolveCalibrationPoint();
      } else {
        point = resolveMainTarget();
      }

      const trigger = smokeState.pendingTrigger === 'start' ? 'start' : 'none';

      if (trigger === 'start') {
        smokeState.pendingTrigger = null;
      }

      return {
        cell: toCell(point.screenX, point.screenY),
        ratioX: Number(point.screenX.toFixed(4)),
        ratioY: Number(point.screenY.toFixed(4)),
        rawRatioX: Number(point.screenX.toFixed(4)),
        rawRatioY: Number(point.screenY.toFixed(4)),
        eyeAspectRatio: trigger === 'start' ? 0.12 : 0.31,
        faceDetected: true,
        blinkDetected: trigger === 'start',
        trigger,
        screenX: Number(point.screenX.toFixed(4)),
        screenY: Number(point.screenY.toFixed(4)),
        status: 'ready',
      };
    };

    window.__browserEyeTrackingSmokePatched = true;
    return true;
  };

  window.__browserEyeTrackingSmokeReady = window
    .__installBrowserEyeTrackingSmokePatch()
    .catch(error => {
      console.error('[smoke] browser eye tracking patch failed', error);
      return false;
    });
})();
`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitFor(check, timeoutMs, label) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const result = await check()

    if (result) {
      return result
    }

    await sleep(100)
  }

  throw new Error(`Timed out while waiting for ${label}`)
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '')
}

async function ensurePathExists(path, label) {
  try {
    await access(path, fsConstants.F_OK)
  } catch (error) {
    throw new Error(`${label} does not exist: ${path}`, { cause: error })
  }
}

function createProcessLogger(label) {
  let stdoutBuffer = ''
  let stderrBuffer = ''
  let lastError = null

  return {
    attach(childProcess) {
      childProcess.stdout?.on('data', chunk => {
        stdoutBuffer += chunk.toString()
      })

      childProcess.stderr?.on('data', chunk => {
        stderrBuffer += chunk.toString()
      })

      childProcess.on('error', error => {
        lastError = error
      })
    },
    getState() {
      return {
        label,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        cleanStdout: stripAnsi(stdoutBuffer),
        cleanStderr: stripAnsi(stderrBuffer),
        lastError,
      }
    },
  }
}

async function stopChildProcess(childProcess) {
  if (!childProcess || childProcess.exitCode !== null) {
    return
  }

  childProcess.kill()
  await sleep(500)

  if (childProcess.exitCode === null && process.platform === 'win32') {
    const taskkillProcess = spawn(
      windowsCommandShell,
      ['/d', '/s', '/c', `taskkill /pid ${childProcess.pid} /t /f`],
      {
        stdio: 'ignore',
        windowsHide: true,
      },
    )

    await Promise.race([
      new Promise(resolve => {
        taskkillProcess.on('exit', () => resolve())
        taskkillProcess.on('error', () => resolve())
      }),
      sleep(2000),
    ])
  }
}

async function waitForViteReady(childProcess, logger, timeoutMs) {
  const readyPatterns = [
    new RegExp(`http://127\\.0\\.0\\.1:${vitePort}`),
    /Local:/i,
    /ready in/i,
  ]

  await waitFor(async () => {
    const state = logger.getState()

    if (state.lastError) {
      throw state.lastError
    }

    if (childProcess.exitCode !== null) {
      throw new Error(
        `Vite dev server exited early with code ${childProcess.exitCode}.\n${state.cleanStdout}\n${state.cleanStderr}`,
      )
    }

    const mergedLogs = `${state.cleanStdout}\n${state.cleanStderr}`

    if (readyPatterns.some(pattern => pattern.test(mergedLogs))) {
      return true
    }

    try {
      const response = await fetch(viteUrl)
      return response.ok
    } catch {
      return false
    }
  }, timeoutMs, 'Vite dev server readiness')
}

function buildViteEnv() {
  return {
    ...process.env,
    CI: '1',
    BROWSER: 'none',
    VITE_EYE_TRACKING_API_MODE: 'browser',
  }
}

function buildViteSpawnAttempts() {
  const env = buildViteEnv()
  const npmArgs = ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort']

  if (process.platform === 'win32') {
    return [
      {
        label: 'npm.cmd direct spawn',
        command: 'npm.cmd',
        args: npmArgs,
        options: {
          cwd: frontendRoot,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        },
      },
      {
        label: 'cmd /c npm.cmd fallback',
        command: windowsCommandShell,
        args: ['/d', '/s', '/c', `npm.cmd ${npmArgs.join(' ')}`],
        options: {
          cwd: frontendRoot,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        },
      },
    ]
  }

  return [
    {
      label: 'npm direct spawn',
      command: 'npm',
      args: npmArgs,
      options: {
        cwd: frontendRoot,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    },
  ]
}

class CdpConnection {
  constructor(webSocketUrl) {
    this.nextId = 0
    this.pending = new Map()
    this.eventHandlers = new Map()
    this.ws = new WebSocket(webSocketUrl)
    this.openPromise = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve())
      this.ws.addEventListener('error', event => reject(event.error ?? new Error('WebSocket error')))
    })
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(String(event.data))

      if (typeof message.id === 'number') {
        const pendingEntry = this.pending.get(message.id)

        if (!pendingEntry) {
          return
        }

        this.pending.delete(message.id)

        if (message.error) {
          pendingEntry.reject(new Error(message.error.message))
          return
        }

        pendingEntry.resolve(message.result)
        return
      }

      const key = `${message.sessionId ?? ''}:${message.method ?? ''}`
      const handlers = this.eventHandlers.get(key) ?? []
      handlers.forEach(handler => {
        handler(message.params ?? {})
      })
    })
  }

  async open() {
    await this.openPromise
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }

  on(method, handler, sessionId) {
    const key = `${sessionId ?? ''}:${method}`
    const currentHandlers = this.eventHandlers.get(key) ?? []
    currentHandlers.push(handler)
    this.eventHandlers.set(key, currentHandlers)
  }

  close() {
    this.ws.close()
  }
}

async function startViteServer() {
  await ensurePathExists(frontendRoot, 'Frontend root')
  const failures = []

  for (const attempt of buildViteSpawnAttempts()) {
    const logger = createProcessLogger(attempt.label)
    let serverProcess

    try {
      serverProcess = spawn(attempt.command, attempt.args, attempt.options)
      logger.attach(serverProcess)
      await waitForViteReady(serverProcess, logger, 30000)

      return {
        process: serverProcess,
        attempt: attempt.label,
        cwd: frontendRoot,
        command: attempt.command,
        args: attempt.args,
        envMode: attempt.options.env?.VITE_EYE_TRACKING_API_MODE ?? '',
        getLogs() {
          return logger.getState()
        },
      }
    } catch (error) {
      failures.push({
        label: attempt.label,
        command: attempt.command,
        args: attempt.args,
        error: error instanceof Error ? error.message : String(error),
        logs: logger.getState(),
      })
      await stopChildProcess(serverProcess)
    }
  }

  throw new Error(`Unable to start the Vite dev server.\n${JSON.stringify(failures, null, 2)}`)
}

async function startBrowser() {
  await ensurePathExists(edgePath, 'Edge executable')
  const userDataDir = await mkdtemp(join(tmpdir(), 'edge-smoke-'))
  let browserError = null
  const browserProcess = spawn(
    edgePath,
    [
      `--remote-debugging-port=${browserPort}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    {
      stdio: ['ignore', 'ignore', 'ignore'],
      windowsHide: true,
    },
  )
  browserProcess.on('error', error => {
    browserError = error
  })

  const version = await waitFor(
    async () => {
      if (browserError) {
        throw browserError
      }

      try {
        return await fetchJson(`${browserUrl}/json/version`)
      } catch {
        return null
      }
    },
    30000,
    'Edge remote debugging endpoint',
  )

  return {
    process: browserProcess,
    userDataDir,
    webSocketDebuggerUrl: version.webSocketDebuggerUrl,
  }
}

async function createPage(connection) {
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await connection.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  })

  await connection.send('Page.enable', {}, sessionId)
  await connection.send('Runtime.enable', {}, sessionId)
  await connection.send('Log.enable', {}, sessionId)
  await connection.send(
    'Page.addScriptToEvaluateOnNewDocument',
    {
      source: initScript,
    },
    sessionId,
  )

  return { sessionId, targetId }
}

function summarizeConsoleArg(arg) {
  if (typeof arg?.value !== 'undefined') {
    return arg.value
  }

  if (typeof arg?.description === 'string') {
    return arg.description
  }

  if (typeof arg?.unserializableValue === 'string') {
    return arg.unserializableValue
  }

  return null
}

async function navigate(connection, sessionId, url) {
  const loadPromise = new Promise(resolve => {
    const handler = params => {
      resolve(params)
    }

    connection.on('Page.loadEventFired', handler, sessionId)
  })

  await connection.send('Page.navigate', { url }, sessionId)
  await loadPromise
}

async function evaluate(connection, sessionId, expression) {
  const result = await connection.send(
    'Runtime.evaluate',
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
    },
    sessionId,
  )

  return result.result?.value
}

async function captureScreenshot(connection, sessionId, fileName) {
  await mkdir(artifactRoot, { recursive: true })
  const { data } = await connection.send('Page.captureScreenshot', { format: 'png' }, sessionId)
  const targetPath = join(artifactRoot, fileName)
  await writeFile(targetPath, Buffer.from(data, 'base64'))
  return targetPath
}

function hasConsoleEntry(entries, snippet) {
  return entries.some(entry => entry.message.includes(snippet))
}

async function waitForConsole(entries, snippet, timeoutMs) {
  await waitFor(() => hasConsoleEntry(entries, snippet), timeoutMs, `console log "${snippet}"`)
}

function hasConsoleEntryAfter(entries, startIndex, snippet) {
  return entries.slice(startIndex).some(entry => entry.message.includes(snippet))
}

async function waitForConsoleAfter(entries, startIndex, snippet, timeoutMs) {
  await waitFor(
    () => hasConsoleEntryAfter(entries, startIndex, snippet),
    timeoutMs,
    `console log "${snippet}" after index ${startIndex}`,
  )
}

async function waitForPath(connection, sessionId, pathname, timeoutMs) {
  await waitFor(
    async () =>
      (await evaluate(connection, sessionId, 'window.location.pathname')) === pathname,
    timeoutMs,
    `path ${pathname}`,
  )
}

async function waitForSelector(connection, sessionId, selector, timeoutMs) {
  await waitFor(
    async () =>
      Boolean(
        await evaluate(
          connection,
          sessionId,
          `Boolean(document.querySelector(${JSON.stringify(selector)}))`,
        ),
      ),
    timeoutMs,
    `selector ${selector}`,
  )
}

async function waitForButtonEnabled(connection, sessionId, textSnippet, timeoutMs) {
  const expression = `
(() => {
  const button = Array.from(document.querySelectorAll('button')).find(node =>
    (node.textContent || '').includes(${JSON.stringify(textSnippet)})
  );
  return button ? !button.disabled : false;
})()
`

  await waitFor(
    async () => Boolean(await evaluate(connection, sessionId, expression)),
    timeoutMs,
    `button "${textSnippet}" enabled`,
  )
}

async function clickButton(connection, sessionId, textSnippet) {
  const expression = `
(() => {
  const button = Array.from(document.querySelectorAll('button')).find(node =>
    (node.textContent || '').includes(${JSON.stringify(textSnippet)})
  );
  if (!button) {
    return false;
  }
  button.click();
  return true;
})()
`

  const clicked = await evaluate(connection, sessionId, expression)

  if (!clicked) {
    throw new Error(`Button "${textSnippet}" was not found`)
  }
}

async function waitForElementEnabled(connection, sessionId, selector, timeoutMs) {
  await waitFor(
    async () =>
      Boolean(
        await evaluate(
          connection,
          sessionId,
          `
(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  return element instanceof HTMLButtonElement ? !element.disabled : false;
})()
`,
        ),
      ),
    timeoutMs,
    `enabled element ${selector}`,
  )
}

async function clickSelector(connection, sessionId, selector) {
  const clicked = await evaluate(
    connection,
    sessionId,
    `
(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  element.click();
  return true;
})()
`,
  )

  if (!clicked) {
    throw new Error(`Element "${selector}" was not found`)
  }
}

async function waitForPatientTrackingStatus(connection, sessionId, status, timeoutMs) {
  await waitFor(
    async () =>
      (await evaluate(
        connection,
        sessionId,
        `
import('/src/features/patient/input/stores/patientModeStore.ts').then(module =>
  module.usePatientModeStore.getState().trackingStatus
)
`,
      )) === status,
    timeoutMs,
    `patient tracking status ${status}`,
  )
}

async function waitForGlobalMenuOpen(connection, sessionId, timeoutMs) {
  await waitFor(
    async () =>
      Boolean(
        await evaluate(
          connection,
          sessionId,
          `
import('/src/features/patient/input/stores/patientModeStore.ts').then(module =>
  module.usePatientModeStore.getState().isGlobalMenuOpen
)
`,
        ),
      ),
    timeoutMs,
    'global menu open state',
  )
}

async function waitForGlobalMenuClosed(connection, sessionId, timeoutMs) {
  await waitFor(
    async () =>
      !(await evaluate(
        connection,
        sessionId,
        `
import('/src/features/patient/input/stores/patientModeStore.ts').then(module =>
  module.usePatientModeStore.getState().isGlobalMenuOpen
)
`,
      )),
    timeoutMs,
    'global menu closed state',
  )
}

function createResult(step) {
  return {
    step,
    passed: false,
    notes: [],
    logs: [],
    actionConfirmed: false,
  }
}

async function run() {
  await mkdir(artifactRoot, { recursive: true })

  const results = {
    calibrationEntry: createResult('캘리브레이션 진입'),
    calibrationRestore: createResult('캘리브레이션 저장/복원'),
    mainDwell: createResult('환자 메인 dwell 선택'),
    globalMenuBlink: createResult('글로벌 메뉴 더블블링크'),
    failureHandling: createResult('실패 처리'),
  }

  let viteServer = null
  let browser = null
  let connection = null
  let sessionId = null
  let consoleEntries = []
  let currentStage = 'bootstrap'
  let failureScreenshotPath = null
  let fatalError = null

  try {
    currentStage = 'start-vite'
    viteServer = await startViteServer()

    currentStage = 'start-browser'
    browser = await startBrowser()
    connection = new CdpConnection(browser.webSocketDebuggerUrl)
    await connection.open()
    ;({ sessionId } = await createPage(connection))

    connection.on(
      'Runtime.consoleAPICalled',
      params => {
        const text = (params.args ?? [])
          .map(summarizeConsoleArg)
          .filter(value => value !== null)
          .map(value => (typeof value === 'string' ? value : JSON.stringify(value)))
          .join(' ')

        consoleEntries.push({
          type: params.type,
          message: text,
        })
      },
      sessionId,
    )

    currentStage = 'reset-state'
    await navigate(connection, sessionId, `${viteUrl}/`)
    await evaluate(
      connection,
      sessionId,
      `
localStorage.removeItem('patientCalibrationStatus');
localStorage.removeItem('browserEyeTrackingCalibration:v1');
sessionStorage.removeItem('patientRecalibrationRequired');
window.__setSmokeCameraFailure(false);
window.__smokeState.useRealStep = false;
sessionStorage.setItem('__smokeUseRealStep', '0');
window.__setSmokeMainTarget('leisure');
window.__setSmokeMenuTarget('home');
true;
`,
    )

    currentStage = 'calibration-entry'
    let consoleStartIndex = consoleEntries.length
    await navigate(connection, sessionId, `${viteUrl}/patient/calibration`)
    await waitFor(
      async () => Boolean(await evaluate(connection, sessionId, 'window.__browserEyeTrackingSmokeReady')),
      10000,
      'browser eye tracking patch ready',
    )
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] camera init start', 10000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] camera init success', 10000)
    await waitForElementEnabled(
      connection,
      sessionId,
      '[data-smoke-id="patient-calibration-start"]',
      10000,
    )
    await clickSelector(connection, sessionId, '[data-smoke-id="patient-calibration-start"]')
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] calibration point collected', 30000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] calibration complete', 60000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] calibration saved', 10000)
    await waitForPath(connection, sessionId, '/patient/main', 15000)

    results.calibrationEntry.passed = true
    results.calibrationEntry.actionConfirmed = true
    results.calibrationEntry.logs = consoleEntries.filter(
      entry =>
        entry.message.includes('[eye-tracking] camera init start') ||
        entry.message.includes('[eye-tracking] camera init success') ||
        entry.message.includes('[eye-tracking] calibration point collected') ||
        entry.message.includes('[eye-tracking] calibration complete'),
    )

    currentStage = 'calibration-restore'
    consoleStartIndex = consoleEntries.length
    const storageSnapshot = await evaluate(
      connection,
      sessionId,
      `
({
  patientCalibrationStatus: localStorage.getItem('patientCalibrationStatus'),
  browserCalibration: localStorage.getItem('browserEyeTrackingCalibration:v1'),
})
`,
    )

    await evaluate(
      connection,
      sessionId,
      `
import('/src/features/patient/input/stores/patientModeStore.ts').then(module => {
  module.usePatientModeStore.getState().setGlobalMenuDwellDurationMs(250);
});
window.dispatchEvent(
  new CustomEvent('care-setting:activation-delay-updated', {
    detail: { preset: 'none' },
  }),
);
true;
`,
    )

    await connection.send('Page.reload', { ignoreCache: true }, sessionId)
    await waitFor(
      async () => Boolean(await evaluate(connection, sessionId, 'window.__browserEyeTrackingSmokeReady')),
      10000,
      'browser eye tracking patch ready after reload',
    )
    await waitForPath(connection, sessionId, '/patient/main', 15000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] calibration loaded', 10000)

    results.calibrationRestore.passed = Boolean(
      storageSnapshot?.patientCalibrationStatus && storageSnapshot?.browserCalibration,
    )
    results.calibrationRestore.actionConfirmed = results.calibrationRestore.passed
    results.calibrationRestore.logs = consoleEntries.filter(
      entry =>
        entry.message.includes('[eye-tracking] calibration saved') ||
        entry.message.includes('[eye-tracking] calibration loaded'),
    )
    results.calibrationRestore.notes.push(
      results.calibrationRestore.passed
        ? 'localStorage keys patientCalibrationStatus and browserEyeTrackingCalibration:v1 were populated.'
        : 'Expected calibration localStorage keys were not populated.',
    )

    currentStage = 'main-dwell'
    consoleStartIndex = consoleEntries.length
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] gaze point estimated', 10000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[patient-input] active target resolved', 20000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[patient-input] confirmSelection called', 20000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[patient-input] click dispatched', 20000)
    await waitForPath(connection, sessionId, '/patient/leisure', 15000)

    results.mainDwell.passed = true
    results.mainDwell.actionConfirmed = true
    results.mainDwell.logs = consoleEntries.filter(
      entry =>
        entry.message.includes('[eye-tracking] gaze point estimated') ||
        entry.message.includes('[patient-input] active target resolved') ||
        entry.message.includes('[patient-input] confirmSelection called') ||
        entry.message.includes('[patient-input] click dispatched'),
    )

    currentStage = 'global-menu-blink'
    consoleStartIndex = consoleEntries.length
    await waitForPatientTrackingStatus(connection, sessionId, 'ready', 15000)
    await evaluate(
      connection,
      sessionId,
      `
import('/src/features/patient/input/stores/patientModeStore.ts').then(module => {
  module.usePatientModeStore.getState().setGlobalMenuDwellDurationMs(5000);
  module.usePatientModeStore.getState().openGlobalMenu();
});
window.__setSmokeMenuTarget('yes');
true;
`,
    )
    await waitForGlobalMenuOpen(connection, sessionId, 10000)
    await waitForSelector(connection, sessionId, '[data-tracking-id="yes"]', 10000)
    await evaluate(
      connection,
      sessionId,
      `
import('/src/features/patient/input/stores/gazeInputStore.ts').then(module => {
  const target = document.querySelector('[data-tracking-id="yes"]');
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const rect = target.getBoundingClientRect();
  module.useGazeInputStore.getState().setSnapshot({
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    cell: 0,
  });
  return true;
})
`,
    )
    await sleep(250)
    await evaluate(
      connection,
      sessionId,
      `
window.__smokeState.pendingTrigger = 'start';
true;
`,
    )
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] blink detected', 10000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] double blink confirmed', 10000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[patient-input] global menu action queued', 10000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[patient-input] global menu action committed', 10000)
    await waitForGlobalMenuClosed(connection, sessionId, 10000)

    results.globalMenuBlink.passed = true
    results.globalMenuBlink.actionConfirmed = true
    results.globalMenuBlink.logs = consoleEntries.filter(
      entry =>
        entry.message.includes('[eye-tracking] blink detected') ||
        entry.message.includes('[eye-tracking] double blink confirmed') ||
        entry.message.includes('[patient-input] global menu action queued') ||
        entry.message.includes('[patient-input] global menu action committed'),
    )

    currentStage = 'failure-handling'
    consoleStartIndex = consoleEntries.length
    await evaluate(
      connection,
      sessionId,
      `
window.__setSmokeCameraFailure(true);
true;
`,
    )
    await connection.send('Page.reload', { ignoreCache: true }, sessionId)
    await waitForSelector(
      connection,
      sessionId,
      '[data-smoke-id="patient-tracking-guard-recalibrate"]',
      10000,
    )
    await evaluate(
      connection,
      sessionId,
      `
window.__setSmokeCameraFailure(false);
true;
`,
    )
    await clickSelector(connection, sessionId, '[data-smoke-id="patient-tracking-guard-recalibrate"]')
    await waitForPath(connection, sessionId, '/patient/calibration', 10000)
    await waitFor(
      async () => Boolean(await evaluate(connection, sessionId, 'window.__browserEyeTrackingSmokeReady')),
      10000,
      'browser eye tracking patch ready after recalibration retry',
    )
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] camera init start', 10000)
    await waitForConsoleAfter(consoleEntries, consoleStartIndex, '[eye-tracking] camera init success', 10000)
    await waitForElementEnabled(
      connection,
      sessionId,
      '[data-smoke-id="patient-calibration-start"]',
      10000,
    )

    results.failureHandling.passed = true
    results.failureHandling.actionConfirmed = true
    results.failureHandling.logs = consoleEntries.filter(
      entry =>
        entry.message.includes('[eye-tracking] camera init start') ||
        entry.message.includes('[eye-tracking] camera init success') ||
        entry.message.includes('Tracking Unavailable'),
    )
    results.failureHandling.notes.push(
      'Tracking guard overlay appeared, and the recalibration action returned to the calibration page in a recoverable ready state.',
    )
  } catch (error) {
    fatalError = error instanceof Error ? error : new Error(String(error))

    if (connection && sessionId) {
      try {
        failureScreenshotPath = await captureScreenshot(connection, sessionId, 'browser-eye-tracking-smoke-failure.png')
      } catch {
        failureScreenshotPath = null
      }
    }
  } finally {
    if (connection) {
      connection.close()
    }

    if (browser) {
      await stopChildProcess(browser.process)
      await rm(browser.userDataDir, { recursive: true, force: true }).catch(() => undefined)
    }

    if (viteServer) {
      await stopChildProcess(viteServer.process)
    }
  }

  const mergeHoldReasons = []

  if (!results.calibrationEntry.passed) {
    mergeHoldReasons.push('캘리브레이션 진입 테스트 실패')
  }

  if (!results.calibrationRestore.passed) {
    mergeHoldReasons.push('캘리브레이션 저장/복원 테스트 실패')
  }

  if (!results.mainDwell.passed) {
    mergeHoldReasons.push('환자 메인 dwell 클릭 테스트 실패')
  }

  if (!results.globalMenuBlink.passed) {
    mergeHoldReasons.push('글로벌 메뉴 더블블링크 테스트 실패')
  }

  if (!results.failureHandling.passed) {
    mergeHoldReasons.push('실패 처리 테스트 실패')
  }

  const output = {
    viteUrl,
    currentStage,
    results,
    mergeDecision: mergeHoldReasons.length > 0 ? 'hold' : 'merge',
    mergeHoldReasons,
    envSnapshot: {
      envFileEyeTrackingMode: 'mock',
      envLocalEyeTrackingMode: 'browser',
      runtimeInjectedEyeTrackingMode: 'browser',
    },
    runtime: {
      vite: viteServer
        ? {
            attempt: viteServer.attempt,
            cwd: viteServer.cwd,
            command: viteServer.command,
            args: viteServer.args,
            envMode: viteServer.envMode,
            logs: viteServer.getLogs(),
          }
        : null,
      edgePath,
      commandShell: windowsCommandShell,
    },
    limitation:
      'Synthetic getUserMedia and patched runtime step were used for repeatable headless verification. Browser permission prompt visibility itself was not visually asserted in headless mode.',
    failure: fatalError
      ? {
          message: fatalError.message,
          stack: fatalError.stack ?? '',
          screenshotPath: failureScreenshotPath,
        }
      : null,
    consoleEntries,
  }

  await writeFile(join(artifactRoot, 'browser-eye-tracking-smoke-result.json'), `${JSON.stringify(output, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
  process.exit(fatalError ? 1 : 0)
}

run().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  process.exitCode = 1
})
