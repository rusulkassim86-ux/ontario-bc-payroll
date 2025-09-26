import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePortalAuth } from './PortalAuthProvider';
import { Loader2 } from 'lucide-react';

interface PortalAuthGuardProps {
  children: ReactNode;
  managerOnly?: boolean;
  adminOnly?: boolean;
}

export function PortalAuthGuard({ children, managerOnly = false, adminOnly = false }: PortalAuthGuardProps) {
  const { user, profile, loading } = usePortalAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading Employee Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal/signin" state={{ from: location }} replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="text-destructive mb-2">Access Denied</div>
          <p className="text-muted-foreground">No employee profile found for this account.</p>
        </div>
      </div>
    );
  }

  if (adminOnly && !['org_admin', 'payroll_admin'].includes(profile.role)) {
    return <Navigate to="/portal" replace />;
  }

  if (managerOnly && !['manager', 'org_admin', 'payroll_admin'].includes(profile.role)) {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
}