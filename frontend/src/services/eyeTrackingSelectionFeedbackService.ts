import { submitEyeTrackingSelectionApi } from './eyeTrackingApi'
import { useGazeInputStore } from '../stores/gazeInputStore'

export function submitActiveEyeTrackingSelectionFeedback() {
  const activeCell = useGazeInputStore.getState().cell

  if (activeCell === null || !Number.isInteger(activeCell)) {
    return
  }

  // Best-effort implicit feedback for the eye-tracking model.
  void submitEyeTrackingSelectionApi(activeCell).catch(() => {
    // Selection feedback should never block the patient flow.
  })
}
