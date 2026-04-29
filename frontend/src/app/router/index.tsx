import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import HomePage from '../../pages/HomePage'
import AppLayout from '../layouts/AppLayout'
import AuthLayout from '../layouts/AuthLayout'
import CareLayout from '../layouts/CareLayout'
import { PatientCalibrationRoute, ProtectedRoute, PublicOnlyRoute } from './guards'
import { ROUTE_PATHS, ROUTE_SEGMENTS } from './routePaths'

const RoleSelectPage = lazy(() => import('../../features/auth/pages/RoleSelectPage'))
const CareLoginPage = lazy(() => import('../../features/auth/pages/CareLoginPage'))
const PatientLoginPage = lazy(() => import('../../features/auth/pages/PatientLoginPage'))
const LoginPage = lazy(() => import('../../features/auth/pages/LoginPage'))
const CareSignupPage = lazy(() => import('../../features/auth/pages/CareSignupPage'))
const PatientSignupPage = lazy(() => import('../../features/auth/pages/PatientSignupPage'))
const SignupPage = lazy(() => import('../../features/auth/pages/SignupPage'))
const ResetPasswordPage = lazy(() => import('../../features/auth/pages/ResetPasswordPage'))
const PatientLayout = lazy(() => import('../layouts/PatientLayout'))

const CareHomePage = lazy(() => import('../../features/care/home/pages/CareHomePage'))
const CareSettingsPage = lazy(() => import('../../features/care/settings/pages/CareSettingsPage'))
const ChatPage = lazy(() => import('../../features/care/chat/pages/ChatPage'))
const RecordsPage = lazy(() => import('../../features/care/records/pages/RecordsPage'))
const PatientInfoPage = lazy(() => import('../../features/care/settings/pages/PatientInfoPage'))
const RoutineSettingPage = lazy(() => import('../../features/care/settings/pages/RoutineSettingPage'))
const FavoritesSettingPage = lazy(() => import('../../features/care/settings/pages/FavoritesSettingPage'))
const LeisureSettingPage = lazy(() => import('../../features/care/settings/pages/LeisureSettingPage'))
const DeviceSettingPage = lazy(() => import('../../features/care/settings/pages/DeviceSettingPage'))
const TtsSettingPage = lazy(() => import('../../features/care/settings/pages/TtsSettingPage'))
const ExpressionsPage = lazy(() => import('../../features/care/settings/pages/ExpressionsPage'))
const PatientCalibrationPage = lazy(() => import('../../features/patient/input/pages/PatientCalibrationPage'))
const TalkMainPage = lazy(() => import('../../features/patient/chat/pages/TalkMainPage'))
const PatientMainPage = lazy(() => import('../../features/patient/main/pages/PatientMainPage'))
const LeisureMainPage = lazy(() => import('../../features/patient/leisure/LeisureMainPage'))
const LeisureCategoryPage = lazy(() => import('../../features/patient/leisure/LeisureCategoryPage'))
const LeisurePlayerPage = lazy(() => import('../../features/patient/leisure/LeisurePlayerPage'))
const BodyMindPage = lazy(() => import('../../features/patient/body-mind/BodyMindPage'))
const BodyMindSecretionPage = lazy(() => import('../../features/patient/body-mind/BodyMindSecretionPage'))
const BodyMindBreathingPage = lazy(() => import('../../features/patient/body-mind/BodyMindBreathingPage'))
const BodyMindPainAreaPage = lazy(() => import('../../features/patient/body-mind/BodyMindPainAreaPage'))
const BodyMindPainPartPage = lazy(() => import('../../features/patient/body-mind/BodyMindPainPartPage'))
const BodyMindPainDetailPage = lazy(() => import('../../features/patient/body-mind/BodyMindPainDetailPage'))
const BodyMindPosturePage = lazy(() => import('../../features/patient/body-mind/BodyMindPosturePage'))
const BodyMindCategoryListPage = lazy(() => import('../../features/patient/body-mind/BodyMindCategoryListPage'))
const BodyMindCategoryDetailPage = lazy(() => import('../../features/patient/body-mind/BodyMindCategoryDetailPage'))
const FavoritesPage = lazy(() => import('../../features/patient/favorites/pages/FavoritesPage'))
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
        <BodyMindPosturePage />
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
