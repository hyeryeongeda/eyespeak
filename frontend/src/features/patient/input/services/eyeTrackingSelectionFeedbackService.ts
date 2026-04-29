import { submitEyeTrackingSelectionApi } from '../../../../services/eyeTrackingApi'
import { isBrowserEyeTrackingEnabled } from '../../../../services/eyeTrackingServiceConfig'
import { useGazeInputStore } from '../stores/gazeInputStore'
import { recordActiveBrowserEyeTrackingSelection } from './browserEyeTracking/browserEyeTrackingRuntime'

export function submitActiveEyeTrackingSelectionFeedback() {
  const activeCell = useGazeInputStore.getState().cell

  if (activeCell === null || !Number.isInteger(activeCell)) {
    return
  }

  if (isBrowserEyeTrackingEnabled()) {
    recordActiveBrowserEyeTrackingSelection(activeCell)
    return
  }

  // Best-effort implicit feedback for the eye-tracking model.
  void submitEyeTrackingSelectionApi(activeCell).catch(() => {
    // Selection feedback should never block the patient flow.
  })
}
