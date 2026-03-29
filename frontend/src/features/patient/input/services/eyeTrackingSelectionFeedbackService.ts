import { submitEyeTrackingSelectionApi } from '../../../../services/eyeTrackingApi'
import { useAuthStore } from '../../../../stores/authStore'
import { useGazeInputStore } from '../stores/gazeInputStore'
import { getPatientEyeTrackingProfileId } from './calibration/patientCalibrationService'

export function submitActiveEyeTrackingSelectionFeedback() {
  const activeCell = useGazeInputStore.getState().cell
  const userId = getPatientEyeTrackingProfileId(useAuthStore.getState().user)

  if (activeCell === null || !Number.isInteger(activeCell) || !userId) {
    return
  }

  // Best-effort implicit feedback for the eye-tracking model.
  void submitEyeTrackingSelectionApi({ cell: activeCell, userId }).catch(() => {
    // Selection feedback should never block the patient flow.
  })
}
