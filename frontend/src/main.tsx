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
import PayslipDetailPage from './pages/PayslipDetailPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ExpensesPage from './pages/ExpensesPage';
import ProtectedRoute from './components/ProtectedRoute';
import ReglesListPage from './pages/admin/ReglesListPage';
import SimulateurPage from './pages/admin/SimulateurPage';

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
        path: 'payslips/:id',
        element: (
          <ProtectedRoute>
            <PayslipDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/cotisations/regles',
        element: (
          <ProtectedRoute>
            <ReglesListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/cotisations/simulateur',
        element: (
          <ProtectedRoute>
            <SimulateurPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute>
            <AnalyticsDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'expenses',
        element: (
          <ProtectedRoute>
            <ExpensesPage />
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
