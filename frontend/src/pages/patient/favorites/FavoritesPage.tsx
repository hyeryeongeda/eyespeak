import type { CSSProperties } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import DwellFeedbackBadge from '../../../features/patient/input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  useDwellFeedback,
} from '../../../features/patient/input/hooks/useDwellFeedback'
import {
  fetchFavorites,
  submitFavoriteSelection,
  FAVORITES_PAGE_SIZE_EXPORT as PAGE_SIZE,
} from '../../../services/favoritesService'
import type {
  FavoriteItem,
  FavoritesErrorKind,
  FavoritesSortKey,
  FavoritesStatus,
} from '../../../types/favorites'
import FavoriteCard from './components/FavoriteCard'
import FavoritesActionCard from './components/FavoritesActionCard'
import FavoritesEmptyState from './components/FavoritesEmptyState'
import FavoritesErrorState from './components/FavoritesErrorState'
import FavoritesPaginationCard from './components/FavoritesPaginationCard'

const PAGE_CODE = 'PAT-FAV-001'

const pageWrapStyle: CSSProperties = {
  minHeight: '100dvh',
  width: '100%',
  padding: '16px',
  background: 'linear-gradient(180deg, #f3f8fb 0%, #ecf3f6 100%)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const headerStyle: CSSProperties = {
  flexShrink: 0,
  marginBottom: '12px',
  padding: '12px 16px',
  borderRadius: '18px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  border: '1px solid #dde7ed',
  fontSize: '14px',
  fontWeight: 700,
  color: '#203042',
}

/** 3열 x 2행: 좌측 4칸 콘텐츠, 우측 상단 페이지네이션, 우측 하단 뒤로가기 */
const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gridTemplateAreas: `
    "slot-1 slot-2 pagination"
    "slot-3 slot-4 back"
  `,
  gap: '14px',
}

const slotWrapStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
}

const placeholderStyle: CSSProperties = {
  flex: 1,
  visibility: 'hidden',
  pointerEvents: 'none',
}

const bottomBarStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: '12px',
  marginTop: '12px',
}

const backBtnStyle: CSSProperties = {
  padding: '16px 24px',
  borderRadius: '18px',
  border: '1px solid #d4dfe7',
  backgroundColor: '#ffffff',
  color: '#203042',
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
  position: 'relative',
}

const loadingMessageStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  fontSize: '16px',
  fontWeight: 700,
  color: '#647587',
}

/** 정렬 기준: 정책 미확정 시 mock 고정. 추후 정렬 선택 UI 붙일 때 이 값만 바꾸면 됨 */
const SORT_KEY: FavoritesSortKey = 'recentUsed'
const TRACKING_BACK_BUTTON = 'favorites-back'
const TRACKING_PAGINATION_PREV = 'favorites-pagination-prev'
const TRACKING_PAGINATION_NEXT = 'favorites-pagination-next'
const TRACKING_RETRY_FETCH = 'favorites-retry-fetch'

function getFavoriteTrackingId(itemId: string) {
  return `favorites-item-${itemId}`
}

function getStatusLabel(status: FavoritesStatus): string {
  switch (status) {
    case 'idle':
      return '대기 중'
    case 'loading':
      return '즐겨찾기를 불러오는 중입니다'
    case 'visible':
      return '항목을 선택하세요'
    case 'selecting':
      return '선택 반영 중'
    case 'completed':
      return '선택했어요'
    case 'empty':
      return '등록된 즐겨찾기가 없어요'
    case 'transitioning':
      return '화면 이동 중'
    case 'error':
      return '오류가 발생했어요'
    default:
      return '즐겨찾기'
  }
}

function paginate<T>(items: T[], pageIndex: number, pageSize: number): T[] {
  const start = pageIndex * pageSize
  return items.slice(start, start + pageSize)
}

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const dwellFeedback = useDwellFeedback<string>({
    enabled: true,
  })
  const patientId = user?.id ?? 'patient-guest'

  const [status, setStatus] = useState<FavoritesStatus>('loading')
  const [list, setList] = useState<FavoriteItem[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [errorKind, setErrorKind] = useState<FavoritesErrorKind | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const currentItems = paginate(list, pageIndex, PAGE_SIZE)
  const showPagination = list.length > PAGE_SIZE
  const isBackButtonDwellActive = isDwellFeedbackTargetActive(
    dwellFeedback,
    TRACKING_BACK_BUTTON,
  )

  const loadFavorites = useCallback(() => {
    setFeedbackText('')
    setErrorKind(null)
    setErrorMessage('')
    setStatus('loading')
    setReloadToken(token => token + 1)
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadInitialFavorites() {
      try {
        const data = await fetchFavorites(patientId, SORT_KEY)
        if (!isActive) {
          return
        }
        setList(data)
        setPageIndex(0)
        setStatus(data.length === 0 ? 'empty' : 'visible')
      } catch {
        if (!isActive) {
          return
        }
        setErrorKind('fetch')
        setErrorMessage('목록을 불러오지 못했어요. 다시 시도해 주세요.')
        setStatus('error')
      }
    }

    void loadInitialFavorites()

    return () => {
      isActive = false
    }
  }, [patientId, reloadToken])

  const handleBack = useCallback(() => {
    setStatus('transitioning')
    navigate(ROUTE_PATHS.PATIENT_TALK_MAIN)
  }, [navigate])

  /**
   * 선택 완료 후 동작.
   * MVP: 현재 화면 유지. 정책 확정 후 "대화하기 메인으로 복귀" 등으로 변경 시 이 블록만 수정.
   */
  const handleAfterSelection = useCallback((_item: FavoriteItem, success: boolean) => {
    if (success) {
      setFeedbackText('선택했어요')
      setStatus('completed')
      // MVP: stay on page. Uncomment below when policy is "return to talk main":
      // navigate(ROUTE_PATHS.PATIENT_TALK_MAIN)
    }
  }, [])

  const handleSelect = useCallback(
    async (item: FavoriteItem) => {
      setStatus('selecting')
      setErrorKind(null)
      setErrorMessage('')
      try {
        const result = await submitFavoriteSelection(patientId, item.id, item.text)
        if (result.success) {
          handleAfterSelection(item, true)
        } else {
          setErrorKind('submit')
          setErrorMessage(result.errorMessage ?? '선택을 반영하지 못했어요. 다시 선택해 주세요.')
          setStatus('error')
        }
      } catch {
        setErrorKind('submit')
        setErrorMessage('선택을 반영하지 못했어요. 다시 선택해 주세요.')
        setStatus('error')
      }
    },
    [patientId, handleAfterSelection],
  )

  const handlePrevPage = useCallback(() => {
    if (pageIndex <= 0) return
    setStatus('transitioning')
    setPageIndex(p => p - 1)
    setStatus('visible')
  }, [pageIndex])

  const handleNextPage = useCallback(() => {
    if (pageIndex >= totalPages - 1) return
    setStatus('transitioning')
    setPageIndex(p => p + 1)
    setStatus('visible')
  }, [pageIndex, totalPages])

  if (status === 'loading' && list.length === 0) {
    return (
      <main
        style={pageWrapStyle}
        aria-label="즐겨찾기"
        ref={element => {
          dwellFeedback.containerRef.current = element
        }}
      >
        <div style={headerStyle}>{getStatusLabel('loading')}</div>
        <div style={loadingMessageStyle}>잠시만 기다려 주세요.</div>
        <div style={bottomBarStyle}>
          <button
            type="button"
            style={backBtnStyle}
            onClick={handleBack}
            data-tracking-id={TRACKING_BACK_BUTTON}
          >
            {isBackButtonDwellActive ? (
              <DwellFeedbackBadge
                phase={dwellFeedback.phase}
                progress={dwellFeedback.progress}
                remainingMs={dwellFeedback.remainingMs}
              />
            ) : null}
            대화하기로 돌아가기
          </button>
        </div>
      </main>
    )
  }

  if (status === 'empty') {
    return (
      <main
        style={pageWrapStyle}
        aria-label="즐겨찾기"
        ref={element => {
          dwellFeedback.containerRef.current = element
        }}
      >
        <div style={headerStyle}>{getStatusLabel('empty')}</div>
        <FavoritesEmptyState />
        <div style={bottomBarStyle}>
          <button
            type="button"
            style={backBtnStyle}
            onClick={handleBack}
            data-tracking-id={TRACKING_BACK_BUTTON}
          >
            {isBackButtonDwellActive ? (
              <DwellFeedbackBadge
                phase={dwellFeedback.phase}
                progress={dwellFeedback.progress}
                remainingMs={dwellFeedback.remainingMs}
              />
            ) : null}
            대화하기로 돌아가기
          </button>
        </div>
      </main>
    )
  }

  if (status === 'error' && errorKind === 'fetch') {
    return (
      <main
        style={pageWrapStyle}
        aria-label="즐겨찾기"
        ref={element => {
          dwellFeedback.containerRef.current = element
        }}
      >
        <div style={headerStyle}>{getStatusLabel('error')}</div>
        <FavoritesErrorState
          title="즐겨찾기를 불러올 수 없어요"
          description={errorMessage}
          onRetry={loadFavorites}
          retryLabel="다시 불러오기"
          retryTrackingId={TRACKING_RETRY_FETCH}
          dwellFeedback={dwellFeedback}
        />
        <div style={bottomBarStyle}>
          <button
            type="button"
            style={backBtnStyle}
            onClick={handleBack}
            data-tracking-id={TRACKING_BACK_BUTTON}
          >
            {isBackButtonDwellActive ? (
              <DwellFeedbackBadge
                phase={dwellFeedback.phase}
                progress={dwellFeedback.progress}
                remainingMs={dwellFeedback.remainingMs}
              />
            ) : null}
            대화하기로 돌아가기
          </button>
        </div>
      </main>
    )
  }

  return (
    <main
      style={pageWrapStyle}
      aria-label="즐겨찾기"
      ref={element => {
        dwellFeedback.containerRef.current = element
      }}
    >
      <div style={headerStyle} aria-live="polite">
        {PAGE_CODE} · {getStatusLabel(status)}
        {feedbackText ? ` · ${feedbackText}` : ''}
        {showPagination ? ` · ${pageIndex + 1}/${totalPages}` : ''}
      </div>

      {status === 'error' && errorKind === 'submit' ? (
        <>
          <FavoritesErrorState
            title="선택을 반영하지 못했어요"
            description={errorMessage}
            onRetry={() => setStatus('visible')}
            retryLabel="다시 선택하기"
            retryTrackingId="favorites-retry-submit"
            dwellFeedback={dwellFeedback}
          />
          <div style={bottomBarStyle}>
            <button
              type="button"
              style={backBtnStyle}
              onClick={handleBack}
              data-tracking-id={TRACKING_BACK_BUTTON}
            >
              {isBackButtonDwellActive ? (
                <DwellFeedbackBadge
                  phase={dwellFeedback.phase}
                  progress={dwellFeedback.progress}
                  remainingMs={dwellFeedback.remainingMs}
                />
              ) : null}
              대화하기로 돌아가기
            </button>
          </div>
        </>
      ) : (
        <section style={gridStyle} aria-label="즐겨찾기 목록">
          {['slot-1', 'slot-2', 'slot-3', 'slot-4'].map((area, index) => (
            <div key={area} style={{ ...slotWrapStyle, gridArea: area }}>
              {currentItems[index] ? (
                <FavoriteCard
                  key={currentItems[index].id}
                  id={currentItems[index].id}
                  text={currentItems[index].text}
                  category={currentItems[index].category}
                  disabled={status === 'selecting' || status === 'transitioning'}
                  onSelect={() => handleSelect(currentItems[index])}
                  trackingId={getFavoriteTrackingId(currentItems[index].id)}
                  dwellFeedback={dwellFeedback}
                />
              ) : (
                <div aria-hidden style={placeholderStyle} />
              )}
            </div>
          ))}
          <div style={{ ...slotWrapStyle, gridArea: 'pagination' }}>
            <FavoritesPaginationCard
              pageIndex={pageIndex}
              totalPages={totalPages}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
              prevTrackingId={TRACKING_PAGINATION_PREV}
              nextTrackingId={TRACKING_PAGINATION_NEXT}
              dwellFeedback={dwellFeedback}
            />
          </div>
          <div style={{ ...slotWrapStyle, gridArea: 'back' }}>
            <FavoritesActionCard
              primaryText="뒤로가기"
              description="메인 화면으로"
              onClick={handleBack}
              trackingId={TRACKING_BACK_BUTTON}
              dwellFeedback={dwellFeedback}
            />
          </div>
        </section>
      )}
    </main>
  )
}
