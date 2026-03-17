import { createBrowserRouter } from 'react-router-dom'
import HomePage from '../../pages/HomePage'
import CareHomePage from '../../pages/care/CareHomePage'
import CareLoginPage from '../../pages/auth/CareLoginPage'
import CareSignupPage from '../../pages/auth/CareSignupPage'
import LoginPage from '../../pages/auth/LoginPage'
import PatientLoginPage from '../../pages/auth/PatientLoginPage'
import PatientMainPage from '../../pages/patient/PatientMainPage'
import PatientSignupPage from '../../pages/auth/PatientSignupPage'
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage'
import RoleSelectPage from '../../pages/auth/RoleSelectPage'
import SignupPage from '../../pages/auth/SignupPage'
import AuthLayout from '../layouts/AuthLayout'
import { ProtectedRoute, PublicOnlyRoute } from './guards'
import { ROUTE_PATHS } from './routePaths'

const router = createBrowserRouter([
  {
    path: ROUTE_PATHS.HOME,
    element: <HomePage />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: ROUTE_PATHS.AUTH_ROLE,
        element: (
          <PublicOnlyRoute>
            <RoleSelectPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: ROUTE_PATHS.AUTH_LOGIN,
        element: (
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: ROUTE_PATHS.AUTH_LOGIN_CARE,
        element: (
          <PublicOnlyRoute>
            <CareLoginPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: ROUTE_PATHS.AUTH_LOGIN_PATIENT,
        element: (
          <PublicOnlyRoute>
            <PatientLoginPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: ROUTE_PATHS.AUTH_SIGNUP,
        element: (
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: ROUTE_PATHS.AUTH_SIGNUP_CARE,
        element: (
          <PublicOnlyRoute>
            <CareSignupPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: ROUTE_PATHS.AUTH_SIGNUP_PATIENT,
        element: (
          <PublicOnlyRoute>
            <PatientSignupPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: ROUTE_PATHS.AUTH_RESET_PASSWORD,
        element: (
          <PublicOnlyRoute>
            <ResetPasswordPage />
          </PublicOnlyRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.CARE_HOME,
    element: (
      <ProtectedRoute allowedRole="caregiver">
        <CareHomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTE_PATHS.PATIENT_MAIN,
    element: (
      <ProtectedRoute allowedRole="patient">
        <PatientMainPage />
      </ProtectedRoute>
    ),
  },
])

export default router
