import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useParams } from 'react-router-dom'
import { getBodyMindCategoryOptionByKey } from './bodyMindMock'
import BodyMindPlaceholderPage from './BodyMindPlaceholderPage'

export default function BodyMindCategoryDetailPage() {
  const { categoryKey } = useParams()
  const category = getBodyMindCategoryOptionByKey(categoryKey)

  return (
    <BodyMindPlaceholderPage
      code="PAT-BM-006-STUB"
      title={category?.label ?? '카테고리 상세'}
      description={
        category
          ? `${category.label} 상세 화면은 확장 가능한 라우트만 연결된 상태입니다.`
          : '카테고리 상세 화면을 준비 중입니다.'
      }
      note="하위 카테고리 상세 UI와 표현 전달 API는 추후 스펙 확정 후 연결합니다."
      backPath={ROUTE_PATHS.PATIENT_BODY_MIND_CATEGORIES}
      backDescription="카테고리 목록으로 돌아가기"
      contextLabel={category?.description}
    />
  )
}
