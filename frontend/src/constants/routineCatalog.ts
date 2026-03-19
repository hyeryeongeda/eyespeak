import type {
  PatientRoutineSlotConfig,
  PatientRoutineTagConfig,
  PatientRoutinesFormValues,
} from '../types/patient'

export const ROUTINE_ACTIVITY_TAGS: PatientRoutineTagConfig[] = [
  { id: 1, label: '경관식/수분 섭취' },
  { id: 2, label: '약물 투여' },
  { id: 3, label: '구강 케어' },
  { id: 4, label: '체위 변경' },
  { id: 5, label: '흡인/호흡 케어' },
  { id: 6, label: '배변/배뇨 케어' },
  { id: 7, label: '재활/ROM 운동' },
  { id: 8, label: '세면/위생' },
  { id: 9, label: '영상 시청' },
  { id: 10, label: '외부인 방문' },
  { id: 11, label: '휴식/수면' },
]

export const GUARDIAN_SIGNUP_ROUTINE_SLOTS: PatientRoutineSlotConfig[] = [
  { id: 1, label: '기상/아침', timeRange: '06:00 ~ 09:00', tags: ROUTINE_ACTIVITY_TAGS },
  { id: 2, label: '오전', timeRange: '09:00 ~ 12:00', tags: ROUTINE_ACTIVITY_TAGS },
  { id: 3, label: '점심/낮', timeRange: '12:00 ~ 15:00', tags: ROUTINE_ACTIVITY_TAGS },
  { id: 4, label: '오후', timeRange: '15:00 ~ 18:00', tags: ROUTINE_ACTIVITY_TAGS },
  { id: 5, label: '저녁', timeRange: '18:00 ~ 21:00', tags: ROUTINE_ACTIVITY_TAGS },
  { id: 6, label: '취침 준비', timeRange: '21:00 ~ 00:00', tags: ROUTINE_ACTIVITY_TAGS },
  { id: 7, label: '야간', timeRange: '00:00 ~ 06:00', tags: ROUTINE_ACTIVITY_TAGS },
]

export const ROUTINE_TIME_SLOT_IDS = GUARDIAN_SIGNUP_ROUTINE_SLOTS.map(slot => slot.id)
export const ROUTINE_ACTIVITY_TAG_IDS = ROUTINE_ACTIVITY_TAGS.map(tag => tag.id)

export function createInitialPatientRoutines(): PatientRoutinesFormValues {
  return GUARDIAN_SIGNUP_ROUTINE_SLOTS.reduce<PatientRoutinesFormValues>((accumulator, slot) => {
    accumulator[slot.id] = null
    return accumulator
  }, {} as PatientRoutinesFormValues)
}
