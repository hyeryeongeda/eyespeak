import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import AuthLayout from '../layouts/AuthLayout'
import { PatientCalibrationRoute, ProtectedRoute, PublicOnlyRoute } from './guards'
import { ROUTE_PATHS, ROUTE_SEGMENTS } from './routePaths'

const HomePage = lazy(() => import('../../pages/HomePage'))
const CareHomePage = lazy(() => import('../../pages/care/CareHomePage'))
const CareSettingsPage = lazy(() => import('../../pages/care/CareSettingsPage'))
const ChatPage = lazy(() => import('../../pages/care/ChatPage'))
const RecordsPage = lazy(() => import('../../pages/care/RecordsPage'))
const VoicePage = lazy(() => import('../../pages/care/VoicePage'))
const PatientInfoPage = lazy(() => import('../../pages/care/settings/PatientInfoPage'))
const RoutineSettingPage = lazy(() => import('../../pages/care/settings/RoutineSettingPage'))
const FavoritesSettingPage = lazy(() => import('../../pages/care/settings/FavoritesSettingPage'))
const LeisureSettingPage = lazy(() => import('../../pages/care/settings/LeisureSettingPage'))
const DeviceSettingPage = lazy(() => import('../../pages/care/settings/DeviceSettingPage'))
const TtsSettingPage = lazy(() => import('../../pages/care/settings/TtsSettingPage'))
const WordsSettingPage = lazy(() => import('../../pages/care/settings/WordsSettingPage'))
const ExpressionsPage = lazy(() => import('../../pages/care/settings/ExpressionsPage'))
const CareLoginPage = lazy(() => import('../../pages/auth/CareLoginPage'))
const CareSignupPage = lazy(() => import('../../pages/auth/CareSignupPage'))
const LoginPage = lazy(() => import('../../pages/auth/LoginPage'))
const PatientLoginPage = lazy(() => import('../../pages/auth/PatientLoginPage'))
const PatientSignupPage = lazy(() => import('../../pages/auth/PatientSignupPage'))
const ResetPasswordPage = lazy(() => import('../../pages/auth/ResetPasswordPage'))
const RoleSelectPage = lazy(() => import('../../pages/auth/RoleSelectPage'))
const SignupPage = lazy(() => import('../../pages/auth/SignupPage'))
const PatientCalibrationPage = lazy(
  () => import('../../features/patient/input/pages/PatientCalibrationPage'),
)
const TalkMainPage = lazy(() => import('../../pages/patient/talk/TalkMainPage'))
const PatientMainPage = lazy(() => import('../../pages/patient/main/PatientMainPage'))
const LeisureMainPage = lazy(() => import('../../pages/patient/leisure/LeisureMainPage'))
const LeisureCategoryPage = lazy(() => import('../../pages/patient/leisure/LeisureCategoryPage'))
const LeisurePlayerPage = lazy(() => import('../../pages/patient/leisure/LeisurePlayerPage'))
const BodyMindPage = lazy(() => import('../../pages/patient/body-mind/BodyMindPage'))
const BodyMindSecretionPage = lazy(
  () => import('../../pages/patient/body-mind/BodyMindSecretionPage'),
)
const BodyMindBreathingPage = lazy(
  () => import('../../pages/patient/body-mind/BodyMindBreathingPage'),
)
const BodyMindPainAreaPage = lazy(
  () => import('../../pages/patient/body-mind/BodyMindPainAreaPage'),
)
const BodyMindPainPartPage = lazy(
  () => import('../../pages/patient/body-mind/BodyMindPainPartPage'),
)
const BodyMindPainDetailPage = lazy(
  () => import('../../pages/patient/body-mind/BodyMindPainDetailPage'),
)
const BodyMindCategoryListPage = lazy(
  () => import('../../pages/patient/body-mind/BodyMindCategoryListPage'),
)
const BodyMindCategoryDetailPage = lazy(
  () => import('../../pages/patient/body-mind/BodyMindCategoryDetailPage'),
)
const BodyMindPlaceholderPage = lazy(
  () => import('../../pages/patient/body-mind/BodyMindPlaceholderPage'),
)
const FavoritesPage = lazy(() => import('../../pages/patient/favorites/FavoritesPage'))
const CustomTalkDirectionPage = lazy(
  () => import('../../features/patient/custom-talk/pages/CustomTalkDirectionPage'),
)
const CustomTalkRecommendPage = lazy(
  () => import('../../features/patient/custom-talk/pages/CustomTalkRecommendPage'),
)
const CustomTalkComposePage = lazy(
  () => import('../../features/patient/custom-talk/pages/CustomTalkComposePage'),
)
const CustomTalkGeneratedPage = lazy(
  () => import('../../features/patient/custom-talk/pages/CustomTalkGeneratedPage'),
)
const CustomTalkKeyboardPage = lazy(
  () => import('../../features/patient/custom-talk/pages/CustomTalkKeyboardPage'),
)
const CareLayout = lazy(() => import('../layouts/CareLayout'))
const PatientLayout = lazy(() => import('../layouts/PatientLayout'))

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

function withRouteSuspense(element: ReactNode) {
  return <Suspense fallback={null}>{element}</Suspense>
}

const authRoutes = [
  {
    index: true,
    element: <Navigate to={ROUTE_PATHS.AUTH_ROLE} replace />,
  },
  {
    path: ROUTE_SEGMENTS.AUTH.ROLE,
    element: withRouteSuspense(<RoleSelectPage />),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.LOGIN_CARE,
    element: withRouteSuspense(<CareLoginPage />),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.LOGIN_PATIENT,
    element: withRouteSuspense(<PatientLoginPage />),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.LOGIN,
    element: withRouteSuspense(<LoginPage />),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.SIGNUP_CARE,
    element: withRouteSuspense(<CareSignupPage />),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.SIGNUP_PATIENT,
    element: withRouteSuspense(<PatientSignupPage />),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.SIGNUP,
    element: withRouteSuspense(<SignupPage />),
  },
  {
    path: ROUTE_SEGMENTS.AUTH.RESET_PASSWORD,
    element: withRouteSuspense(<ResetPasswordPage />),
  },
]

const patientAppRoutes = [
  {
    index: true,
    element: <Navigate to={ROUTE_PATHS.PATIENT_MAIN} replace />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.MAIN,
    element: withRouteSuspense(<PatientMainPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.TALK_MAIN,
    element: withRouteSuspense(<TalkMainPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.LEISURE,
    element: withRouteSuspense(<LeisureMainPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.LEISURE_CATEGORY,
    element: withRouteSuspense(<LeisureCategoryPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.LEISURE_PLAYER,
    element: withRouteSuspense(<LeisurePlayerPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND,
    element: withRouteSuspense(<BodyMindPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_SECRETION,
    element: withRouteSuspense(<BodyMindSecretionPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_BREATHING,
    element: withRouteSuspense(<BodyMindBreathingPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_PAIN_AREA,
    element: withRouteSuspense(<BodyMindPainAreaPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_PAIN_PART,
    element: withRouteSuspense(<BodyMindPainPartPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_PAIN_DETAIL,
    element: withRouteSuspense(<BodyMindPainDetailPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_POSTURE,
    element: withRouteSuspense(
      <BodyMindPlaceholderPage
        code="PAT-BM-STUB"
        title="?ë¨¯ê½­ è«›ë¶½í“­ä»¥?"
        description="?ë¨¯ê½­ è¹‚Â€å¯ƒ??ê³¸ê½­ ?ë¶¾ãˆƒ?Â€ ?ã…½ë€…?ì‡°ì¤ˆ ?ê³—ê½‘ ?ê³Œê»?ë‰ë’¿?ëˆë–Ž."
        note="?ë¨¯ê½­ è«›ë¶½í“­ä»¥??ê³¸ê½­ ??ã‰?Â€ ç•°ë·€ì‘ ?ë¶¿ì˜„?ë©¸ë‚µ ?ì’—ì½ ?ã…½ëŸº???ëº¤ì ™?ì„Žãˆƒ ?ê³Œê»?â‘¸ë•²??"
        backPath={ROUTE_PATHS.PATIENT_BODY_MIND}
        backDescription="ï§ë©¸ë‚µï§ë‰ì“¬ ï§Žë¶¿ì”¤?ì‡°ì¤ˆ ?ëš¯ë¸˜åª›Â€æ¹²?"
      />,
    ),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_CATEGORIES,
    element: withRouteSuspense(<BodyMindCategoryListPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_CATEGORY_DETAIL,
    element: withRouteSuspense(<BodyMindCategoryDetailPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.FAVORITES,
    element: withRouteSuspense(<FavoritesPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_LEGACY,
    element: <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK,
    element: withRouteSuspense(<CustomTalkDirectionPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_RECOMMEND,
    element: withRouteSuspense(<CustomTalkRecommendPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_COMPOSE,
    element: withRouteSuspense(<CustomTalkComposePage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_GENERATED,
    element: withRouteSuspense(<CustomTalkGeneratedPage />),
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_KEYBOARD,
    element: withRouteSuspense(<CustomTalkKeyboardPage />),
  },
]

const careRoutes = [
  {
    index: true,
    element: <Navigate to={ROUTE_PATHS.CARE_HOME} replace />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.HOME,
    element: withRouteSuspense(<CareHomePage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.CHAT,
    element: withRouteSuspense(<ChatPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.RECORD,
    element: withRouteSuspense(<RecordsPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS,
    element: withRouteSuspense(<CareSettingsPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_PATIENT_INFO,
    element: withRouteSuspense(<PatientInfoPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_ROUTINE,
    element: withRouteSuspense(<RoutineSettingPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_FAVORITES,
    element: withRouteSuspense(<FavoritesSettingPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_LEISURE,
    element: withRouteSuspense(<LeisureSettingPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_DEVICE,
    element: withRouteSuspense(<DeviceSettingPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_TTS,
    element: withRouteSuspense(<TtsSettingPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_WORDS,
    element: withRouteSuspense(<WordsSettingPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_EXPRESSIONS,
    element: withRouteSuspense(<ExpressionsPage />),
  },
  {
    path: ROUTE_SEGMENTS.CARE.VOICE,
    element: withRouteSuspense(<VoicePage />),
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
          element: withRouteSuspense(<HomePage />),
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
              <PatientCalibrationRoute />
            </ProtectedRoute>
          ),
          children: [
            {
              path: ROUTE_SEGMENTS.PATIENT.CALIBRATION,
              element: withRouteSuspense(<PatientCalibrationPage />),
            },
            {
              element: withRouteSuspense(<PatientLayout />),
              children: patientAppRoutes,
            },
          ],
        },
        {
          path: ROUTE_SEGMENTS.CARE.ROOT,
          element: (
            <ProtectedRoute allowedRole="guardian">
              {withRouteSuspense(<CareLayout />)}
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
