import { type CSSProperties, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS, getPatientLeisurePlayerPath } from '../../../app/router/routePaths'
import {
  fetchLeisureCategoryRecommendations,
  fetchLeisureMain,
  getLeisureCategories,
} from '../../../services/leisureService'
import type { LeisureCategoryId, LeisureMainStatus } from '../../../types/leisure'
import LeisureActionCard from './components/LeisureActionCard'
import LeisureCategoryCard from './components/LeisureCategoryCard'
import LeisureLayout from './components/LeisureLayout'

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
  padding: '6px 12px',
  flexShrink: 0,
}

const noticeStyle: CSSProperties = {
  margin: 0,
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

  useEffect(() => {
    let isMounted = true

    const loadMain = async () => {
      setStatus('loading')

      try {
        const data = await fetchLeisureMain()

        if (!isMounted) {
          return
        }

        setStatus(data.featuredContent || data.registeredContents.length > 0 ? 'visible' : 'empty')
      } catch (error) {
        console.error('Failed to load leisure main contents.', error)

        if (!isMounted) {
          return
        }

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
