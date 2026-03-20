import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDailySummaries } from '../../services/careSettingService'
import type { DailySummary } from '../../types/care'
import { ROUTE_PATHS } from '../../app/router/routePaths'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const MOOD_LABELS: Record<string, string> = {
  SAD: '슬픔',
  HAPPY: '행복',
  CALM: '평온',
  JOYFUL: '기쁨',
  ANXIOUS: '불안',
  ANGRY: '화남',
  TIRED: '피곤',
}

export default function RecordsPage() {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const yearMonth = `${year}-${String(month).padStart(2, '0')}`

  useEffect(() => {
    const fetchSummaries = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await getDailySummaries(yearMonth)
        if (res.success) setSummaries(res.data)
      } catch {
        setError('소통 기록을 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSummaries()
  }, [yearMonth])

  const summaryMap = useMemo(() => {
    const map: Record<string, DailySummary> = {}
    summaries.forEach(s => {
      map[s.date] = s
    })
    return map
  }, [summaries])

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

  const selectedSummary = selectedDate ? (summaryMap[selectedDate] ?? null) : null

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
              const summary = summaryMap[dateStr]
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
                  {summary && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <span
                        className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#718096]'}`}
                      >
                        {summary.totalExpressions}
                      </span>
                      {summary.hasSos && (
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

            {selectedSummary ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#718096]">총 표현 횟수</span>
                  <span className="text-[15px] font-bold text-[#3D405B]">
                    {selectedSummary.totalExpressions}번
                  </span>
                </div>

                {selectedSummary.mood && (
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-[#718096]">기분</span>
                    <span className="text-[14px] text-[#3D405B]">
                      {MOOD_LABELS[selectedSummary.mood.type] ?? selectedSummary.mood.type} (Lv.
                      {selectedSummary.mood.level})
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#718096]">보호자 호출</span>
                  <span className="text-[14px] text-[#3D405B]">
                    {selectedSummary.normalCallCount}번
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#718096]">SOS 호출</span>
                  <span
                    className={`text-[14px] font-bold ${selectedSummary.sosCallCount > 0 ? 'text-red-500' : 'text-[#3D405B]'}`}
                  >
                    {selectedSummary.sosCallCount}번
                  </span>
                </div>

                {selectedSummary.topPhrases.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[14px] text-[#718096]">가장 많이 한 표현</span>
                    {selectedSummary.topPhrases.map((p, i) => (
                      <div key={i} className="flex items-center justify-between pl-2">
                        <span className="text-[13px] text-[#3D405B]">
                          {i + 1}. {p.content}
                        </span>
                        <span className="text-[12px] text-[#A0AEC0]">{p.count}회</span>
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
