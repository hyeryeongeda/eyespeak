import { type CSSProperties, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS, getPatientLeisureCategoryPath } from '../../app/router/routePaths'
import {
  fetchLeisureMain,
  getLeisureCategoryById,
  getLeisureEntryContentByCategory,
  getLeisureCategories,
  parseLeisureMockScenario,
} from '../../services/leisureService'
import type { LeisureMainStatus } from '../../types/leisure'
import LeisureActionCard from './leisure/components/LeisureActionCard'
import LeisureCategoryCard from './leisure/components/LeisureCategoryCard'
import LeisureLayout from './leisure/components/LeisureLayout'
import { leisurePanelSurfaceStyle } from './leisure/components/leisureTheme'

function getMainStatusText(status: LeisureMainStatus) {
  switch (status) {
    case 'loading':
      return '여가 유형을 준비하고 있습니다'
    case 'empty':
      return '등록된 영상이 없습니다'
    case 'selecting':
      return '카테고리를 선택했습니다'
    case 'transitioning':
      return '선택한 화면으로 이동합니다'
    case 'error':
      return '추천 콘텐츠를 불러올 수 없습니다'
    default:
      return '여가 유형을 선택하세요'
  }
}

const contentWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
}

const noticeStyle: CSSProperties = {
  minHeight: '46px',
  padding: '11px 16px',
  borderRadius: '18px',
  backgroundColor: 'rgba(255, 255, 255, 0.88)',
  border: '1px solid rgba(215, 224, 235, 0.88)',
  color: '#61758b',
  fontSize: '14px',
  fontWeight: 800,
  lineHeight: 1.5,
}

const mainGridShellStyle: CSSProperties = {
  ...leisurePanelSurfaceStyle,
  flex: 1,
  minHeight: 0,
  padding: '12px',
}

const mainGridStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gap: '16px',
}

const responsiveStyle = `
  @media (max-width: 920px) {
    .leisure-main-grid {
      grid-template-columns: 1fr;
      grid-template-rows: repeat(6, minmax(160px, auto));
    }
  }
`

export default function LeisureMainPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const scenario = parseLeisureMockScenario(searchParams.get('mainScenario'))
  const categoryCards = getLeisureCategories()

  const [status, setStatus] = useState<LeisureMainStatus>('idle')

  useEffect(() => {
    let isMounted = true

    const loadMain = async () => {
      setStatus('loading')

      try {
        const data = await fetchLeisureMain(scenario)

        if (!isMounted) {
          return
        }

        setStatus(data.featuredContent || data.registeredContents.length > 0 ? 'visible' : 'empty')
      } catch {
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
  }, [scenario])

  const handleSelectCategory = (categoryId: string) => {
    const category = getLeisureCategoryById(categoryId)
    const entryContent = getLeisureEntryContentByCategory(categoryId)

    setStatus('transitioning')

    if (!entryContent) {
      navigate({
        pathname: getPatientLeisureCategoryPath(categoryId),
        search: location.search,
      })
      return
    }

    navigate(
      {
        pathname: ROUTE_PATHS.PATIENT_LEISURE_PLAYER.replace(':contentId', entryContent.id),
        search: location.search,
      },
      {
        state: {
          fromPath: getPatientLeisureCategoryPath(categoryId),
          fromLabel: `${category?.label ?? '여가'} 추천`,
          categoryId: category?.id,
        },
      },
    )
  }

  const noticeMessage =
    status === 'loading'
      ? '여가 유형을 불러오는 중입니다.'
      : status === 'empty'
        ? '등록된 영상이 없습니다. 카테고리를 선택해 추천 영상을 볼 수 있습니다.'
        : status === 'error'
          ? '추천 콘텐츠를 불러올 수 없습니다. 카테고리 선택만 우선 제공합니다.'
          : '여가 카테고리를 선택하면 대표 영상 재생 화면으로 이동합니다.'

  return (
    <LeisureLayout
      code="PAT-LEISURE-001"
      title="여가 카테고리 선택"
      description="카테고리를 누르면 대표 영상을 먼저 보여주고, 이후 다른 콘텐츠 목록으로 이동할 수 있습니다."
      statusText={getMainStatusText(status)}
      contextLabel="3 x 2 고정 카드 레이아웃"
      hideHeader
    >
      <style>{responsiveStyle}</style>

      <div style={contentWrapStyle}>
        <div style={noticeStyle}>{noticeMessage}</div>

        <section style={mainGridShellStyle}>
          <div className="leisure-main-grid" style={mainGridStyle}>
            {categoryCards.map(category => (
              <div key={category.id} style={{ minHeight: 0 }}>
                <LeisureCategoryCard
                  category={category}
                  contentCount={6}
                  badge="여가"
                  variant="hero"
                  disabled={status === 'transitioning'}
                  slotId={`main-category-${category.id}`}
                  onSelect={() => handleSelectCategory(category.id)}
                />
              </div>
            ))}

            <div style={{ minHeight: 0 }}>
              <LeisureActionCard
                title="뒤로가기"
                description="메인으로"
                badge="고정 위치"
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
