import { useState, useEffect } from 'react'
import CareSettingLayout from './CareSettingLayout'
import {
  getTimeSlots,
  getActivityTags,
  getRoutines,
  updateRoutines,
} from '../../../services/careSettingService'
import type { TimeSlot, ActivityTag, RoutineSlotWithTags } from '../../../types/care'

export default function RoutineSettingPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [tags, setTags] = useState<ActivityTag[]>([])
  const [routines, setRoutines] = useState<RoutineSlotWithTags[]>([])
  const [savedRoutines, setSavedRoutines] = useState<RoutineSlotWithTags[]>([])
  const [openSlotId, setOpenSlotId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [slotsRes, tagsRes, routinesRes] = await Promise.all([
          getTimeSlots(),
          getActivityTags(),
          getRoutines(),
        ])
        if (slotsRes.success) setTimeSlots(slotsRes.data)
        if (tagsRes.success) setTags(tagsRes.data.sort((a, b) => a.orderIndex - b.orderIndex))
        if (routinesRes.success) {
          setRoutines(routinesRes.data)
          setSavedRoutines(routinesRes.data.map((r) => ({ ...r, selectedTagIds: [...r.selectedTagIds] })))
        }
      } catch {
        setError('루틴 정보를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [])

  const toggleTag = (slotId: number, tagId: number) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.timeSlot.id !== slotId) return r
        const exists = r.selectedTagIds.includes(tagId)
        return {
          ...r,
          selectedTagIds: exists
            ? r.selectedTagIds.filter((id) => id !== tagId)
            : [...r.selectedTagIds, tagId],
        }
      })
    )
  }

  const hasChanges = routines.some((r) => {
    const saved = savedRoutines.find((s) => s.timeSlot.id === r.timeSlot.id)
    if (!saved) return true
    const current = [...r.selectedTagIds].sort()
    const original = [...saved.selectedTagIds].sort()
    return current.length !== original.length || current.some((id, i) => id !== original[i])
  })

  const handleSave = async () => {
    if (!hasChanges) return
    setIsSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await updateRoutines(routines)
      if (res.success) {
        setSavedRoutines(routines.map((r) => ({ ...r, selectedTagIds: [...r.selectedTagIds] })))
        setSuccessMsg('저장되었습니다.')
        setTimeout(() => setSuccessMsg(null), 2000)
      }
    } catch {
      setError('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const getSelectedCount = (slotId: number) => {
    return routines.find((r) => r.timeSlot.id === slotId)?.selectedTagIds.length ?? 0
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
          시간대별로 환자의 주요 활동을 선택해주세요.
        </p>

        {/* 시간대 아코디언 */}
        <div className="flex flex-col gap-2">
          {timeSlots.map((slot) => {
            const isOpen = openSlotId === slot.id
            const count = getSelectedCount(slot.id)
            const routine = routines.find((r) => r.timeSlot.id === slot.id)

            return (
              <div key={slot.id} className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                {/* 슬롯 헤더 */}
                <button
                  type="button"
                  onClick={() => setOpenSlotId(isOpen ? null : slot.id)}
                  className="w-full min-h-[52px] px-4 flex items-center justify-between bg-[#F0F4F8] active:bg-[#E2E8F0]"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-[#3D405B]">{slot.name}</span>
                    <span className="text-[12px] text-[#718096]">
                      {slot.startTime} ~ {slot.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {count > 0 && (
                      <span className="text-[12px] text-white bg-[#3D405B] rounded-full px-2 py-0.5">
                        {count}
                      </span>
                    )}
                    <span className="text-[16px] text-[#718096]">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* 태그 목록 */}
                {isOpen && routine && (
                  <div className="px-4 py-3 flex flex-wrap gap-2 bg-white">
                    {tags.map((tag) => {
                      const selected = routine.selectedTagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(slot.id, tag.id)}
                          className={`min-h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors ${
                            selected
                              ? 'bg-[#3D405B] text-white'
                              : 'bg-[#F0F4F8] text-[#718096] border border-[#E2E8F0]'
                          }`}
                        >
                          {tag.name}
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