import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token } = useAuth();

  if (!token) {
    // If no token exists, redirect the user to the /login page
    return <Navigate to="/login" replace />;
  }

  return children;
}
