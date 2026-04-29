import { type CSSProperties, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ROUTE_PATHS,
  getPatientLeisureCategoryPath,
  getPatientLeisurePlayerPath,
} from '../../../app/router/routePaths'
import { fetchLeisureMain } from '../../../services/leisureService'
import type { LeisureMainStatus, LeisureShortcut } from '../../../types/leisure'
import LeisureActionCard from './components/LeisureActionCard'
import LeisureLayout from './components/LeisureLayout'
import usePatientPageCellMapping from '../../../features/patient/input/hooks/usePatientPageCellMapping'

const MAX_SHORTCUT_CARDS = 5

function getMainStatusText(status: LeisureMainStatus) {
  switch (status) {
    case 'loading':
      return '여가 버튼을 불러오는 중입니다.'
    case 'empty':
      return '등록된 여가 버튼이 없습니다.'
    case 'selecting':
      return '선택한 버튼을 여는 중입니다.'
    case 'transitioning':
      return '재생 화면으로 이동하는 중입니다.'
    case 'error':
      return '여가 버튼을 불러오지 못했습니다.'
    default:
      return '보호자가 등록한 여가 버튼을 표시합니다.'
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

const placeholderTones: LeisureShortcut['tone'][] = ['sand', 'sky', 'mint', 'slate', 'rose']

function buildPlaceholderShortcut(index: number): LeisureShortcut {
  return {
    id: `placeholder-${index + 1}`,
    title: '빈 버튼',
    description: '보호자 설정에서 여가 버튼을 등록하면 여기에 표시됩니다.',
    tone: placeholderTones[index % placeholderTones.length],
    badgeLabel: '설정 필요',
    kind: 'content',
    contentId: null,
    categoryId: null,
    categoryLabel: null,
  }
}

export default function LeisureMainPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [status, setStatus] = useState<LeisureMainStatus>('idle')
  const [shortcutCards, setShortcutCards] = useState<LeisureShortcut[]>([])

  useEffect(() => {
    let isMounted = true

    const loadMain = async () => {
      setStatus('loading')

      try {
        const data = await fetchLeisureMain()

        if (!isMounted) {
          return
        }

        setShortcutCards(data.shortcutCards)
        setStatus(data.shortcutCards.length > 0 ? 'visible' : 'empty')
      } catch (error) {
        console.error('Failed to load leisure main contents.', error)

        if (!isMounted) {
          return
        }

        setShortcutCards([])
        setStatus('error')
      }
    }

    void loadMain()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSelectShortcut = async (shortcut: LeisureShortcut) => {
    if (status === 'selecting' || status === 'transitioning') {
      return
    }

    if (shortcut.kind === 'content' && shortcut.contentId) {
      setStatus('transitioning')
      navigate(
        {
          pathname: getPatientLeisurePlayerPath(shortcut.contentId),
          search: location.search,
        },
        {
          state: {
            fromPath: location.pathname,
            fromLabel: shortcut.title,
            categoryId: shortcut.categoryId ?? undefined,
          },
        },
      )
      return
    }

    if (!shortcut.categoryId) {
      setStatus('empty')
      return
    }

    setStatus('transitioning')
    navigate(
      {
        pathname: getPatientLeisureCategoryPath(shortcut.categoryId),
        search: location.search,
      },
      {
        state: {
          fromPath: location.pathname,
          fromLabel: shortcut.title,
          categoryId: shortcut.categoryId,
        },
      },
    )
  }

  const noticeMessage =
    status === 'loading'
      ? '보호자가 저장한 여가 버튼을 불러오고 있습니다.'
      : status === 'empty'
        ? '등록된 여가 버튼이 없습니다. 보호자 설정에서 최대 5개까지 등록해 주세요.'
        : status === 'error'
          ? '여가 버튼을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
          : '뒤로가기를 제외한 버튼은 보호자 설정 순서대로 표시됩니다.'

  const slots = Array.from({ length: MAX_SHORTCUT_CARDS }, (_, index) => {
    return shortcutCards[index] ?? buildPlaceholderShortcut(index)
  })

  const isBusy = status === 'selecting' || status === 'transitioning'

  usePatientPageCellMapping([
    isBusy || (!slots[0]?.contentId && !slots[0]?.categoryId) ? null : 'main-shortcut-1',
    isBusy || (!slots[1]?.contentId && !slots[1]?.categoryId) ? null : 'main-shortcut-2',
    isBusy || (!slots[2]?.contentId && !slots[2]?.categoryId) ? null : 'main-shortcut-3',
    isBusy || (!slots[3]?.contentId && !slots[3]?.categoryId) ? null : 'main-shortcut-4',
    isBusy || (!slots[4]?.contentId && !slots[4]?.categoryId) ? null : 'main-shortcut-5',
    'main-back',
  ] as const)

  return (
    <LeisureLayout
      code="PAT-LEISURE-001"
      title="여가"
      description="보호자가 등록한 여가 버튼을 선택해 바로 재생하거나 연결된 콘텐츠를 엽니다."
      statusText={getMainStatusText(status)}
      contextLabel="보호자 맞춤 버튼 5개"
      hideHeader
    >
      <div style={contentWrapStyle}>
        <section style={mainGridShellStyle}>
          <div className="leisure-main-grid" style={mainGridStyle}>
            {slots.slice(0, 3).map((shortcut, index) => (
              <div key={shortcut.id} style={{ minHeight: 0, height: '100%' }}>
                <LeisureActionCard
                  title={shortcut.title}
                  description={shortcut.description}
                  badge={shortcut.badgeLabel}
                  tone={shortcut.tone}
                  variant="hero"
                  disabled={isBusy || !shortcut.contentId && !shortcut.categoryId}
                  slotId={`main-shortcut-${index + 1}`}
                  onSelect={() => {
                    void handleSelectShortcut(shortcut)
                  }}
                />
              </div>
            ))}

            <div style={{ gridColumn: '1 / -1', ...noticeWrapStyle }} aria-live="polite">
              <p style={noticeStyle}>{noticeMessage}</p>
            </div>

            {slots.slice(3, 5).map((shortcut, index) => (
              <div key={shortcut.id} style={{ minHeight: 0, height: '100%' }}>
                <LeisureActionCard
                  title={shortcut.title}
                  description={shortcut.description}
                  badge={shortcut.badgeLabel}
                  tone={shortcut.tone}
                  variant="hero"
                  disabled={isBusy || !shortcut.contentId && !shortcut.categoryId}
                  slotId={`main-shortcut-${index + 4}`}
                  onSelect={() => {
                    void handleSelectShortcut(shortcut)
                  }}
                />
              </div>
            ))}

            <div style={{ minHeight: 0, height: '100%' }}>
              <LeisureActionCard
                title="뒤로가기"
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
