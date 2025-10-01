import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Log guard redirects
  useEffect(() => {
    if (!loading && !user && mounted.current) {
      if (typeof (window as any).__logGuardRedirect === 'function') {
        (window as any).__logGuardRedirect('AuthGuard', '/auth', 'User not authenticated');
      }
    }
  }, [loading, user]);

  if (loading && !mounted.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <div className="w-full max-w-md">
          {showSignUp ? (
            <SignUpForm onToggleMode={() => setShowSignUp(false)} />
          ) : (
            <LoginForm onToggleMode={() => setShowSignUp(true)} />
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}