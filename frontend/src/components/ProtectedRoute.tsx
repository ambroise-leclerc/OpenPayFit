import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isTokenValid } from '../utils/tokenValidation';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, logout } = useAuth();

  // Vérifier si le token existe et est valide
  if (!token || !isTokenValid(token)) {
    // Si le token est invalide ou expiré, se déconnecter et rediriger
    if (token && !isTokenValid(token)) {
      logout(); // Effacer le token invalide
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
