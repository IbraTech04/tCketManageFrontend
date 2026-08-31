import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { AUTH_DISABLED } from '../lib/devAuth';
import Spinner from './ui/Spinner';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useApp();
  const location = useLocation();

  // Dev bypass. AppContext already reports authenticated in this mode, so this is
  // belt-and-braces against any path that could still leave isAuthenticated false
  // and strand you on a /signin the standalone app has no endpoint to serve.
  if (AUTH_DISABLED) return children;

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <Spinner size={28} dark />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children;
}
