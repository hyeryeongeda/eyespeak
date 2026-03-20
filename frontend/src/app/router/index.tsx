import { createBrowserRouter, Navigate } from 'react-router-dom'
import HomePage from '../../pages/HomePage'
import CareHomePage from '../../pages/care/CareHomePage'
import CareSettingsPage from '../../pages/care/CareSettingsPage'
import ChatPage from '../../pages/care/ChatPage'
import RecordsPage from '../../pages/care/RecordsPage'
import VoicePage from '../../pages/care/VoicePage'
import PatientInfoPage from '../../pages/care/settings/PatientInfoPage'
import RoutineSettingPage from '../../pages/care/settings/RoutineSettingPage'
import FavoritesSettingPage from '../../pages/care/settings/FavoritesSettingPage'
import LeisureSettingPage from '../../pages/care/settings/LeisureSettingPage'
import DeviceSettingPage from '../../pages/care/settings/DeviceSettingPage'
import TtsSettingPage from '../../pages/care/settings/TtsSettingPage'
import WordsSettingPage from '../../pages/care/settings/WordsSettingPage'
import ExpressionsPage from '../../pages/care/settings/ExpressionsPage'
import CareLoginPage from '../../pages/auth/CareLoginPage'
import CareSignupPage from '../../pages/auth/CareSignupPage'
import LoginPage from '../../pages/auth/LoginPage'
import PatientLoginPage from '../../pages/auth/PatientLoginPage'
import PatientCalibrationPage from '../../pages/patient/calibration/PatientCalibrationPage'
import TalkMainPage from '../../pages/patient/talk/TalkMainPage'
import PatientMainPage from '../../pages/patient/main/PatientMainPage'
import LeisureMainPage from '../../pages/patient/leisure/LeisureMainPage'
import LeisureCategoryPage from '../../pages/patient/leisure/LeisureCategoryPage'
import LeisurePlayerPage from '../../pages/patient/leisure/LeisurePlayerPage'
import BodyMindPage from '../../pages/patient/body-mind/BodyMindPage'
import BodyMindSecretionPage from '../../pages/patient/body-mind/BodyMindSecretionPage'
import BodyMindBreathingPage from '../../pages/patient/body-mind/BodyMindBreathingPage'
import BodyMindPainAreaPage from '../../pages/patient/body-mind/BodyMindPainAreaPage'
import BodyMindPainPartPage from '../../pages/patient/body-mind/BodyMindPainPartPage'
import BodyMindPainDetailPage from '../../pages/patient/body-mind/BodyMindPainDetailPage'
import BodyMindCategoryListPage from '../../pages/patient/body-mind/BodyMindCategoryListPage'
import BodyMindCategoryDetailPage from '../../pages/patient/body-mind/BodyMindCategoryDetailPage'
import BodyMindPlaceholderPage from '../../pages/patient/body-mind/BodyMindPlaceholderPage'
import FavoritesPage from '../../pages/patient/favorites/FavoritesPage'
import CustomTalkDirectionPage from '../../features/patient/custom-talk/pages/CustomTalkDirectionPage'
import CustomTalkRecommendPage from '../../features/patient/custom-talk/pages/CustomTalkRecommendPage'
import CustomTalkComposePage from '../../features/patient/custom-talk/pages/CustomTalkComposePage'
import CustomTalkGeneratedPage from '../../features/patient/custom-talk/pages/CustomTalkGeneratedPage'
import CustomTalkKeyboardPage from '../../features/patient/custom-talk/pages/CustomTalkKeyboardPage'
import PatientSignupPage from '../../pages/auth/PatientSignupPage'
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage'
import RoleSelectPage from '../../pages/auth/RoleSelectPage'
import SignupPage from '../../pages/auth/SignupPage'
import AppLayout from '../layouts/AppLayout'
import AuthLayout from '../layouts/AuthLayout'
import CareLayout from '../layouts/CareLayout'
import PatientLayout from '../layouts/PatientLayout'
import { PatientCalibrationRoute, ProtectedRoute, PublicOnlyRoute } from './guards'
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
    path: ROUTE_SEGMENTS.PATIENT.CALIBRATION,
    element: <PatientCalibrationPage />,
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
    path: ROUTE_SEGMENTS.PATIENT.BODY_MIND_PAIN_PART,
    element: <BodyMindPainPartPage />,
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
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_LEGACY,
    element: <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK,
    element: <CustomTalkDirectionPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_RECOMMEND,
    element: <CustomTalkRecommendPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_COMPOSE,
    element: <CustomTalkComposePage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_GENERATED,
    element: <CustomTalkGeneratedPage />,
  },
  {
    path: ROUTE_SEGMENTS.PATIENT.CUSTOM_TALK_KEYBOARD,
    element: <CustomTalkKeyboardPage />,
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
  {
    path: ROUTE_SEGMENTS.CARE.CHAT,
    element: <ChatPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.RECORD,
    element: <RecordsPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS,
    element: <CareSettingsPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_PATIENT_INFO,
    element: <PatientInfoPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_ROUTINE,
    element: <RoutineSettingPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_FAVORITES,
    element: <FavoritesSettingPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_LEISURE,
    element: <LeisureSettingPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_DEVICE,
    element: <DeviceSettingPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_TTS,
    element: <TtsSettingPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_WORDS,
    element: <WordsSettingPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.SETTINGS_EXPRESSIONS,
    element: <ExpressionsPage />,
  },
  {
    path: ROUTE_SEGMENTS.CARE.VOICE,
    element: <VoicePage />,
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
            <PatientCalibrationRoute>
              <PatientLayout />
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
])

export default router
