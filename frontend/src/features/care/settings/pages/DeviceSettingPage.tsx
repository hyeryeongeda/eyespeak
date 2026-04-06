import { useState, useEffect } from 'react'
import CareSettingLayout from '../components/CareSettingLayout'
import {
  getDwellTimePreset,
  updateDwellTimePreset,
  getActivationDelayPreset,
  updateActivationDelayPreset,
} from '../../../../services/devicePresetService'
import {
  DWELL_TIME_OPTIONS,
  ACTIVATION_DELAY_OPTIONS,
} from '../../../../types/care'
import type { DwellTimePreset, ActivationDelayPreset } from '../../../../types/care'
import { usePatientModeStore } from '../../../../stores/patientModeStore'

const DWELL_LABELS: Record<DwellTimePreset, { label: string; desc: string }> = {
  default: { label: '기본', desc: '1.0초 응시 후 선택' },
  short: { label: '짧게', desc: '0.6초 응시 후 선택' },
}

const DELAY_LABELS: Record<ActivationDelayPreset, { label: string; desc: string }> = {
  none: { label: '없음', desc: '바로 입력 가능' },
  short: { label: '짧게', desc: '0.6초 잠금' },
  medium: { label: '보통', desc: '1.0초 잠금' },
  long: { label: '길게', desc: '1.6초 잠금' },
}

export default function DeviceSettingPage() {
  const [dwellPreset, setDwellPreset] = useState<DwellTimePreset>('default')
  const [delayPreset, setDelayPreset] = useState<ActivationDelayPreset>('none')
  const [savedDwell, setSavedDwell] = useState<DwellTimePreset>('default')
  const [savedDelay, setSavedDelay] = useState<ActivationDelayPreset>('none')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const setSelectionDwellDurationMs = usePatientModeStore(
    state => state.setSelectionDwellDurationMs,
  )

  useEffect(() => {
    const fetch = async () => {
      try {
        const [dwellRes, delayRes] = await Promise.all([
          getDwellTimePreset(),
          getActivationDelayPreset(),
        ])
        if (dwellRes.success) {
          setDwellPreset(dwellRes.data)
          setSavedDwell(dwellRes.data)
        }
        if (delayRes.success) {
          setDelayPreset(delayRes.data)
          setSavedDelay(delayRes.data)
        }
      } catch {
        setError('설정을 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [])

  const hasChanges = dwellPreset !== savedDwell || delayPreset !== savedDelay

  const handleSave = async () => {
    if (!hasChanges) return
    setIsSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const promises: Promise<unknown>[] = []
      if (dwellPreset !== savedDwell) promises.push(updateDwellTimePreset(dwellPreset))
      if (delayPreset !== savedDelay) promises.push(updateActivationDelayPreset(delayPreset))
      await Promise.all(promises)

      setSavedDwell(dwellPreset)
      setSavedDelay(delayPreset)
      setSelectionDwellDurationMs(DWELL_TIME_OPTIONS[dwellPreset].value)
      setSuccessMsg('저장되었습니다.')
      setTimeout(() => setSuccessMsg(null), 2000)
    } catch {
      setError('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <CareSettingLayout title="기기 설정">
        <div className="flex items-center justify-center h-40">
          <span className="text-[14px] text-[#718096]">불러오는 중...</span>
        </div>
      </CareSettingLayout>
    )
  }

  return (
    <CareSettingLayout title="기기 설정">
      <div className="flex flex-col gap-8 mt-6">

        {/* Dwell Time */}
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#3D405B]">Dwell Time</h2>
            <p className="text-[13px] text-[#718096] mt-1">
              화면을 응시해서 선택하기까지 걸리는 시간
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {(Object.keys(DWELL_TIME_OPTIONS) as DwellTimePreset[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setDwellPreset(key)}
                className={`w-full min-h-[52px] px-4 rounded-xl flex items-center justify-between transition-colors ${
                  dwellPreset === key
                    ? 'bg-[#3D405B] text-white'
                    : 'bg-[#F0F4F8] text-[#3D405B] border border-[#E2E8F0]'
                }`}
              >
                <span className="text-[15px] font-medium">{DWELL_LABELS[key].label}</span>
                <span className={`text-[13px] ${dwellPreset === key ? 'text-white/70' : 'text-[#718096]'}`}>
                  {DWELL_LABELS[key].desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 입력 잠금 시간 */}
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#3D405B]">입력 잠금 시간</h2>
            <p className="text-[13px] text-[#718096] mt-1">
              선택 후 다음 입력까지 대기하는 시간
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {(Object.keys(ACTIVATION_DELAY_OPTIONS) as ActivationDelayPreset[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setDelayPreset(key)}
                className={`w-full min-h-[52px] px-4 rounded-xl flex items-center justify-between transition-colors ${
                  delayPreset === key
                    ? 'bg-[#3D405B] text-white'
                    : 'bg-[#F0F4F8] text-[#3D405B] border border-[#E2E8F0]'
                }`}
              >
                <span className="text-[15px] font-medium">{DELAY_LABELS[key].label}</span>
                <span className={`text-[13px] ${delayPreset === key ? 'text-white/70' : 'text-[#718096]'}`}>
                  {DELAY_LABELS[key].desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 메시지 */}
        {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}
        {successMsg && <p className="text-[13px] text-green-600 text-center">{successMsg}</p>}

        {/* 저장 */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`w-full min-h-[48px] rounded-xl text-[16px] font-bold transition-colors ${
            hasChanges && !isSaving
              ? 'bg-[#3D405B] text-white active:bg-[#2D2F45]'
              : 'bg-[#E2E8F0] text-[#A0AEC0] cursor-not-allowed'
          }`}
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>
    </CareSettingLayout>
  )
}
