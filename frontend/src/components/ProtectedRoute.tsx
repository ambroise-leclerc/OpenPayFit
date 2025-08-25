import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();

  if (!token) {
    // If no token exists, redirect the user to the /login page
    return <Navigate to="/login" replace />;
  }

  return children;
}
