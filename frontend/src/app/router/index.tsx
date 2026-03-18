import { createBrowserRouter, Navigate } from 'react-router-dom'
import HomePage from '../../pages/HomePage'
import CareHomePage from '../../pages/care/CareHomePage'
import CareLoginPage from '../../pages/auth/CareLoginPage'
import CareSignupPage from '../../pages/auth/CareSignupPage'
import LoginPage from '../../pages/auth/LoginPage'
import PatientLoginPage from '../../pages/auth/PatientLoginPage'
import TalkMainPage from '../../pages/patient/talk/TalkMainPage'
import PatientMainPage from '../../pages/patient/main/PatientMainPage'
import LeisureMainPage from '../../pages/patient/leisure/LeisureMainPage'
import LeisureCategoryPage from '../../pages/patient/leisure/LeisureCategoryPage'
import LeisurePlayerPage from '../../pages/patient/leisure/LeisurePlayerPage'
import BodyMindPage from '../../pages/patient/body-mind/BodyMindPage'
import BodyMindSecretionPage from '../../pages/patient/body-mind/BodyMindSecretionPage'
import BodyMindBreathingPage from '../../pages/patient/body-mind/BodyMindBreathingPage'
import BodyMindPainAreaPage from '../../pages/patient/body-mind/BodyMindPainAreaPage'
import BodyMindPainDetailPage from '../../pages/patient/body-mind/BodyMindPainDetailPage'
import BodyMindCategoryListPage from '../../pages/patient/body-mind/BodyMindCategoryListPage'
import BodyMindCategoryDetailPage from '../../pages/patient/body-mind/BodyMindCategoryDetailPage'
import BodyMindPlaceholderPage from '../../pages/patient/body-mind/BodyMindPlaceholderPage'
import FavoritesPage from '../../pages/patient/favorites/FavoritesPage'
import CustomTalkDirectionPage from '../../pages/patient/talk/CustomTalkDirectionPage'
import PatientSignupPage from '../../pages/auth/PatientSignupPage'
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage'
import RoleSelectPage from '../../pages/auth/RoleSelectPage'
import SignupPage from '../../pages/auth/SignupPage'
import AppLayout from '../layouts/AppLayout'
import AuthLayout from '../layouts/AuthLayout'
import CareLayout from '../layouts/CareLayout'
import PatientLayout from '../layouts/PatientLayout'
import { ProtectedRoute, PublicOnlyRoute } from './guards'
import { ROUTE_PATHS, ROUTE_SEGMENTS } from './routePaths'

const authRoutes = [
  {
    index: true,
    element: <Navigate to={ROUTE_PATHS.AUTH_ROLE} replace />,
  },
  {
    path: ROUTE_SEGMENTS.AUTH.ROLE,
    element: <RoleSelectPage />,
  },
  {
    path: ROUTE_SEGMENTS.AUTH.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTE_SEGMENTS.AUTH.LOGIN_CARE,
    element: <CareLoginPage />,
  },
  {
    path: ROUTE_SEGMENTS.AUTH.LOGIN_PATIENT,
    element: <PatientLoginPage />,
  },
  {
    path: ROUTE_SEGMENTS.AUTH.SIGNUP,
    element: <SignupPage />,
  },
  {
    path: ROUTE_SEGMENTS.AUTH.SIGNUP_CARE,
    element: <CareSignupPage />,
  },
  {
    path: ROUTE_SEGMENTS.AUTH.SIGNUP_PATIENT,
    element: <PatientSignupPage />,
  },
  {
    path: ROUTE_SEGMENTS.AUTH.RESET_PASSWORD,
    element: <ResetPasswordPage />,
  },
]

const patientRoutes = [
  {
    index: true,
    element: <Navigate to={ROUTE_PATHS.PATIENT_MAIN} replace />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.MAIN,
    element: <PatientMainPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.TALK_MAIN,
    element: <TalkMainPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.LEISURE,
    element: <LeisureMainPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.LEISURE_CATEGORY,
    element: <LeisureCategoryPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.LEISURE_PLAYER,
    element: <LeisurePlayerPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND,
    element: <BodyMindPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_SECRETION,
    element: <BodyMindSecretionPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_BREATHING,
    element: <BodyMindBreathingPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_PAIN_AREA,
    element: <BodyMindPainAreaPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_PAIN_DETAIL,
    element: <BodyMindPainDetailPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_POSTURE,
    element: (
      <BodyMindPlaceholderPage
        code="PAT-BM-STUB"
        title="자세 바꿔줘"
        description="자세 변경 상세 화면은 스텁으로 우선 연결했습니다."
        note="자세 바꿔줘 상세 항목은 추후 디자인과 표현 스펙이 확정되면 연결합니다."
        backPath={ROUTE_PATHS.PATIENT_BODY_MIND}
        backDescription="몸과마음 메인으로 돌아가기"
      />
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_CATEGORIES,
    element: <BodyMindCategoryListPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_CATEGORY_DETAIL,
    element: <BodyMindCategoryDetailPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.FAVORITES,
    element: <FavoritesPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK,
    element: <CustomTalkDirectionPage />,
  },
]

const careRoutes = [
  {
    index: true,
    element: <Navigate to={ROUTE_PATHS.CARE_HOME} replace />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.HOME,
    element: <CareHomePage />,
  },
]

const router = createBrowserRouter([
  {
    path: ROUTE_PATHS.HOME,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: ROUTE_SEGMENTS.AUTH.ROOT,
        element: (
          <PublicOnlyRoute>
            <AuthLayout />
          </PublicOnlyRoute>
        ),
        children: authRoutes,
      },
      {
        path: ROUTE_SEGMENTS.PATIENT.ROOT,
        element: (
          <ProtectedRoute allowedRole="patient">
            <PatientLayout />
          </ProtectedRoute>
        ),
        children: patientRoutes,
      },
      {
        path: ROUTE_SEGMENTS.CARE.ROOT,
        element: (
          <ProtectedRoute allowedRole="caregiver">
            <CareLayout />
          </ProtectedRoute>
        ),
        children: careRoutes,
      },
    ],
  },
])

export default router
