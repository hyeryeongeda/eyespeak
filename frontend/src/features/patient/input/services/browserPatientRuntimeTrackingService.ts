import type { CalibrationTrackingStatus } from '../../../../types/calibration'
import { useGazeInputStore } from '../stores/gazeInputStore'
import type { PatientRuntimeTrackingService } from './patientRuntimeTrackingService'
import {
  createBrowserEyeTrackingSession,
  setActiveBrowserEyeTrackingSession,
} from './browserEyeTracking/browserEyeTrackingRuntime'
import { waitForAbortableDelay } from '../../../../services/eyeTrackingCore'
import { getEyeTrackingRuntimePollIntervalMs } from '../../../../services/eyeTrackingServiceConfig'

class BrowserPatientRuntimeTrackingService implements PatientRuntimeTrackingService {
  private session = createBrowserEyeTrackingSession()

  private disposed = false

  async start({
    eyeTrackingProfileId,
    signal,
    onDoubleBlink,
    onTrackingStatusChange,
  }: {
    eyeTrackingProfileId: string
    signal?: AbortSignal
    onTrackingStatusChange: (status: CalibrationTrackingStatus) => void
    onDoubleBlink: () => void
  }) {
    this.disposed = false
    useGazeInputStore.getState().clearPoint()
    onTrackingStatusChange('face-not-detected')

    try {
      await this.session.start(signal)

      if (!this.session.loadCalibration(eyeTrackingProfileId)) {
        onTrackingStatusChange('tracking-unstable')
        return
      }

      setActiveBrowserEyeTrackingSession(this.session)
      let lastDoubleBlinkAt = 0

      while (!signal?.aborted && !this.disposed) {
        const frame = await this.session.step()
        onTrackingStatusChange(frame.status)

        if (frame.status === 'ready') {
          if (import.meta.env.DEV) {
            console.info('[eye-tracking] gaze point estimated', {
              screenX: frame.screenX,
              screenY: frame.screenY,
              cell: frame.cell,
            })
          }

          useGazeInputStore.getState().setSnapshot({
            clientX: frame.screenX * window.innerWidth,
            clientY: frame.screenY * window.innerHeight,
            cell: frame.cell,
          })
        } else {
          useGazeInputStore.getState().clearPoint()
        }

        if (frame.trigger === 'start') {
          if (import.meta.env.DEV) {
            console.info('[eye-tracking] blink detected', {
              trigger: frame.trigger,
              cell: frame.cell,
            })
          }

          const now = Date.now()

          if (now - lastDoubleBlinkAt >= 1000) {
            lastDoubleBlinkAt = now

            if (import.meta.env.DEV) {
              console.info('[eye-tracking] double blink confirmed', {
                cell: frame.cell,
              })
            }

            onDoubleBlink()
          }
        }

        await waitForAbortableDelay(getEyeTrackingRuntimePollIntervalMs(), signal)
      }
    } catch {
      if (!signal?.aborted && !this.disposed) {
        onTrackingStatusChange('tracking-unstable')
        useGazeInputStore.getState().clearPoint()
      }
    } finally {
      setActiveBrowserEyeTrackingSession(null)
    }
  }

  dispose() {
    this.disposed = true
    setActiveBrowserEyeTrackingSession(null)
    useGazeInputStore.getState().clearPoint()
    this.session.dispose()
  }
}

export function createBrowserPatientRuntimeTrackingService() {
  return new BrowserPatientRuntimeTrackingService()
}
