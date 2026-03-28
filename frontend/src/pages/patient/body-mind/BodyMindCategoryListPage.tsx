import { Navigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'

export default function BodyMindCategoryListPage() {
  return (
    <Navigate
      to={ROUTE_PATHS.PATIENT_BODY_MIND}
      replace
      state={{ initialPageIndex: 1 }}
    />
  )
}
