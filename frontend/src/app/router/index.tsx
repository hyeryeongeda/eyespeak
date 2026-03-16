import { createBrowserRouter } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { ROUTE_PATHS } from './routePaths';

import HomePage from '../../pages/HomePage';
import LoginPage from '../../pages/auth/LoginPage';
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage';
import RoleSelectPage from '../../pages/auth/RoleSelectPage';
import SignupPage from '../../pages/auth/SignupPage';

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
        element: <RoleSelectPage />,
      },
      {
        path: ROUTE_PATHS.AUTH_LOGIN,
        element: <LoginPage />,
      },
      {
        path: ROUTE_PATHS.AUTH_SIGNUP,
        element: <SignupPage />,
      },
      {
        path: ROUTE_PATHS.AUTH_RESET_PASSWORD,
        element: <ResetPasswordPage />,
      },
    ],
  },
]);

export default router;