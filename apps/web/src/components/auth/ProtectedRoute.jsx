import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { useAuth } from '../../context/auth-context.js';

const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div role="status">Перевіряємо авторизацію...</div>;
  }

  if (!user) {
    return <Navigate to={routes.login()} replace state={{ from: location }} />;
  }

  const hasRequiredRole =
    allowedRoles.length === 0 || allowedRoles.some((role) => user.roles?.includes(role));

  if (!hasRequiredRole) {
    return <Navigate to={routes.home()} replace />;
  }

  return children ?? <Outlet />;
};

export default ProtectedRoute;
