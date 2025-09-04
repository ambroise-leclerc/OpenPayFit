import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PayrollPage from './pages/PayrollPage';
import EmployeePayslipsPage from './pages/EmployeePayslipsPage';
import ProtectedRoute from './components/ProtectedRoute';
import CreateCompanyPage from './pages/CreateCompanyPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'payroll',
        element: (
          <ProtectedRoute>
            <PayrollPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'employees/:employeeId/payslips',
        element: (
          <ProtectedRoute>
            <EmployeePayslipsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'company/new',
        element: (
          <ProtectedRoute>
            <CreateCompanyPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
