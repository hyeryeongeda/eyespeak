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
import useReturnToTalkMainAfterDelay from '../../../hooks/useReturnToTalkMainAfterDelay'
import {
  FAVORITES_PAGE_SIZE_EXPORT as PAGE_SIZE,
  fetchFavorites,
  submitFavoriteSelection,
} from '../../../services/favoritesService'
import {
  playPatientUtteranceTts,
  submitPatientUtterance,
} from '../../../services/recommendationService'
import type {
  FavoriteItem,
  FavoritesErrorKind,
  FavoritesSortKey,
  FavoritesStatus,
} from '../../../types/favorites'
import FavoriteCard from './components/FavoriteCard'
import FavoritesActionCard from './components/FavoritesActionCard'
import FavoritesErrorState from './components/FavoritesErrorState'
import FavoritesPaginationCard from './components/FavoritesPaginationCard'
import FavoritesSplitState from './components/FavoritesSplitState'

const pageWrapStyle: CSSProperties = {
  minHeight: 'calc(100dvh + var(--sat, 0px) + var(--sab, 0px))',
  width: 'calc(100% + var(--sal, 0px) + var(--sar, 0px))',
  marginTop: 'calc(var(--sat, 0px) * -1)',
  marginRight: 'calc(var(--sar, 0px) * -1)',
  marginBottom: 'calc(var(--sab, 0px) * -1)',
  marginLeft: 'calc(var(--sal, 0px) * -1)',
  padding: 0,
  background: 'linear-gradient(180deg, #f3f8fb 0%, #ecf3f6 100%)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
}

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
  gap: 0,
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
  padding: '0 16px 16px',
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

const completedStateStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
}

const completedCardStyle: CSSProperties = {
  width: 'min(720px, 100%)',
  borderRadius: '30px',
  border: '1px solid rgba(203, 225, 214, 0.94)',
  background:
    'linear-gradient(180deg, rgba(247, 253, 249, 0.98) 0%, rgba(238, 249, 243, 0.98) 100%)',
  boxShadow: '0 24px 56px rgba(54, 96, 76, 0.12)',
  padding: '40px 28px',
  textAlign: 'center',
}

const completedTitleStyle: CSSProperties = {
  margin: 0,
  color: '#2d5a47',
  fontSize: 'clamp(1.7rem, 2.6vw, 2.2rem)',
  fontWeight: 900,
  lineHeight: 1.3,
}

const completedDescriptionStyle: CSSProperties = {
  margin: '14px 0 0',
  color: '#557767',
  fontSize: 'clamp(1rem, 1.4vw, 1.12rem)',
  fontWeight: 700,
  lineHeight: 1.7,
}

const SORT_KEY: FavoritesSortKey = 'recentUsed'
const TRACKING_BACK_BUTTON = 'favorites-back'
const TRACKING_PAGINATION_PREV = 'favorites-pagination-prev'
const TRACKING_PAGINATION_NEXT = 'favorites-pagination-next'
const TRACKING_RETRY_FETCH = 'favorites-retry-fetch'

function getFavoriteTrackingId(itemId: string) {
  return `favorites-item-${itemId}`
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
  const [errorKind, setErrorKind] = useState<FavoritesErrorKind | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const currentItems = paginate(list, pageIndex, PAGE_SIZE)
  const isBackButtonDwellActive = isDwellFeedbackTargetActive(
    dwellFeedback,
    TRACKING_BACK_BUTTON,
  )

  useReturnToTalkMainAfterDelay(status === 'completed')

  const loadFavorites = useCallback(() => {
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

  const handleAfterSelection = useCallback((_item: FavoriteItem, success: boolean) => {
    if (success) {
      setSuccessMessage('선택한 문장을 보호자에게 전달했어요. 잠시 후 대화하기 메인으로 이동합니다.')
      setStatus('completed')
    }
  }, [])

  const handleSelect = useCallback(
    async (item: FavoriteItem) => {
      setStatus('selecting')
      setErrorKind(null)
      setErrorMessage('')

      try {
        await submitPatientUtterance({
          text: item.text,
          source: 'manual',
        })

        try {
          const result = await submitFavoriteSelection(patientId, item.id, item.text)

          if (!result.success) {
            console.warn(
              'Favorite selection persistence failed after chat send.',
              result.errorMessage,
            )
          }
        } catch (error) {
          console.warn('Favorite selection persistence threw after chat send.', error)
        }

        try {
          await playPatientUtteranceTts({
            text: item.text,
          })
        } catch (error) {
          console.warn('Favorite utterance TTS playback failed.', error)
        }

        handleAfterSelection(item, true)
      } catch {
        setErrorKind('submit')
        setErrorMessage('선택한 문장을 보내지 못했어요. 다시 시도해 주세요.')
        setStatus('error')
      }
    },
    [patientId, handleAfterSelection],
  )

  const handlePrevPage = useCallback(() => {
    if (pageIndex <= 0) {
      return
    }

    setStatus('transitioning')
    setPageIndex(currentPage => currentPage - 1)
    setStatus('visible')
  }, [pageIndex])

  const handleNextPage = useCallback(() => {
    if (pageIndex >= totalPages - 1) {
      return
    }

    setStatus('transitioning')
    setPageIndex(currentPage => currentPage + 1)
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
        <div style={loadingMessageStyle}>즐겨찾기를 불러오는 중이에요.</div>
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
            뒤로가기
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
        <FavoritesSplitState
          title="등록된 즐겨찾기가 없어요"
          description="보호자가 즐겨찾기를 등록하면 여기에서 바로 선택할 수 있어요."
          leftLabel="새로고침"
          rightLabel="뒤로가기"
          onLeftAction={loadFavorites}
          onRightAction={handleBack}
          leftTrackingId={TRACKING_RETRY_FETCH}
          rightTrackingId={TRACKING_BACK_BUTTON}
          dwellFeedback={dwellFeedback}
        />
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
        <FavoritesSplitState
          title="즐겨찾기를 불러올 수 없어요"
          description={errorMessage}
          leftLabel="새로고침"
          rightLabel="뒤로가기"
          onLeftAction={loadFavorites}
          onRightAction={handleBack}
          leftTrackingId={TRACKING_RETRY_FETCH}
          rightTrackingId={TRACKING_BACK_BUTTON}
          dwellFeedback={dwellFeedback}
          centerAriaRole="alert"
        />
      </main>
    )
  }

  if (status === 'completed') {
    return (
      <main
        style={pageWrapStyle}
        aria-label="즐겨찾기"
        ref={element => {
          dwellFeedback.containerRef.current = element
        }}
      >
        <section style={completedStateStyle} role="status" aria-live="polite">
          <div style={completedCardStyle}>
            <h2 style={completedTitleStyle}>보호자에게 전달했어요.</h2>
            <p style={completedDescriptionStyle}>
              {successMessage || '잠시 후 대화하기 메인으로 이동합니다.'}
            </p>
          </div>
        </section>
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
      {status === 'error' && errorKind === 'submit' ? (
        <>
          <FavoritesErrorState
            title="즐겨찾기 선택에 실패했어요"
            description={errorMessage}
            onRetry={() => setStatus('visible')}
            retryLabel="다시 선택"
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
              뒤로가기
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
              description="이전 화면으로 이동"
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
