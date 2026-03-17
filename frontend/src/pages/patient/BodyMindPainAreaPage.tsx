import { useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../hooks/useAuth'
import {
  getStoredPainAreaSelection,
  storePainAreaSelection,
} from '../../services/bodyMindService'
import type { BodyMindUiStatus, PainAreaKey, PainAreaRouteState } from '../../types/communication'
import { getPainAreaOptionByKey, painAreaGroups } from './bodyMindMock'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

const groupGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '12px',
}

const groupPanelStyle: CSSProperties = {
  padding: '16px',
  borderRadius: '24px',
  border: '1px solid #dde7ed',
  backgroundColor: 'rgba(255, 255, 255, 0.88)',
  boxShadow: '0 16px 36px rgba(40, 66, 90, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const groupTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  fontWeight: 800,
  color: '#203042',
}

const groupOptionGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '10px',
}

export default function BodyMindPainAreaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const routeState = location.state as PainAreaRouteState | null
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedAreaKey, setSelectedAreaKey] = useState<PainAreaKey | null>(
    routeState?.selectedAreaKey ?? getStoredPainAreaSelection(patientId),
  )

  const selectedArea = getPainAreaOptionByKey(selectedAreaKey)

  const handleSelectArea = (areaKey: PainAreaKey) => {
    setSelectedAreaKey(areaKey)
    setStatus('area_selected')
    storePainAreaSelection(patientId, areaKey)
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_DETAIL, {
      state: { selectedAreaKey: areaKey },
    })
  }

  const handleBack = () => {
    setStatus('transitioning')
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND)
  }

  return (
    <BodyMindLayout
      code="PAT-BM-004"
      title="아파"
      description="통증이 있는 부위를 먼저 선택한 뒤 상세 표현으로 이동합니다."
      status={status}
      contextLabel={selectedArea ? `현재 선택: ${selectedArea.label}` : undefined}
      feedbackText="부위를 선택하면 다음 단계에서 통증 상세를 고를 수 있습니다."
    >
      <div style={groupGridStyle}>
        {painAreaGroups.map(group => (
          <section key={group.key} style={groupPanelStyle}>
            <h2 style={groupTitleStyle}>{group.label}</h2>

            <div style={groupOptionGridStyle}>
              {group.options.map(option => (
                <BodyMindOptionCard
                  key={option.key}
                  title={option.label}
                  tone={option.tone}
                  selected={selectedAreaKey === option.key}
                  style={{ minHeight: '108px' }}
                  onSelect={() => handleSelectArea(option.key)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <BodyMindOptionCard
        title="뒤로가기"
        description="몸과마음 메인으로"
        tone="slate"
        onSelect={handleBack}
      />
    </BodyMindLayout>
  )
}
