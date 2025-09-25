import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { portalApi } from '../lib/portalApi';

export interface PortalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager';
  employeeId: string;
  scopes: string[];
  twoFactorEnabled: boolean;
}

interface PortalAuthContextType {
  user: PortalUser | null;
  loading: boolean;
  signIn: (email: string, password: string, twoFactorCode?: string) => Promise<{ success: boolean; requiresTwoFactor?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  isManager: boolean;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

interface PortalAuthProviderProps {
  children: ReactNode;
}

export function PortalAuthProvider({ children }: PortalAuthProviderProps) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const response = await portalApi.get('/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshResponse = await portalApi.post('/auth/refresh');
        if (refreshResponse.ok) {
          // Retry getting user info
          const retryResponse = await portalApi.get('/me');
          if (retryResponse.ok) {
            const userData = await retryResponse.json();
            setUser(userData);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth refresh failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, twoFactorCode?: string) => {
    try {
      const response = await portalApi.post('/auth/login', {
        email,
        password,
        twoFactorCode,
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresTwoFactor) {
          return { success: false, requiresTwoFactor: true };
        }
        
        // Refresh user data after successful login
        await refreshAuth();
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const signOut = async () => {
    try {
      await portalApi.post('/auth/logout');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setUser(null);
      // Redirect to sign in page
      window.location.href = '/signin';
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const isManager = user?.role === 'manager';

  const value = {
    user,
    loading,
    signIn,
    signOut,
    refreshAuth,
    isManager,
  };

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (context === undefined) {
    throw new Error('usePortalAuth must be used within a PortalAuthProvider');
  }
  return context;
}