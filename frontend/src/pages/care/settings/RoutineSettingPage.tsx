import { useState, useEffect } from 'react'
import CareSettingLayout from './CareSettingLayout'
import { getRoutines, getActivityTags, saveRoutines } from '../../../services/careSettingService'
import type { RoutineSlotState, RoutineRequestItem } from '../../../types/care'

interface ActivityTagOption {
  id: number
  label: string
}

export default function RoutineSettingPage() {
  const [routines, setRoutines] = useState<RoutineSlotState[]>([])
  const [savedRoutines, setSavedRoutines] = useState<RoutineSlotState[]>([])
  const [openSlotId, setOpenSlotId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const tags: ActivityTagOption[] = getActivityTags()

  useEffect(() => {
    const fetchRoutines = async () => {
      try {
        const res = await getRoutines()
        if (res.success) {
          setRoutines(res.data)
          setSavedRoutines(res.data.map((r) => ({ ...r })))
        }
      } catch {
        setError('루틴 정보를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchRoutines()
  }, [])

  const selectTag = (slotId: number, tagId: number) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.timeSlotId !== slotId) return r
        return {
          ...r,
          activityTagId: r.activityTagId === tagId ? null : tagId,
        }
      }),
    )
  }

  const hasChanges = routines.some((r) => {
    const saved = savedRoutines.find((s) => s.timeSlotId === r.timeSlotId)
    if (!saved) return true
    return r.activityTagId !== saved.activityTagId
  })

  const allSlotsFilled = routines.every((r) => r.activityTagId !== null)

  const handleSave = async () => {
    if (!hasChanges) return

    if (!allSlotsFilled) {
      setError('모든 시간대에 활동을 선택해주세요.')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const requestData: RoutineRequestItem[] = routines.map((r) => ({
        timeSlotId: r.timeSlotId,
        activityTagId: r.activityTagId!,
      }))

      const res = await saveRoutines(requestData)
      if (res.success) {
        setSavedRoutines(routines.map((r) => ({ ...r })))
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
      <CareSettingLayout title="루틴 관리">
        <div className="flex items-center justify-center h-40">
          <span className="text-[14px] text-[#718096]">불러오는 중...</span>
        </div>
      </CareSettingLayout>
    )
  }

  return (
    <CareSettingLayout title="루틴 관리">
      <div className="flex flex-col gap-4 mt-6">
        <p className="text-[13px] text-[#718096]">
          시간대별로 환자의 대표 활동을 선택해주세요.
        </p>

        {/* 시간대 아코디언 */}
        <div className="flex flex-col gap-2">
          {routines.map((routine) => {
            const isOpen = openSlotId === routine.timeSlotId
            const selectedTag = tags.find((t) => t.id === routine.activityTagId)

            return (
              <div key={routine.timeSlotId} className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                {/* 슬롯 헤더 */}
                <button
                  type="button"
                  onClick={() => setOpenSlotId(isOpen ? null : routine.timeSlotId)}
                  className="w-full min-h-[52px] px-4 flex items-center justify-between bg-[#F0F4F8] active:bg-[#E2E8F0]"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-[#3D405B]">
                      {routine.timeSlotName}
                    </span>
                    <span className="text-[12px] text-[#718096]">
                      {routine.startTime} ~ {routine.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedTag && (
                      <span className="text-[12px] text-white bg-[#3D405B] rounded-full px-2 py-0.5">
                        {selectedTag.label}
                      </span>
                    )}
                    <span className="text-[16px] text-[#718096]">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* 태그 목록 — 단일 선택 */}
                {isOpen && (
                  <div className="px-4 py-3 flex flex-wrap gap-2 bg-white">
                    {tags.map((tag) => {
                      const selected = routine.activityTagId === tag.id
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => selectTag(routine.timeSlotId, tag.id)}
                          className={`min-h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors ${
                            selected
                              ? 'bg-[#3D405B] text-white'
                              : 'bg-[#F0F4F8] text-[#718096] border border-[#E2E8F0]'
                          }`}
                        >
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

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

