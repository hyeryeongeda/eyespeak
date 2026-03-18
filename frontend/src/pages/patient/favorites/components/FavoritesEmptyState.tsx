import type { CSSProperties } from 'react'

const wrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  textAlign: 'center',
  padding: '24px',
  background:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(246, 249, 252, 0.96) 100%)',
  borderRadius: '24px',
  border: '1px solid rgba(213, 222, 233, 0.88)',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#203042',
  fontSize: 'clamp(1.35rem, 1.9vw, 1.6rem)',
  fontWeight: 900,
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: '520px',
  color: '#62768c',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
}

export interface FavoritesEmptyStateProps {
  title?: string
  description?: string
}

export default function FavoritesEmptyState({
  title = '등록된 즐겨찾기가 없어요',
  description = '대화하기 메인에서 자주 쓰는 말을 등록해 보세요.',
}: FavoritesEmptyStateProps) {
  return (
    <section style={wrapStyle} aria-label="즐겨찾기 없음">
      <h3 style={titleStyle}>{title}</h3>
      <p style={descriptionStyle}>{description}</p>
    </section>
  )
}
