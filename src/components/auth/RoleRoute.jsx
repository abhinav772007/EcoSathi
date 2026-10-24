import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function RoleRoute({ roles }) {
  const { loading, role } = useAuth();
  if (loading) return <div className="auth-loading">Loading EcoSathi...</div>;
  return roles.includes(role) ? <Outlet /> : <Navigate to="/" replace />;
}
