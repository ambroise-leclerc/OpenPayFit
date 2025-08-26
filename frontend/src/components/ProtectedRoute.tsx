import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isTokenValid } from '../utils/tokenValidation';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, logout } = useAuth();

  // Check if token exists and is valid
  if (!token || !isTokenValid(token)) {
    // If token is invalid or expired, logout and redirect
    if (token && !isTokenValid(token)) {
      logout(); // Clear invalid token
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
