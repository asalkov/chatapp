import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireNonAdmin?: boolean;
}

function ProtectedRoute({ children, requireAdmin = false, requireNonAdmin = false }: ProtectedRouteProps) {
  const { isLoggedIn, isAdmin } = useAppSelector(state => state.auth);

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/chat" replace />;
  }

  if (requireNonAdmin && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
