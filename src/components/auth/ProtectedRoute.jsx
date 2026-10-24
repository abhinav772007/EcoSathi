import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
  const { loading, user } = useAuth();
  if (loading) return <div className="auth-loading">Loading EcoSathi...</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
