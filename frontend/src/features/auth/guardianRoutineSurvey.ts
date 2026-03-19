import type { PatientRoutineSlotConfig, PatientRoutinesFormValues } from '../../types/patient'

export const GUARDIAN_SIGNUP_ROUTINE_SLOTS: PatientRoutineSlotConfig[] = [
  {
    id: 'morning',
    label: '기상/아침',
    timeRange: '06:00 ~ 09:00',
    tags: [
      { id: 'oral-care', label: '구강 케어' },
      { id: 'wash-hygiene', label: '세면/위생' },
      { id: 'medication', label: '약물 투여' },
      { id: 'tube-feeding', label: '경관식/수분 섭취' },
      { id: 'airway-care', label: '흡인/호흡 케어' },
    ],
  },
  {
    id: 'daytime',
    label: '점심/낮',
    timeRange: '12:00 ~ 15:00',
    tags: [
      { id: 'daytime-tube-feeding', label: '경관식/수분 섭취' },
      { id: 'position-change', label: '체위 변경' },
      { id: 'toilet-care', label: '배변/배뇨 케어' },
      { id: 'rehab-rom', label: '재활/ROM 운동' },
      { id: 'visitor', label: '외부인 방문' },
    ],
  },
  {
    id: 'evening',
    label: '저녁',
    timeRange: '18:00 ~ 21:00',
    tags: [
      { id: 'evening-medication', label: '약물 투여' },
      { id: 'evening-airway-care', label: '흡인/호흡 케어' },
      { id: 'rest-sleep', label: '휴식/수면' },
      { id: 'video-watch', label: '영상 시청' },
      { id: 'evening-hygiene', label: '세면/위생' },
    ],
  },
  {
    id: 'night',
    label: '야간',
    timeRange: '00:00 ~ 06:00',
    tags: [],
    allowEmpty: true,
    emptyHint: '선택 안 함이 가능한 시간대입니다.',
  },
] as const

export function createInitialPatientRoutines(): PatientRoutinesFormValues {
  return GUARDIAN_SIGNUP_ROUTINE_SLOTS.reduce<PatientRoutinesFormValues>((accumulator, slot) => {
    accumulator[slot.id] = []
    return accumulator
  }, {})
}
