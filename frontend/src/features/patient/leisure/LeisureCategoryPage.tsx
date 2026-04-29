import { type CSSProperties, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ROUTE_PATHS, getPatientLeisurePlayerPath } from '../../../app/router/routePaths'
import usePatientNavigateWithFeedback from '../input/hooks/usePatientNavigateWithFeedback'
import {
  fetchLeisureCategoryRecommendations,
  getLeisureCategoryErrorMessage,
  getLeisureCategoryById,
} from './services/leisureService'
import type { LeisureCategoryStatus, LeisureContent } from '../../../types/leisure'
import LeisureActionCard from './components/LeisureActionCard'
import LeisureContentCard from './components/LeisureContentCard'
import LeisureEmptyState from './components/LeisureEmptyState'
import LeisureErrorState from './components/LeisureErrorState'
import LeisureLayout from './components/LeisureLayout'
import LeisureLoadingState from './components/LeisureLoadingState'
import { leisurePanelSurfaceStyle } from './components/leisureTheme'
import usePatientPageCellMapping from '../input/hooks/usePatientPageCellMapping'

function getCategoryStatusText(status: LeisureCategoryStatus) {
  switch (status) {
    case 'loading':
      return '콘텐츠를 불러오는 중'
    case 'refreshing':
      return '목록을 새로고침하는 중'
    case 'empty':
      return '재생 가능한 콘텐츠 없음'
    case 'selecting':
      return '콘텐츠 선택 중'
    case 'transitioning':
      return '다음 화면으로 이동 중'
    case 'error':
      return '콘텐츠를 불러오지 못함'
    default:
      return '재생할 콘텐츠를 선택하세요'
  }
}

const pagePanelStyle: CSSProperties = {
  ...leisurePanelSurfaceStyle,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  padding: 0,
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

const hiddenSlotStyle: CSSProperties = {
  ...slotStyle,
  visibility: 'hidden',
  pointerEvents: 'none',
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

export default function LeisureCategoryPage() {
  const navigateWithFeedback = usePatientNavigateWithFeedback()
  const location = useLocation()
  const params = useParams()
  const category = getLeisureCategoryById(params.categoryId)

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
        const data = await fetchLeisureCategoryRecommendations(category.id)

        if (!isMounted) {
          return
        }

        setContents(data.contents)
        setStatus(data.contents.length > 0 ? 'visible' : 'empty')
      } catch (error) {
        console.error('Failed to load leisure category contents.', error)

        if (!isMounted) {
          return
        }

        setContents([])
        setStatus('error')
        setNoticeMessage(getLeisureCategoryErrorMessage(error))
      }
    }

    void loadCategory()

    return () => {
      isMounted = false
    }
  }, [category])

  usePatientPageCellMapping(
    !category
      ? [null, null, null, null, null, 'invalid-category-back']
      : [
          contents[0] && status !== 'loading' && status !== 'refreshing'
            ? 'category-content-1'
            : null,
          contents[1] && status !== 'loading' && status !== 'refreshing'
            ? 'category-content-2'
            : null,
          status === 'loading' || status === 'selecting' || status === 'refreshing'
            ? null
            : 'category-refresh',
          contents[2] && status !== 'loading' && status !== 'refreshing'
            ? 'category-content-3'
            : null,
          contents[3] && status !== 'loading' && status !== 'refreshing'
            ? 'category-content-4'
            : null,
          status === 'selecting' ? null : 'category-back',
        ],
  )

  if (!category) {
    return (
      <LeisureLayout
        code="PAT-LEISURE-002"
        title="여가 카테고리"
        description="유효하지 않은 카테고리 경로입니다."
        statusText="카테고리를 찾을 수 없음"
        contextLabel="잘못된 접근"
      >
        <section style={pagePanelStyle}>
          <LeisureErrorState
            title="카테고리를 찾을 수 없습니다"
            description="여가 메인으로 돌아가서 다시 선택해 주세요."
          />
          <div style={{ maxWidth: '320px' }}>
            <LeisureActionCard
              title="뒤로가기"
              description="여가 메인 화면으로 돌아갑니다."
              tone="slate"
              slotId="invalid-category-back"
              onSelect={() =>
                navigateWithFeedback({
                  pathname: ROUTE_PATHS.PATIENT_LEISURE,
                  search: location.search,
                })
              }
            />
          </div>
        </section>
      </LeisureLayout>
    )
  }

  const handleSelectContent = (content: LeisureContent) => {
    setStatus('selecting')
    navigateWithFeedback(
      {
        pathname: getPatientLeisurePlayerPath(content.id),
        search: location.search,
      },
      {
        state: {
          fromPath: location.pathname,
          fromLabel: `${category.label} 콘텐츠`,
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
      const data = await fetchLeisureCategoryRecommendations(category.id, {
        refresh: true,
      })

      setContents(data.contents)
      setStatus(data.contents.length > 0 ? 'visible' : 'empty')
    } catch (error) {
      console.error('Failed to refresh leisure category contents.', error)
      setStatus(hasExistingContents ? 'visible' : 'error')
      setNoticeMessage('새로고침에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  let recommendationArea = (
    <div className="leisure-category-state" style={stateAreaStyle}>
      <LeisureLoadingState
        title="카테고리 콘텐츠를 불러오는 중입니다"
        description="실제 API에서 재생 가능한 영상을 조회하고 있습니다."
      />
    </div>
  )

  if (status === 'error') {
    recommendationArea = (
      <div className="leisure-category-state" style={stateAreaStyle}>
        <LeisureErrorState
          title="콘텐츠를 불러오지 못했습니다"
          description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
        />
      </div>
    )
  } else if (status === 'empty') {
    recommendationArea = (
      <div className="leisure-category-state" style={stateAreaStyle}>
        <LeisureEmptyState
          title="재생 가능한 콘텐츠가 없습니다"
          description="이 카테고리에 연결된 유효한 YouTube URL이 아직 없습니다."
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
          ) : (
            <div
              key={`category-placeholder-${index}`}
              style={{
                ...hiddenSlotStyle,
                gridColumn: index % 2 === 0 ? 1 : 2,
                gridRow: index < 2 ? 1 : 2,
              }}
            />
          ),
        )}
      </>
    )
  }

  return (
    <LeisureLayout
      code="PAT-LEISURE-002"
      title={`${category.label} 콘텐츠`}
      description={`${category.description} 실제 API에 연결된 재생 가능한 콘텐츠만 표시합니다.`}
      statusText={getCategoryStatusText(status)}
      contextLabel="6분할 화면 · API 연결"
      hideHeader
    >
      <section style={pagePanelStyle}>
        {noticeMessage ? <div style={noticeStyle}>{noticeMessage}</div> : null}

        <div className="leisure-category-grid" style={gridStyle}>
          {recommendationArea}

          <div style={{ ...slotStyle, gridColumn: 3, gridRow: 1 }}>
            <LeisureActionCard
              title="새로고침"
              description="현재 카테고리의 목록을 다시 조회합니다."
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
              description="여가 메인으로 돌아갑니다."
              tone="slate"
              disabled={status === 'selecting'}
              slotId="category-back"
              onSelect={() => {
                setStatus('transitioning')
                navigateWithFeedback({
                  pathname: ROUTE_PATHS.PATIENT_LEISURE,
                  search: location.search,
                })
              }}
            />
          </div>
        </div>
      </section>
    </LeisureLayout>
  )
}
