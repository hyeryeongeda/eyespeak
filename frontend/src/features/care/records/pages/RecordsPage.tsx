import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMonthlyRecords, getDailyRecord } from '../../../../services/careSettingService'
import type { MonthlyRecordDay, DailyRecordResponse } from '../../../../types/care'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function RecordsPage() {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [monthlyDays, setMonthlyDays] = useState<MonthlyRecordDay[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dailyDetail, setDailyDetail] = useState<DailyRecordResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDailyLoading, setIsDailyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMonthly = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await getMonthlyRecords(year, month)
        if (res.success) setMonthlyDays(res.data)
      } catch {
        setError('소통 기록을 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMonthly()
  }, [year, month])

  useEffect(() => {
    if (!selectedDate) {
      setDailyDetail(null)
      return
    }
    const fetchDaily = async () => {
      setIsDailyLoading(true)
      try {
        const res = await getDailyRecord(selectedDate)
        if (res.success) setDailyDetail(res.data)
      } catch {
        setDailyDetail(null)
      } finally {
        setIsDailyLoading(false)
      }
    }
    fetchDaily()
  }, [selectedDate])

  const dayMap = useMemo(() => {
    const map: Record<string, MonthlyRecordDay> = {}
    monthlyDays.forEach(d => {
      map[d.date] = d
    })
    return map
  }, [monthlyDays])

  // 캘린더 날짜 계산
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const days: (number | null)[] = []

    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)

    return days
  }, [year, month])

  const goMonth = (dir: -1 | 1) => {
    let newMonth = month + dir
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear--
    }
    if (newMonth > 12) {
      newMonth = 1
      newYear++
    }
    setMonth(newMonth)
    setYear(newYear)
    setSelectedDate(null)
  }

  const formatDateStr = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="px-[18px] py-3 border-b border-[#E2E8F0] bg-[#FEFEFE] flex-shrink-0 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(ROUTE_PATHS.CARE_HOME)}
          className="text-[20px] text-[#3D405B] min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          ‹
        </button>
        <span className="text-[17px] font-bold text-[#3D405B]">소통 기록</span>
      </header>

      <main className="flex-1 overflow-y-auto px-[18px] pb-6">
        {error && <p className="text-[13px] text-red-500 text-center mt-4">{error}</p>}

        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between mt-4 mb-3">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[20px] text-[#3D405B]"
          >
            ‹
          </button>
          <span className="text-[16px] font-bold text-[#3D405B]">
            {year}년 {month}월
          </span>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[20px] text-[#3D405B]"
          >
            ›
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-[12px] text-[#718096] py-1">
              {day}
            </div>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-[14px] text-[#718096]">불러오는 중...</span>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="h-[52px]" />

              const dateStr = formatDateStr(day)
              const dayRecord = dayMap[dateStr]
              const isSelected = selectedDate === dateStr
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() + 1 &&
                year === today.getFullYear()

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`h-[52px] flex flex-col items-center justify-center rounded-lg transition-colors relative ${
                    isSelected
                      ? 'bg-[#3D405B] text-white'
                      : isToday
                        ? 'bg-[#F0F4F8] text-[#3D405B]'
                        : 'text-[#3D405B]'
                  }`}
                >
                  <span className={`text-[14px] ${isSelected ? 'font-bold' : ''}`}>{day}</span>
                  {dayRecord && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <span
                        className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#718096]'}`}
                      >
                        {dayRecord.totalCount}
                      </span>
                      {dayRecord.hasSos && (
                        <span className="w-[6px] h-[6px] rounded-full bg-red-500 shrink-0" />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* 날짜 상세 */}
        {selectedDate && (
          <div className="mt-4 p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col gap-3">
            <h3 className="text-[15px] font-bold text-[#3D405B]">
              {month}월 {Number(selectedDate.split('-')[2])}일 상세
            </h3>

            {isDailyLoading ? (
              <p className="text-[14px] text-[#718096] text-center py-4">불러오는 중...</p>
            ) : dailyDetail ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#718096]">총 표현 횟수</span>
                  <span className="text-[15px] font-bold text-[#3D405B]">
                    {dailyDetail.totalExpressionCount}번
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#718096]">보호자 호출</span>
                  <span className="text-[14px] text-[#3D405B]">
                    {dailyDetail.normalCallCount}번
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#718096]">SOS 호출</span>
                  <span
                    className={`text-[14px] font-bold ${dailyDetail.sosCallCount > 0 ? 'text-red-500' : 'text-[#3D405B]'}`}
                  >
                    {dailyDetail.sosCallCount}번
                  </span>
                </div>

                {dailyDetail.topExpressions.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[14px] text-[#718096]">가장 많이 한 표현</span>
                    {dailyDetail.topExpressions.map(expr => (
                      <div key={expr.rank} className="flex items-center justify-between pl-2">
                        <span className="text-[13px] text-[#3D405B]">
                          {expr.rank}. {expr.content}
                        </span>
                        <span className="text-[12px] text-[#A0AEC0]">{expr.count}회</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-[14px] text-[#A0AEC0] text-center py-4">
                이 날의 소통 기록이 없습니다.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
