import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS, getPatientLeisurePlayerPath } from '../../../app/router/routePaths'
import {
  fetchLeisureCategoryRecommendations,
  fetchLeisureMain,
  getLeisureCategories,
} from '../../../services/leisureService'
import type { LeisureCategoryId, LeisureContent, LeisureMainStatus } from '../../../types/leisure'
import LeisureActionCard from './components/LeisureActionCard'
import LeisureCategoryCard from './components/LeisureCategoryCard'
import LeisureLayout from './components/LeisureLayout'
import { useCellMapping } from '../../../features/patient/input/hooks/useCellMapping'

function getMainStatusText(status: LeisureMainStatus) {
  switch (status) {
    case 'loading':
      return '콘텐츠를 불러오는 중'
    case 'empty':
      return '재생 가능한 콘텐츠 없음'
    case 'selecting':
      return '카테고리 선택 중'
    case 'transitioning':
      return '다음 화면으로 이동 중'
    case 'error':
      return '콘텐츠를 불러오지 못함'
    default:
      return '카테고리를 선택하세요'
  }
}

const contentWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const noticeWrapStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '12px',
  padding: '6px 12px',
  flexShrink: 0,
}

const noticeStyle: CSSProperties = {
  margin: 0,
  flex: 1,
  padding: '8px 16px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.88)',
  border: '1px solid rgba(215, 224, 235, 0.88)',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
  color: '#61758b',
  fontSize: '13px',
  fontWeight: 700,
  lineHeight: 1.4,
  textAlign: 'center',
  maxWidth: '100%',
}

const featuredActionStyle: CSSProperties = {
  minWidth: '220px',
  minHeight: '46px',
  padding: '0 18px',
  borderRadius: '999px',
  border: '1px solid rgba(93, 146, 222, 0.24)',
  background: 'linear-gradient(135deg, #5d92de 0%, #79a9eb 100%)',
  boxShadow: '0 10px 24px rgba(93, 146, 222, 0.18)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 800,
  lineHeight: 1.3,
  cursor: 'pointer',
  appearance: 'none',
}

const mainGridShellStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  padding: '12px',
  width: '100%',
  boxSizing: 'border-box',
}

const mainGridStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: '1fr auto 1fr',
  gap: '16px',
}

export default function LeisureMainPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const categoryCards = getLeisureCategories()

  const [status, setStatus] = useState<LeisureMainStatus>('idle')
  const [featuredContent, setFeaturedContent] = useState<LeisureContent | null>(null)

  const leisureMainCellMapping = useMemo(() => ({
    0: `main-category-${categoryCards[0]?.id ?? 'sports'}`,
    1: `main-category-${categoryCards[1]?.id ?? 'news'}`,
    2: `main-category-${categoryCards[2]?.id ?? 'music'}`,
    3: `main-category-${categoryCards[3]?.id ?? 'radio'}`,
    4: `main-category-${categoryCards[4]?.id ?? 'audiobook'}`,
    5: 'main-back',
  } as Record<number, string | null>), [categoryCards])

  useCellMapping(leisureMainCellMapping)

  useEffect(() => {
    let isMounted = true

    const loadMain = async () => {
      setStatus('loading')

      try {
        const data = await fetchLeisureMain()

        if (!isMounted) {
          return
        }

        setFeaturedContent(data.featuredContent)
        setStatus(data.featuredContent || data.registeredContents.length > 0 ? 'visible' : 'empty')
      } catch (error) {
        console.error('Failed to load leisure main contents.', error)

        if (!isMounted) {
          return
        }

        setFeaturedContent(null)
        setStatus('error')
      }
    }

    void loadMain()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSelectCategory = async (categoryId: LeisureCategoryId) => {
    if (status === 'selecting' || status === 'transitioning') {
      return
    }

    setStatus('selecting')

    try {
      const data = await fetchLeisureCategoryRecommendations(categoryId)
      const firstContent = data.contents[0]

      if (!firstContent) {
        setStatus('empty')
        return
      }

      setStatus('transitioning')
      navigate(
        {
          pathname: getPatientLeisurePlayerPath(firstContent.id),
          search: location.search,
        },
        {
          state: {
            fromPath: location.pathname,
            fromLabel: 'Leisure',
            categoryId,
          },
        },
      )
    } catch (error) {
      console.error('Failed to select leisure category.', error)
      setStatus('error')
    }
  }

  const handleOpenFeaturedContent = () => {
    if (!featuredContent || status === 'selecting' || status === 'transitioning') {
      return
    }

    setStatus('transitioning')
    navigate(
      {
        pathname: getPatientLeisurePlayerPath(featuredContent.id),
        search: location.search,
      },
      {
        state: {
          fromPath: location.pathname,
          fromLabel: 'Leisure',
          categoryId: featuredContent.categoryId ?? undefined,
        },
      },
    )
  }

  const noticeMessage =
    status === 'loading'
      ? '백엔드에서 여가 콘텐츠를 조회하고 있습니다.'
      : status === 'empty'
        ? '재생 가능한 YouTube 콘텐츠가 아직 없습니다. 보호자 설정에서 URL을 등록해 주세요.'
        : status === 'error'
          ? '여가 콘텐츠를 불러오지 못했습니다. 네트워크와 백엔드 응답을 확인해 주세요.'
          : '카테고리를 선택하면 실제 API에서 조회한 재생 가능한 콘텐츠만 표시됩니다.'

  return (
    <LeisureLayout
      code="PAT-LEISURE-001"
      title="여가"
      description="카테고리를 선택해 실제 API와 연결된 YouTube 콘텐츠를 탐색합니다."
      statusText={getMainStatusText(status)}
      contextLabel="6분할 카드 레이아웃"
      hideHeader
    >
      <div style={contentWrapStyle}>
        <section style={mainGridShellStyle}>
          <div className="leisure-main-grid" style={mainGridStyle}>
            {categoryCards.slice(0, 3).map(category => (
              <div key={category.id} style={{ minHeight: 0, height: '100%' }}>
                <LeisureCategoryCard
                  category={category}
                  contentCount={0}
                  badge="카테고리"
                  variant="hero"
                  disabled={status === 'transitioning' || status === 'selecting'}
                  slotId={`main-category-${category.id}`}
                  onSelect={() => {
                    void handleSelectCategory(category.id)
                  }}
                />
              </div>
            ))}

            <div style={{ gridColumn: '1 / -1', ...noticeWrapStyle }} aria-live="polite">
              <p style={noticeStyle}>{noticeMessage}</p>
              {featuredContent ? (
                <button
                  type="button"
                  className="leisure-interactive"
                  style={{
                    ...featuredActionStyle,
                    opacity: status === 'selecting' || status === 'transitioning' ? 0.64 : 1,
                    cursor:
                      status === 'selecting' || status === 'transitioning' ? 'default' : 'pointer',
                  }}
                  disabled={status === 'selecting' || status === 'transitioning'}
                  data-leisure-slot="main-featured-play"
                  data-patient-target="main-featured-play"
                  onClick={handleOpenFeaturedContent}
                  aria-label={`${featuredContent.title} 재생`}
                >
                  {featuredContent.title}
                </button>
              ) : null}
            </div>

            {categoryCards.slice(3, 5).map(category => (
              <div key={category.id} style={{ minHeight: 0, height: '100%' }}>
                <LeisureCategoryCard
                  category={category}
                  contentCount={0}
                  badge="카테고리"
                  variant="hero"
                  disabled={status === 'transitioning' || status === 'selecting'}
                  slotId={`main-category-${category.id}`}
                  onSelect={() => {
                    void handleSelectCategory(category.id)
                  }}
                />
              </div>
            ))}

            <div style={{ minHeight: 0, height: '100%' }}>
              <LeisureActionCard
                title="뒤로가기"
                description="환자 메인 화면으로 돌아갑니다."
                badge="메인 이동"
                variant="hero"
                tone="slate"
                slotId="main-back"
                onSelect={() => navigate({ pathname: ROUTE_PATHS.PATIENT_MAIN, search: location.search })}
              />
            </div>
          </div>
        </section>
      </div>
    </LeisureLayout>
  )
}
