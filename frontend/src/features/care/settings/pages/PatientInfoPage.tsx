import { useState, useEffect } from 'react'
import CareSettingLayout from '../components/CareSettingLayout'
import { getPatientInfo, updatePatientInfo } from '../../../../services/careSettingService'
import type { PatientInfo, Gender } from '../../../../types/care'

export default function PatientInfoPage() {
  const [info, setInfo] = useState<PatientInfo | null>(null)
  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState<Gender>('M')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await getPatientInfo()
        if (res.success && res.data) {
          setInfo(res.data)
          setName(res.data.name)
          setBirthYear(String(res.data.birthYear))
          setGender(res.data.gender)
        }
      } catch {
        setError('환자 정보를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchInfo()
  }, [])

  const hasChanges =
    info !== null &&
    (name !== info.name || birthYear !== String(info.birthYear) || gender !== info.gender)

  const isValid = name.trim().length > 0 && /^\d{4}$/.test(birthYear)

  const handleSave = async () => {
    if (!isValid || !hasChanges) return
    setIsSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await updatePatientInfo({
        name: name.trim(),
        birthYear: Number(birthYear),
        gender,
      })
      if (res.success && res.data) {
        setInfo(res.data)
        setSuccessMsg('저장되었습니다.')
        setTimeout(() => setSuccessMsg(null), 2000)
      }
    } catch {
      setError('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <CareSettingLayout title="환자 기본 정보">
        <div className="flex items-center justify-center h-40">
          <span className="text-[14px] text-[#718096]">불러오는 중...</span>
        </div>
      </CareSettingLayout>
    )
  }
  return (
    <CareSettingLayout title="환자 기본 정보">
      <div className="flex flex-col gap-6 mt-6">
        {/* 이름 */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-semibold text-[#3D405B]">이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="환자 이름"
            className="w-full min-h-[44px] px-4 rounded-lg border border-[#CBD5E0] bg-white text-[15px] text-[#1A202C] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#3D405B]"
          />
        </div>

        {/* 생년월일 */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-semibold text-[#3D405B]">출생연도</label>
          <input
            type="number"
            inputMode="numeric"
            value={birthYear}
            onChange={e => setBirthYear(e.target.value)}
            placeholder="예: 1965"
            className="w-full min-h-[44px] px-4 rounded-lg border border-[#CBD5E0] bg-white text-[15px] text-[#1A202C] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#3D405B]"
          />
          {birthYear.length > 0 && !/^\d{4}$/.test(birthYear) && (
            <span className="text-[12px] text-red-500">4자리 연도를 입력해주세요</span>
          )}
        </div>

        {/* 성별 */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-semibold text-[#3D405B]">성별</label>
          <div className="flex gap-3">
            {(
              [
                ['M', '남성'],
                ['F', '여성'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setGender(value)}
                className={`flex-1 min-h-[44px] rounded-lg text-[15px] font-medium transition-colors ${
                  gender === value
                    ? 'bg-[#3D405B] text-white'
                    : 'bg-[#F0F4F8] text-[#718096] border border-[#E2E8F0]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 에러/성공 메시지 */}
        {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}
        {successMsg && <p className="text-[13px] text-green-600 text-center">{successMsg}</p>}

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || !isValid || isSaving}
          className={`w-full min-h-[48px] rounded-xl text-[16px] font-bold transition-colors ${
            hasChanges && isValid && !isSaving
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
