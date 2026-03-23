import { Bounds, Center, Html, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Component,
  Suspense,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Color, Group, MathUtils, Mesh, MeshStandardMaterial } from 'three'
import { painAreaModelUrls } from '../bodyMindPainModels'

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

export interface BodyViewOffset {
  /** 카메라 Y 좌표 오프셋 (모델 중심 대비) */
  y: number
  /** 카메라 Z 거리 (줌 레벨, 작을수록 가까움) */
  z: number
}

interface BodyMindPainGuideCardProps {
  badge: string
  modelUrl: string
  fallbackModelUrl?: string
  headerText?: string
  highlightModelUrl?: string | null
  rotationY?: number
  viewOffset?: BodyViewOffset | null
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

const BASE_BODY_MATERIAL = new MeshStandardMaterial({
  color: '#F0F4F8',
})

function ModelScene({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl)
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(child => {
      if (child instanceof Mesh) {
        child.material = BASE_BODY_MATERIAL
      }
    })
    return clone
  }, [scene])

  return <primitive object={clonedScene} />
}

const HIGHLIGHT_MATERIAL = new MeshStandardMaterial({
  color: '#8FA8FF',
  emissive: new Color('#4A6AFF'),
  emissiveIntensity: 0.6,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
})

function HighlightModelScene({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl)
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(child => {
      if (child instanceof Mesh) {
        child.material = HIGHLIGHT_MATERIAL
      }
    })
    return clone
  }, [scene])

  return <primitive object={clonedScene} />
}

const ROTATION_LERP_SPEED = 5

function SmoothRotationGroup({
  targetRotationY,
  children,
}: {
  targetRotationY: number
  children: ReactNode
}) {
  const groupRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotationY,
      1 - Math.exp(-ROTATION_LERP_SPEED * delta),
    )
  })

  return <group ref={groupRef}>{children}</group>
}

const CAMERA_LERP_SPEED = 4

function CameraController({ viewOffset }: { viewOffset: BodyViewOffset }) {
  useFrame(({ camera }, delta) => {
    const t = 1 - Math.exp(-CAMERA_LERP_SPEED * delta)
    camera.position.y = MathUtils.lerp(camera.position.y, viewOffset.y, t)
    camera.position.z = MathUtils.lerp(camera.position.z, viewOffset.z, t)
    camera.lookAt(0, viewOffset.y, 0)
  })
  return null
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

painAreaModelUrls.forEach(modelUrl => {
  useGLTF.preload(modelUrl)
})

export default function BodyMindPainGuideCard({
  badge,
  modelUrl,
  fallbackModelUrl,
  headerText,
  highlightModelUrl,
  rotationY = 0,
  viewOffset,
}: BodyMindPainGuideCardProps) {
  const [modelState, setModelState] = useState(() => ({
    sourceModelUrl: modelUrl,
    hasFatalError: false,
    isFallbackModel: false,
  }))

  const currentModelState =
    modelState.sourceModelUrl === modelUrl
      ? modelState
      : {
          sourceModelUrl: modelUrl,
          hasFatalError: false,
          isFallbackModel: false,
        }

  const resolvedModelUrl =
    currentModelState.isFallbackModel && fallbackModelUrl ? fallbackModelUrl : modelUrl

  const handleModelError = () => {
    setModelState(previousState => {
      const nextState =
        previousState.sourceModelUrl === modelUrl
          ? previousState
          : {
              sourceModelUrl: modelUrl,
              hasFatalError: false,
              isFallbackModel: false,
            }

      if (!nextState.isFallbackModel && fallbackModelUrl && fallbackModelUrl !== modelUrl) {
        return {
          sourceModelUrl: modelUrl,
          hasFatalError: false,
          isFallbackModel: true,
        }
      }

      return {
        sourceModelUrl: modelUrl,
        hasFatalError: true,
        isFallbackModel: nextState.isFallbackModel,
      }
    })
  }

  return (
    <section style={cardStyle} aria-label={`${badge} 3D 가이드`}>
      <span style={badgeStyle}>{badge}</span>
      {headerText ? <p style={headerTextStyle}>{headerText}</p> : null}
      {currentModelState.hasFatalError ? (
        <Placeholder />
      ) : (
        <div style={canvasWrapStyle}>
          <ModelErrorBoundary key={resolvedModelUrl} onError={handleModelError}>
            <Canvas camera={{ position: [0, 0, 4.6], fov: 28 }} gl={{ antialias: true, alpha: true }}>
              <ambientLight intensity={1.3} />
              <directionalLight position={[4, 5, 4]} intensity={1.15} />
              <directionalLight position={[-3, 2, -3]} intensity={0.42} />
              <Suspense fallback={<LoadingOverlay />}>
                {viewOffset ? (
                  <>
                    <CameraController viewOffset={viewOffset} />
                    <Center>
                      <SmoothRotationGroup targetRotationY={rotationY}>
                        <ModelScene modelUrl={resolvedModelUrl} />
                        {highlightModelUrl ? <HighlightModelScene modelUrl={highlightModelUrl} /> : null}
                      </SmoothRotationGroup>
                    </Center>
                  </>
                ) : (
                  <Bounds fit clip observe margin={1.15}>
                    <Center>
                      <SmoothRotationGroup targetRotationY={rotationY}>
                        <ModelScene modelUrl={resolvedModelUrl} />
                        {highlightModelUrl ? <HighlightModelScene modelUrl={highlightModelUrl} /> : null}
                      </SmoothRotationGroup>
                    </Center>
                  </Bounds>
                )}
              </Suspense>
            </Canvas>
          </ModelErrorBoundary>
        </div>
      )}
    </section>
  )
}
