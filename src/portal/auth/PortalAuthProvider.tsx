import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface PortalEmployee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  job_title?: string;
  hire_date: string;
  status: string;
}

export interface PortalProfile {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'employee' | 'manager' | 'org_admin' | 'payroll_admin';
  company_id: string;
  employee?: PortalEmployee;
}

interface PortalAuthContextType {
  user: User | null;
  profile: PortalProfile | null;
  employee: PortalEmployee | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isManager: boolean;
  isAdmin: boolean;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

interface PortalAuthProviderProps {
  children: ReactNode;
}

export function PortalAuthProvider({ children }: PortalAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [employee, setEmployee] = useState<PortalEmployee | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      setEmployee(null);
      return;
    }

    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          employee:employees(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setProfile(profileData as PortalProfile);
      setEmployee(profileData.employee as PortalEmployee);
    } catch (error) {
      console.error('Error in refreshProfile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            refreshProfile();
          }, 0);
        } else {
          setProfile(null);
          setEmployee(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        refreshProfile();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'Network error. Please try again.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setEmployee(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isManager = profile?.role === 'manager' || profile?.role === 'org_admin' || profile?.role === 'payroll_admin';
  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'payroll_admin';

  const value = {
    user,
    profile,
    employee,
    session,
    loading,
    signIn,
    signOut,
    refreshProfile,
    isManager,
    isAdmin,
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