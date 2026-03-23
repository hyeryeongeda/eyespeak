import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import HomePage from '../../pages/HomePage'
import AppLayout from '../layouts/AppLayout'
import AuthLayout from '../layouts/AuthLayout'
import CareLayout from '../layouts/CareLayout'
import { PatientCalibrationRoute, ProtectedRoute, PublicOnlyRoute } from './guards'
import { ROUTE_PATHS, ROUTE_SEGMENTS } from './routePaths'

const RoleSelectPage = lazy(() => import('../../pages/auth/RoleSelectPage'))
const CareLoginPage = lazy(() => import('../../pages/auth/CareLoginPage'))
const PatientLoginPage = lazy(() => import('../../pages/auth/PatientLoginPage'))
const LoginPage = lazy(() => import('../../pages/auth/LoginPage'))
const CareSignupPage = lazy(() => import('../../pages/auth/CareSignupPage'))
const PatientSignupPage = lazy(() => import('../../pages/auth/PatientSignupPage'))
const SignupPage = lazy(() => import('../../pages/auth/SignupPage'))
const ResetPasswordPage = lazy(() => import('../../pages/auth/ResetPasswordPage'))
const PatientLayout = lazy(() => import('../layouts/PatientLayout'))

const CareHomePage = lazy(() => import('../../pages/care/CareHomePage'))
const CareSettingsPage = lazy(() => import('../../pages/care/CareSettingsPage'))
const ChatPage = lazy(() => import('../../pages/care/ChatPage'))
const RecordsPage = lazy(() => import('../../pages/care/RecordsPage'))
const PatientInfoPage = lazy(() => import('../../pages/care/settings/PatientInfoPage'))
const RoutineSettingPage = lazy(() => import('../../pages/care/settings/RoutineSettingPage'))
const FavoritesSettingPage = lazy(() => import('../../pages/care/settings/FavoritesSettingPage'))
const LeisureSettingPage = lazy(() => import('../../pages/care/settings/LeisureSettingPage'))
const DeviceSettingPage = lazy(() => import('../../pages/care/settings/DeviceSettingPage'))
const TtsSettingPage = lazy(() => import('../../pages/care/settings/TtsSettingPage'))
const ExpressionsPage = lazy(() => import('../../pages/care/settings/ExpressionsPage'))
const PatientCalibrationPage = lazy(() => import('../../features/patient/input/pages/PatientCalibrationPage'))
const TalkMainPage = lazy(() => import('../../pages/patient/talk/TalkMainPage'))
const PatientMainPage = lazy(() => import('../../pages/patient/main/PatientMainPage'))
const LeisureMainPage = lazy(() => import('../../pages/patient/leisure/LeisureMainPage'))
const LeisureCategoryPage = lazy(() => import('../../pages/patient/leisure/LeisureCategoryPage'))
const LeisurePlayerPage = lazy(() => import('../../pages/patient/leisure/LeisurePlayerPage'))
const BodyMindPage = lazy(() => import('../../pages/patient/body-mind/BodyMindPage'))
const BodyMindSecretionPage = lazy(() => import('../../pages/patient/body-mind/BodyMindSecretionPage'))
const BodyMindBreathingPage = lazy(() => import('../../pages/patient/body-mind/BodyMindBreathingPage'))
const BodyMindPainAreaPage = lazy(() => import('../../pages/patient/body-mind/BodyMindPainAreaPage'))
const BodyMindPainPartPage = lazy(() => import('../../pages/patient/body-mind/BodyMindPainPartPage'))
const BodyMindPainDetailPage = lazy(() => import('../../pages/patient/body-mind/BodyMindPainDetailPage'))
const BodyMindCategoryListPage = lazy(() => import('../../pages/patient/body-mind/BodyMindCategoryListPage'))
const BodyMindCategoryDetailPage = lazy(() => import('../../pages/patient/body-mind/BodyMindCategoryDetailPage'))
const BodyMindPlaceholderPage = lazy(() => import('../../pages/patient/body-mind/BodyMindPlaceholderPage'))
const FavoritesPage = lazy(() => import('../../pages/patient/favorites/FavoritesPage'))
const CustomTalkDirectionPage = lazy(() => import('../../features/patient/custom-talk/pages/CustomTalkDirectionPage'))
const CustomTalkRecommendPage = lazy(() => import('../../features/patient/custom-talk/pages/CustomTalkRecommendPage'))
const CustomTalkComposePage = lazy(() => import('../../features/patient/custom-talk/pages/CustomTalkComposePage'))
const CustomTalkGeneratedPage = lazy(() => import('../../features/patient/custom-talk/pages/CustomTalkGeneratedPage'))
const CustomTalkKeyboardPage = lazy(() => import('../../features/patient/custom-talk/pages/CustomTalkKeyboardPage'))

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

const authRoutes = [
  {
    index: true,
    element: <Navigate to={ROUTE_PATHS.AUTH_ROLE} replace />,
  },
  {
    path: ROUTE_SEGMENTS.AUTH.ROLE,
    element: (
      <Suspense fallback={null}>
        <RoleSelectPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.LOGIN_CARE,
    element: (
      <Suspense fallback={null}>
        <CareLoginPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.LOGIN_PATIENT,
    element: (
      <Suspense fallback={null}>
        <PatientLoginPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.LOGIN,
    element: (
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.SIGNUP_CARE,
    element: (
      <Suspense fallback={null}>
        <CareSignupPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.SIGNUP_PATIENT,
    element: (
      <Suspense fallback={null}>
        <PatientSignupPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.SIGNUP,
    element: (
      <Suspense fallback={null}>
        <SignupPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.RESET_PASSWORD,
    element: (
      <Suspense fallback={null}>
        <ResetPasswordPage />
      </Suspense>
    ),
  },
]

const patientRoutes = [
  {
    index: true,
    element: <Navigate to={ROUTE_PATHS.PATIENT_MAIN} replace />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CALIBRATION,
    element: (
      <Suspense fallback={null}>
        <PatientCalibrationPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.MAIN,
    element: (
      <Suspense fallback={null}>
        <PatientMainPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.TALK_MAIN,
    element: (
      <Suspense fallback={null}>
        <TalkMainPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.LEISURE,
    element: (
      <Suspense fallback={null}>
        <LeisureMainPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.LEISURE_CATEGORY,
    element: (
      <Suspense fallback={null}>
        <LeisureCategoryPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.LEISURE_PLAYER,
    element: (
      <Suspense fallback={null}>
        <LeisurePlayerPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND,
    element: (
      <Suspense fallback={null}>
        <BodyMindPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_SECRETION,
    element: (
      <Suspense fallback={null}>
        <BodyMindSecretionPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_BREATHING,
    element: (
      <Suspense fallback={null}>
        <BodyMindBreathingPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_PAIN_AREA,
    element: (
      <Suspense fallback={null}>
        <BodyMindPainAreaPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_PAIN_PART,
    element: (
      <Suspense fallback={null}>
        <BodyMindPainPartPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_PAIN_DETAIL,
    element: (
      <Suspense fallback={null}>
        <BodyMindPainDetailPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_POSTURE,
    element: (
      <Suspense fallback={null}>
        <BodyMindPlaceholderPage
          code="PAT-BM-STUB"
          title="자세 바꿔줘"
          description="자세 변경 상세 화면은 스텁으로 우선 연결했습니다."
          note="자세 바꿔줘 상세 항목은 추후 디자인과 표현 스펙이 확정되면 연결합니다."
          backPath={ROUTE_PATHS.PATIENT_BODY_MIND}
          backDescription="몸과마음 메인으로 돌아가기"
        />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_CATEGORIES,
    element: (
      <Suspense fallback={null}>
        <BodyMindCategoryListPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_CATEGORY_DETAIL,
    element: (
      <Suspense fallback={null}>
        <BodyMindCategoryDetailPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.FAVORITES,
    element: (
      <Suspense fallback={null}>
        <FavoritesPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_LEGACY,
    element: <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK,
    element: (
      <Suspense fallback={null}>
        <CustomTalkDirectionPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_RECOMMEND,
    element: (
      <Suspense fallback={null}>
        <CustomTalkRecommendPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_COMPOSE,
    element: (
      <Suspense fallback={null}>
        <CustomTalkComposePage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_GENERATED,
    element: (
      <Suspense fallback={null}>
        <CustomTalkGeneratedPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_KEYBOARD,
    element: (
      <Suspense fallback={null}>
        <CustomTalkKeyboardPage />
      </Suspense>
    ),
  },
]

const careRoutes = [
  {
    index: true,
    element: <Navigate to={ROUTE_PATHS.CARE_HOME} replace />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.HOME,
    element: (
      <Suspense fallback={null}>
        <CareHomePage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.CARE.CHAT,
    element: (
      <Suspense fallback={null}>
        <ChatPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.CARE.RECORD,
    element: (
      <Suspense fallback={null}>
        <RecordsPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS,
    element: (
      <Suspense fallback={null}>
        <CareSettingsPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_PATIENT_INFO,
    element: (
      <Suspense fallback={null}>
        <PatientInfoPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_ROUTINE,
    element: (
      <Suspense fallback={null}>
        <RoutineSettingPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_FAVORITES,
    element: (
      <Suspense fallback={null}>
        <FavoritesSettingPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_LEISURE,
    element: (
      <Suspense fallback={null}>
        <LeisureSettingPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_DEVICE,
    element: (
      <Suspense fallback={null}>
        <DeviceSettingPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_TTS,
    element: (
      <Suspense fallback={null}>
        <TtsSettingPage />
      </Suspense>
    ),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_EXPRESSIONS,
    element: (
      <Suspense fallback={null}>
        <ExpressionsPage />
      </Suspense>
    ),
  },
]

const router = createBrowserRouter(
  [
    {
      path: ROUTE_PATHS.HOME,
      element: <AppLayout />,
      children: [
        {
          index: true,
          element: (
            <PublicOnlyRoute>
              <HomePage />
            </PublicOnlyRoute>
          ),
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
              <PatientCalibrationRoute>
                <Suspense fallback={null}>
                  <PatientLayout />
                </Suspense>
              </PatientCalibrationRoute>
            </ProtectedRoute>
          ),
          children: patientRoutes,
        },
        {
          path: ROUTE_SEGMENTS.CARE.ROOT,
          element: (
            <ProtectedRoute allowedRole="guardian">
              <CareLayout />
            </ProtectedRoute>
          ),
          children: careRoutes,
        },
      ],
    },
  ],
  {
    basename: routerBasename,
  },
)

export default router
