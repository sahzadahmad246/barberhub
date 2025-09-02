'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';

interface AuthContextType {
  // Session data
  session: Session | null;
  user: Session['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Authentication state
  isVerified: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  
  // Actions
  logout: (redirectTo?: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  
  // Route protection
  requireAuth: () => boolean;
  requireVerification: () => boolean;
  requireRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize authentication state
  useEffect(() => {
    if (status !== 'loading') {
      setIsInitialized(true);
    }
  }, [status]);

  // Session refresh handler
  const refreshSession = useCallback(async () => {
    try {
      await update();
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  }, [update]);

  // Logout handler
  const logout = useCallback(async (redirectTo: string = '/') => {
    try {
      await signOut({
        callbackUrl: redirectTo,
        redirect: true
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: redirect manually
      router.push(redirectTo);
    }
  }, [router]);

  // Authentication checks
  const isAuthenticated = !!session?.user;
  const isVerified = !!((session?.user as { emailVerified?: boolean })?.emailVerified);
  
  const hasRole = useCallback((role: string): boolean => {
    return ((session?.user as { role?: string })?.role) === role;
  }, [session]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    const userRole = (session?.user as { role?: string })?.role;
    return !!(userRole && roles.includes(userRole));
  }, [session]);

  // Route protection methods
  const requireAuth = useCallback((): boolean => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return false;
    }
    return true;
  }, [isAuthenticated, router]);

  const requireVerification = useCallback((): boolean => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return false;
    }
    if (!isVerified) {
      router.push('/auth/verify-email');
      return false;
    }
    return true;
  }, [isAuthenticated, isVerified, router]);

  const requireRole = useCallback((role: string): boolean => {
    if (!requireAuth()) return false;
    if (!hasRole(role)) {
      router.push('/unauthorized');
      return false;
    }
    return true;
  }, [requireAuth, hasRole, router]);

  // Auto-logout on session expiration
  useEffect(() => {
    if (isInitialized && !isAuthenticated && status !== 'loading') {
      // Check if we had a session before (stored in localStorage for persistence)
      const hadSession = localStorage.getItem('auth-session-exists');
      if (hadSession) {
        localStorage.removeItem('auth-session-exists');
        console.log('Session expired, redirecting to login');
        router.push('/auth/login?expired=true');
      }
    } else if (isAuthenticated) {
      // Mark that we have an active session
      localStorage.setItem('auth-session-exists', 'true');
    }
  }, [isAuthenticated, isInitialized, status, router]);

  // Session refresh interval (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshSession();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshSession]);

  const contextValue: AuthContextType = {
    session,
    user: session?.user || null,
    isAuthenticated,
    isLoading: status === 'loading' || !isInitialized,
    isVerified,
    hasRole,
    hasAnyRole,
    logout,
    refreshSession,
    requireAuth,
    requireVerification,
    requireRole
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Utility functions for backward compatibility
export const signOutUser = async (callbackUrl?: string) => {
  await signOut({
    callbackUrl: callbackUrl || '/',
    redirect: true
  });
};

export const getUserDisplayName = (session: Session | null): string => {
  return session?.user?.name || session?.user?.email || 'User';
};

export const getUserProfilePicture = (session: Session | null): string | null => {
  return session?.user?.image || null;
};

export const isUserVerified = (session: Session | null): boolean => {
  return !!((session?.user as { emailVerified?: boolean })?.emailVerified);
};