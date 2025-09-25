import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePortalAuth } from './PortalAuthProvider';
import { Loader2 } from 'lucide-react';

interface PortalAuthGuardProps {
  children: ReactNode;
  managerOnly?: boolean;
}

export function PortalAuthGuard({ children, managerOnly = false }: PortalAuthGuardProps) {
  const { user, loading } = usePortalAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bt-muted to-bt-accent">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading Best Theratronics Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (managerOnly && user.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}