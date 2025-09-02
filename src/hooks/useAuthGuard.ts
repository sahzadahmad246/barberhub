'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Session } from 'next-auth';

interface UseAuthGuardOptions {
  requireAuth?: boolean;
  requireVerification?: boolean;
  requiredRole?: string;
  requiredRoles?: string[];
  redirectTo?: string;
  onUnauthorized?: () => void;
}

interface UseAuthGuardReturn {
  isAuthorized: boolean;
  isLoading: boolean;
  user: Session['user'] | null;
  checkAuth: () => boolean;
  checkVerification: () => boolean;
  checkRole: (role: string) => boolean;
  checkRoles: (roles: string[]) => boolean;
}

/**
 * Hook for checking authentication and authorization in components
 */
export function useAuthGuard(options: UseAuthGuardOptions = {}): UseAuthGuardReturn {
  const {
    requireAuth = false,
    requireVerification = false,
    requiredRole,
    requiredRoles,
    redirectTo,
    onUnauthorized
  } = options;

  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isVerified, 
    hasRole, 
    hasAnyRole 
  } = useAuth();
  
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check authentication and authorization
  useEffect(() => {
    if (isLoading) return;

    let authorized = true;
    let redirectPath = redirectTo;

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      authorized = false;
      redirectPath = redirectPath || '/auth/login';
    }

    // Check verification requirement
    if (authorized && requireVerification && !isVerified) {
      authorized = false;
      redirectPath = redirectPath || '/auth/verify-email';
    }

    // Check single role requirement
    if (authorized && requiredRole && !hasRole(requiredRole)) {
      authorized = false;
      redirectPath = redirectPath || '/unauthorized';
    }

    // Check multiple roles requirement
    if (authorized && requiredRoles && !hasAnyRole(requiredRoles)) {
      authorized = false;
      redirectPath = redirectPath || '/unauthorized';
    }

    setIsAuthorized(authorized);
    setIsChecking(false);

    // Handle unauthorized access
    if (!authorized) {
      if (onUnauthorized) {
        onUnauthorized();
      } else if (redirectPath) {
        router.push(redirectPath);
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    isVerified,
    requireAuth,
    requireVerification,
    requiredRole,
    requiredRoles,
    hasRole,
    hasAnyRole,
    router,
    redirectTo,
    onUnauthorized
  ]);

  // Utility functions for manual checks
  const checkAuth = (): boolean => {
    return isAuthenticated;
  };

  const checkVerification = (): boolean => {
    return isAuthenticated && isVerified;
  };

  const checkRole = (role: string): boolean => {
    return isAuthenticated && hasRole(role);
  };

  const checkRoles = (roles: string[]): boolean => {
    return isAuthenticated && hasAnyRole(roles);
  };

  return {
    isAuthorized,
    isLoading: isLoading || isChecking,
    user,
    checkAuth,
    checkVerification,
    checkRole,
    checkRoles
  };
}

/**
 * Specific hooks for common use cases
 */

// Hook that requires authentication
export function useRequireAuth(redirectTo?: string) {
  return useAuthGuard({ 
    requireAuth: true, 
    redirectTo: redirectTo || '/auth/login' 
  });
}

// Hook that requires authentication and verification
export function useRequireVerification(redirectTo?: string) {
  return useAuthGuard({ 
    requireAuth: true, 
    requireVerification: true,
    redirectTo: redirectTo || '/auth/verify-email' 
  });
}

// Hook that requires admin role
export function useRequireAdmin(redirectTo?: string) {
  return useAuthGuard({ 
    requireAuth: true, 
    requireVerification: true,
    requiredRole: 'admin',
    redirectTo: redirectTo || '/unauthorized' 
  });
}

// Hook that requires staff role
export function useRequireStaff(redirectTo?: string) {
  return useAuthGuard({ 
    requireAuth: true, 
    requireVerification: true,
    requiredRoles: ['staff', 'owner', 'admin'],
    redirectTo: redirectTo || '/unauthorized' 
  });
}