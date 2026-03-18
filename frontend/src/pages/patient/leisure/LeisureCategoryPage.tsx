import { type CSSProperties, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ROUTE_PATHS,
  getPatientLeisurePlayerPath,
} from '../../../app/router/routePaths'
import {
  fetchLeisureCategoryRecommendations,
  getLeisureCategoryById,
  parseLeisureMockScenario,
} from '../../../services/leisureService'
import type { LeisureCategoryStatus, LeisureContent } from '../../../types/leisure'
import LeisureActionCard from './components/LeisureActionCard'
import LeisureContentCard from './components/LeisureContentCard'
import LeisureEmptyState from './components/LeisureEmptyState'
import LeisureErrorState from './components/LeisureErrorState'
import LeisureLayout from './components/LeisureLayout'
import LeisureLoadingState from './components/LeisureLoadingState'
import LeisureSectionHeader from './components/LeisureSectionHeader'
import { leisurePanelSurfaceStyle } from './components/leisureTheme'

function getCategoryStatusText(status: LeisureCategoryStatus) {
  switch (status) {
    case 'loading':
      return '추천 영상을 준비하고 있습니다'
    case 'refreshing':
      return '추천 영상을 새로고침 중입니다'
    case 'empty':
      return '등록된 영상이 없습니다'
    case 'selecting':
      return '영상을 선택했습니다'
    case 'transitioning':
      return '재생 화면으로 이동합니다'
    case 'error':
      return '추천 영상을 불러올 수 없습니다'
    default:
      return '추천 영상 4개와 액션 2개를 표시합니다'
  }
}

const pagePanelStyle: CSSProperties = {
  ...leisurePanelSurfaceStyle,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gap: '14px',
}

const slotStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
}

const stateAreaStyle: CSSProperties = {
  ...slotStyle,
  gridColumn: '1 / span 2',
  gridRow: '1 / span 2',
}

const noticeStyle: CSSProperties = {
  minHeight: '44px',
  padding: '10px 14px',
  borderRadius: '18px',
  backgroundColor: 'rgba(255, 244, 240, 0.92)',
  border: '1px solid rgba(240, 205, 196, 0.9)',
  color: '#8b594f',
  fontSize: '14px',
  fontWeight: 800,
  lineHeight: 1.45,
}

const responsiveStyle = `
  @media (max-width: 1080px) {
    .leisure-category-grid {
      grid-template-columns: 1fr;
      grid-template-rows: repeat(6, minmax(180px, auto));
    }

    .leisure-category-state {
      grid-column: auto;
      grid-row: auto;
    }
  }
`

export default function LeisureCategoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const category = getLeisureCategoryById(params.categoryId)
  const searchParams = new URLSearchParams(location.search)
  const initialScenario = parseLeisureMockScenario(searchParams.get('categoryScenario'))
  const refreshScenario = parseLeisureMockScenario(searchParams.get('categoryRefreshScenario'))

  const [status, setStatus] = useState<LeisureCategoryStatus>('idle')
  const [contents, setContents] = useState<LeisureContent[]>([])
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!category) {
      return
    }

    let isMounted = true

    const loadCategory = async () => {
      setStatus('loading')
      setNoticeMessage(null)

      try {
        const data = await fetchLeisureCategoryRecommendations(category.id, initialScenario)

        if (!isMounted) {
          return
        }

        setContents(data.contents)
        setStatus(data.contents.length > 0 ? 'visible' : 'empty')
      } catch {
        if (!isMounted) {
          return
        }

        setContents([])
        setStatus('error')
        setNoticeMessage(null)
      }
    }

    void loadCategory()

    return () => {
      isMounted = false
    }
  }, [category, initialScenario])

  if (!category) {
    return (
      <LeisureLayout
        code="PAT-LEISURE-002"
        title="추천 카테고리"
        description="존재하지 않는 여가 카테고리입니다."
        statusText="잘못된 경로입니다"
        contextLabel="카테고리 확인 필요"
      >
        <section style={pagePanelStyle}>
          <LeisureErrorState
            title="선택한 카테고리를 찾을 수 없습니다"
            description="여가 메인으로 돌아가 카테고리를 다시 선택해 주세요."
          />
          <div style={{ maxWidth: '320px' }}>
            <LeisureActionCard
              title="뒤로가기"
              description="여가 메인으로 돌아갑니다"
              tone="slate"
              slotId="invalid-category-back"
              onSelect={() => navigate({ pathname: ROUTE_PATHS.PATIENT_LEISURE, search: location.search })}
            />
          </div>
        </section>
      </LeisureLayout>
    )
  }

  const handleSelectContent = (content: LeisureContent) => {
    setStatus('selecting')
    navigate(
      {
        pathname: getPatientLeisurePlayerPath(content.id),
        search: location.search,
      },
      {
        state: {
          fromPath: location.pathname,
          fromLabel: `${category.label} 추천`,
          categoryId: category.id,
        },
      },
    )
  }

  const handleRefresh = async () => {
    const hasExistingContents = contents.length > 0
    setStatus('refreshing')
    setNoticeMessage(null)

    try {
      const data = await fetchLeisureCategoryRecommendations(category.id, refreshScenario, {
        refresh: true,
      })

      setContents(data.contents)
      setStatus(data.contents.length > 0 ? 'visible' : 'empty')
    } catch {
      setStatus(hasExistingContents ? 'visible' : 'error')
      setNoticeMessage('추천 영상을 불러올 수 없습니다. 기존 목록을 유지합니다.')
    }
  }

  let recommendationArea = (
    <div className="leisure-category-state" style={stateAreaStyle}>
      <LeisureLoadingState
        title="추천 영상을 불러오는 중입니다"
        description="카테고리에 맞는 영상 4개를 준비하고 있습니다."
      />
    </div>
  )

  if (status === 'error') {
    recommendationArea = (
      <div className="leisure-category-state" style={stateAreaStyle}>
        <LeisureErrorState
          title="추천 영상을 불러올 수 없습니다"
          description="잠시 후 다시 시도해 주세요."
        />
      </div>
    )
  } else if (status === 'empty') {
    recommendationArea = (
      <div className="leisure-category-state" style={stateAreaStyle}>
        <LeisureEmptyState
          title="등록된 영상이 없습니다"
          description="이 카테고리에는 아직 추천 영상이 준비되지 않았습니다."
        />
      </div>
    )
  } else {
    recommendationArea = (
      <>
        {Array.from({ length: 4 }, (_, index) => contents[index] ?? null).map((content, index) =>
          content ? (
            <div
              key={content.id}
              style={{
                ...slotStyle,
                gridColumn: index % 2 === 0 ? 1 : 2,
                gridRow: index < 2 ? 1 : 2,
              }}
            >
              <LeisureContentCard
                content={content}
                tone={category.tone}
                slotId={`category-content-${index + 1}`}
                onSelect={() => handleSelectContent(content)}
              />
            </div>
          ) : null,
        )}
      </>
    )
  }

  return (
    <LeisureLayout
      code="PAT-LEISURE-002"
      title={`${category.label} 추천`}
      description={`${category.description} 기준으로 YouTube mock 추천 영상을 4개씩 보여줍니다.`}
      statusText={getCategoryStatusText(status)}
      contextLabel="6분할 화면 · refresh mock 지원"
    >
      <style>{responsiveStyle}</style>

      <section style={pagePanelStyle}>
        <LeisureSectionHeader
          title={`${category.label} 영상`}
          description="추천 영상 4개와 새로고침/뒤로가기 액션을 함께 배치했습니다."
        />

        {noticeMessage ? <div style={noticeStyle}>{noticeMessage}</div> : null}

        <div className="leisure-category-grid" style={gridStyle}>
          {recommendationArea}

          <div style={{ ...slotStyle, gridColumn: 3, gridRow: 1 }}>
            <LeisureActionCard
              title="새로고침"
              description="다른 추천 영상 4개를 다시 불러옵니다"
              tone={category.tone}
              busy={status === 'refreshing'}
              disabled={status === 'loading' || status === 'selecting' || status === 'refreshing'}
              slotId="category-refresh"
              onSelect={() => {
                void handleRefresh()
              }}
            />
          </div>

          <div style={{ ...slotStyle, gridColumn: 3, gridRow: 2 }}>
            <LeisureActionCard
              title="뒤로가기"
              description="여가 메인으로 돌아갑니다"
              tone="slate"
              disabled={status === 'selecting'}
              slotId="category-back"
              onSelect={() => {
                setStatus('transitioning')
                navigate({ pathname: ROUTE_PATHS.PATIENT_LEISURE, search: location.search })
              }}
            />
          </div>
        </div>
      </section>
    </LeisureLayout>
  )
}
