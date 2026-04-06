import { useState, useEffect, useMemo } from 'react'
import CareSettingLayout from '../components/CareSettingLayout'
import { getExpressions } from '../../../../services/careSettingService'
import type { Expression, SentimentType } from '../../../../types/care'

const SENTIMENT_LABELS: Record<SentimentType, { label: string; color: string }> = {
  POSITIVE: { label: '긍정', color: 'bg-green-100 text-green-700' },
  NEGATIVE: { label: '부정', color: 'bg-red-100 text-red-700' },
  NEUTRAL: { label: '중립', color: 'bg-gray-100 text-gray-600' },
}

type FilterSentiment = SentimentType | 'ALL'

export default function ExpressionsPage() {
  const [expressions, setExpressions] = useState<Expression[]>([])
  const [sentimentFilter, setSentimentFilter] = useState<FilterSentiment>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchExpressions = async () => {
      try {
        const res = await getExpressions()
        if (res.success) setExpressions(res.data)
      } catch {
        setError('맞춤 표현을 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchExpressions()
  }, [])

  // ERD note 기반 기본 카테고리 + 데이터에서 추가 카테고리 자동 병합
  const categories = useMemo(() => {
    return [...new Set(
      expressions.map((e) => e.category).filter((c): c is string => c !== null)
    )].sort()
  }, [expressions])

  const filtered = useMemo(() => {
    return expressions.filter((e) => {
      if (sentimentFilter !== 'ALL' && e.sentiment !== sentimentFilter) return false
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false
      return true
    })
  }, [expressions, sentimentFilter, categoryFilter])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  if (isLoading) {
    return (
      <CareSettingLayout title="맞춤 표현 조회">
        <div className="flex items-center justify-center h-40">
          <span className="text-[14px] text-[#718096]">불러오는 중...</span>
        </div>
      </CareSettingLayout>
    )
  }

  return (
    <CareSettingLayout title="맞춤 표현 조회">
      <div className="flex flex-col gap-4 mt-6">

        {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}

        {/* 감정 필터 */}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSentimentFilter('ALL')}
            className={`min-h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors ${
              sentimentFilter === 'ALL'
                ? 'bg-[#3D405B] text-white'
                : 'bg-[#F0F4F8] text-[#718096] border border-[#E2E8F0]'
            }`}
          >
            전체
          </button>
          {(Object.keys(SENTIMENT_LABELS) as SentimentType[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSentimentFilter(key)}
              className={`min-h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors ${
                sentimentFilter === key
                  ? 'bg-[#3D405B] text-white'
                  : 'bg-[#F0F4F8] text-[#718096] border border-[#E2E8F0]'
              }`}
            >
              {SENTIMENT_LABELS[key].label}
            </button>
          ))}
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`min-h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors ${
              categoryFilter === 'ALL'
                ? 'bg-[#3D405B] text-white'
                : 'bg-[#F0F4F8] text-[#718096] border border-[#E2E8F0]'
            }`}
          >
            전체 카테고리
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`min-h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#3D405B] text-white'
                  : 'bg-[#F0F4F8] text-[#718096] border border-[#E2E8F0]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 결과 카운트 */}
        <p className="text-[13px] text-[#718096]">{filtered.length}개 표현</p>

        {/* 표현 목록 */}
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <p className="text-[14px] text-[#A0AEC0] text-center py-8">
              표현이 없습니다.
            </p>
          ) : (
            filtered.map((expr) => (
              <div
                key={expr.id}
                className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col gap-2"
              >
                <p className="text-[15px] text-[#1A202C]">{expr.content}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {expr.sentiment && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${SENTIMENT_LABELS[expr.sentiment].color}`}>
                      {SENTIMENT_LABELS[expr.sentiment].label}
                    </span>
                  )}
                  {expr.category && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                      {expr.category}
                    </span>
                  )}
                  <span className="text-[11px] text-[#A0AEC0] ml-auto">
                    {formatDate(expr.createdAt)}
                    {expr.lastUsed && ` · 최근 ${formatDate(expr.lastUsed)}`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </CareSettingLayout>
  )
}
