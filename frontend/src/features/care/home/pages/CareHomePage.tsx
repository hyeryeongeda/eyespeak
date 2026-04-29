import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import { getPatientInfo, getDailyRecord } from '../../../../services/careSettingService'
import type { PatientInfo, DailyRecordResponse } from '../../../../types/care'
import eyespeakLogo from '../../../../assets/eyespeak_logo.svg'

function formatToday(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function CareHomePage() {
  const navigate = useNavigate()

  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [dailyRecord, setDailyRecord] = useState<DailyRecordResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true)
      try {
        const [patientRes, dailyRes] = await Promise.all([
          getPatientInfo(),
          getDailyRecord(formatToday()),
        ])
        if (patientRes.success) setPatient(patientRes.data)
        if (dailyRes.success) setDailyRecord(dailyRes.data)
      } catch {
        // 에러 시 기본값 유지
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [])

  const patientName = patient?.name ?? '000'
  const expressionCount = dailyRecord?.totalExpressionCount ?? 0
  const topExpression = dailyRecord?.topExpressions?.[0] ?? null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 상단 헤더 */}
      <header className="flex items-center px-[18px] py-3 border-b border-[#E2E8F0] bg-[#FEFEFE] flex-shrink-0">
        <img src={eyespeakLogo} alt="eyespeak" className="h-[22px]" />
      </header>

      {/* 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto px-[18px] pb-4">
        {/* 프로필 + 오늘 요약 통합 카드 */}
        <div className="bg-[#3D405B] rounded-[20px] p-4 mt-[14px]">
          <div className="flex items-center justify-between">
            <p className="font-bold text-white leading-tight">
              {isLoading ? (
                <span className="text-[15px]">불러오는 중...</span>
              ) : (
                <>
                  <span className="text-[17px]">{patientName}</span>
                  <span className="text-[13px]"> 님</span>
                </>
              )}
            </p>
            <div className="w-2.5 h-2.5 rounded-full bg-[#48BB78] flex-shrink-0" />
          </div>
          <div className="border-t border-white/20 mt-3 pt-3 flex items-baseline justify-between">
            <div>
              <p className="text-[14px] text-white/70">오늘 표현</p>
              <p className="text-[26px] font-extrabold text-white leading-tight">
                {expressionCount}회
              </p>
            </div>
            <div className="text-right">
              {topExpression ? (
                <>
                  <p className="text-[12px] text-white/60">가장 많이 한 표현</p>
                  <p className="text-[14px] text-white font-semibold">
                    "{topExpression.content}"
                  </p>
                  <p className="text-[11px] text-white/50">{topExpression.count}회</p>
                </>
              ) : (
                <p className="text-[12px] text-white/50">아직 표현이 없습니다</p>
              )}
            </div>
          </div>
        </div>

        {/* 채팅 진입 버튼 */}
        <button
          type="button"
          onClick={() => navigate(ROUTE_PATHS.CARE_CHAT)}
          className="w-full flex items-center gap-3 bg-white border-1 border-[#3D405B] rounded-[16px] p-4 mt-3 text-left min-h-[44px] active:bg-[#F0F4F8] transition-colors"
        >
          <span className="text-[28px]">💬</span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#3D405B]">{patientName}과 대화 나누기</p>
          </div>
          <span className="text-[#3D405B] text-[18px] font-bold">›</span>
        </button>

        {/* 오늘의 소통 기록 */}
        <p className="text-[14px] font-bold text-[#2D3748] mt-4 mb-2">오늘의 소통</p>
        <div className="flex flex-col gap-[6px]">
          {dailyRecord?.topExpressions && dailyRecord.topExpressions.length > 0 ? (
            dailyRecord.topExpressions.map((expr) => (
              <div
                key={expr.rank}
                className="flex items-center gap-3 px-3 py-[10px] bg-[#F8FAFC] border border-[#E8EDF2] rounded-[10px]"
              >
                <span className="text-[13px] text-[#A0AEC0] font-semibold w-[40px] flex-shrink-0">
                  {expr.count}회
                </span>
                <span className="text-[15px] text-[#1A202C]">{expr.content}</span>
              </div>
            ))
          ) : (
            <p className="text-[13px] text-[#A0AEC0] text-center py-4">
              {isLoading ? '불러오는 중...' : '오늘의 소통 기록이 없습니다.'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTE_PATHS.CARE_RECORD)}
          className="w-full text-center text-[12px] text-[#718096] font-semibold py-3 min-h-[44px]"
        >
          전체 기록 보기 ›
        </button>
      </main>
    </div>
  )
}
