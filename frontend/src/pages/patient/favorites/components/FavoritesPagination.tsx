import type { CSSProperties } from 'react'

const wrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  flexShrink: 0,
  padding: '12px 0',
}

const btnStyle: CSSProperties = {
  minWidth: '100px',
  padding: '12px 20px',
  borderRadius: '14px',
  border: '1px solid #d4dfe7',
  backgroundColor: '#ffffff',
  color: '#203042',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
}

const labelStyle: CSSProperties = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 700,
  color: '#647587',
}

export interface FavoritesPaginationProps {
  pageIndex: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export default function FavoritesPagination({
  pageIndex,
  totalPages,
  onPrev,
  onNext,
}: FavoritesPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const hasPrev = pageIndex > 0
  const hasNext = pageIndex < totalPages - 1

  return (
    <nav style={wrapStyle} aria-label="즐겨찾기 페이지 넘기기">
      <button
        type="button"
        style={btnStyle}
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="이전 페이지"
      >
        이전
      </button>
      <span style={labelStyle} aria-live="polite">
        {pageIndex + 1} / {totalPages}
      </span>
      <button
        type="button"
        style={btnStyle}
        onClick={onNext}
        disabled={!hasNext}
        aria-label="다음 페이지"
      >
        다음
      </button>
    </nav>
  )
}
