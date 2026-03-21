import { Bounds, Center, Html, useGLTF } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

const cardStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '28px',
  border: '1px solid rgba(213, 222, 236, 0.96)',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(249, 251, 255, 0.98) 100%)',
  boxShadow: '0 24px 54px rgba(39, 64, 104, 0.08)',
  padding: '16px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  minHeight: '30px',
  padding: '0 12px',
  borderRadius: '999px',
  border: '1px solid rgba(218, 225, 241, 0.9)',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  fontSize: '0.76rem',
  fontWeight: 800,
  color: '#8d9ddd',
}

const headerTextStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.86rem',
  fontWeight: 700,
  lineHeight: 1.45,
  color: '#6e7d93',
}

const canvasWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  borderRadius: '22px',
  overflow: 'hidden',
  background:
    'radial-gradient(circle at top, rgba(237, 242, 255, 0.76) 0%, rgba(248, 250, 255, 0.94) 58%, rgba(255, 255, 255, 0.98) 100%)',
}

const loadingStyle: CSSProperties = {
  padding: '8px 12px',
  borderRadius: '999px',
  border: '1px solid rgba(214, 223, 239, 0.95)',
  backgroundColor: 'rgba(255, 255, 255, 0.94)',
  color: '#7585b2',
  fontSize: '0.78rem',
  fontWeight: 700,
}

const placeholderWrapStyle: CSSProperties = {
  ...canvasWrapStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '18px',
  textAlign: 'center',
}

const placeholderTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  fontWeight: 800,
  color: '#2a3448',
}

const placeholderDescriptionStyle: CSSProperties = {
  margin: '8px 0 0',
  fontSize: '0.88rem',
  fontWeight: 600,
  lineHeight: 1.45,
  color: '#6e7d93',
}

interface BodyMindPainGuideCardProps {
  badge: string
  modelUrl: string
  fallbackModelUrl?: string
  headerText?: string
}

interface ModelErrorBoundaryProps {
  children: ReactNode
  onError: () => void
}

interface ModelErrorBoundaryState {
  hasError: boolean
}

class ModelErrorBoundary extends Component<ModelErrorBoundaryProps, ModelErrorBoundaryState> {
  state: ModelErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}

function LoadingOverlay() {
  return (
    <Html center>
      <div style={loadingStyle}>모델 로딩 중</div>
    </Html>
  )
}

function ModelScene({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl)
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  return (
    <Bounds fit clip observe margin={1.15}>
      <Center>
        <primitive object={clonedScene} />
      </Center>
    </Bounds>
  )
}

function Placeholder() {
  return (
    <div style={placeholderWrapStyle}>
      <div>
        <p style={placeholderTitleStyle}>모델을 불러올 수 없습니다</p>
        <p style={placeholderDescriptionStyle}>부위 선택은 계속 진행할 수 있습니다.</p>
      </div>
    </div>
  )
}

export default function BodyMindPainGuideCard({
  badge,
  modelUrl,
  fallbackModelUrl,
  headerText,
}: BodyMindPainGuideCardProps) {
  const [resolvedModelUrl, setResolvedModelUrl] = useState(modelUrl)
  const [hasFatalError, setHasFatalError] = useState(false)
  const [isFallbackModel, setIsFallbackModel] = useState(false)

  useEffect(() => {
    setResolvedModelUrl(modelUrl)
    setHasFatalError(false)
    setIsFallbackModel(false)
  }, [modelUrl])

  const handleModelError = () => {
    if (!isFallbackModel && fallbackModelUrl && fallbackModelUrl !== resolvedModelUrl) {
      setResolvedModelUrl(fallbackModelUrl)
      setIsFallbackModel(true)
      return
    }

    setHasFatalError(true)
  }

  return (
    <section style={cardStyle} aria-label={`${badge} 3D 가이드`}>
      <span style={badgeStyle}>{badge}</span>
      {headerText ? <p style={headerTextStyle}>{headerText}</p> : null}
      {hasFatalError ? (
        <Placeholder />
      ) : (
        <div style={canvasWrapStyle}>
          <ModelErrorBoundary key={resolvedModelUrl} onError={handleModelError}>
            <Canvas camera={{ position: [0, 0, 4.6], fov: 28 }} gl={{ antialias: true, alpha: true }}>
              <ambientLight intensity={1.3} />
              <directionalLight position={[4, 5, 4]} intensity={1.15} />
              <directionalLight position={[-3, 2, -3]} intensity={0.42} />
              <Suspense fallback={<LoadingOverlay />}>
                <ModelScene modelUrl={resolvedModelUrl} />
              </Suspense>
            </Canvas>
          </ModelErrorBoundary>
        </div>
      )}
    </section>
  )
}
