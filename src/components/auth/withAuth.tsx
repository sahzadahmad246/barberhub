'use client';

import { ComponentType } from 'react';
import AuthGuard from './AuthGuard';

interface WithAuthOptions {
  requireAuth?: boolean;
  requireVerification?: boolean;
  requiredRole?: string;
  requiredRoles?: string[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * Higher-order component that wraps a component with authentication protection
 */
export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    requireAuth = true,
    requireVerification = false,
    requiredRole,
    requiredRoles,
    redirectTo,
    fallback
  } = options;

  const WithAuthComponent = (props: P) => {
    return (
      <AuthGuard
        requireAuth={requireAuth}
        requireVerification={requireVerification}
        requiredRole={requiredRole}
        requiredRoles={requiredRoles}
        redirectTo={redirectTo}
        fallback={fallback}
      >
        <WrappedComponent {...props} />
      </AuthGuard>
    );
  };

  WithAuthComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithAuthComponent;
}

/**
 * Specific HOCs for common use cases
 */

// Requires authentication
export const withAuthRequired = <P extends object>(Component: ComponentType<P>) =>
  withAuth(Component, { requireAuth: true });

// Requires authentication and email verification
export const withVerifiedUser = <P extends object>(Component: ComponentType<P>) =>
  withAuth(Component, { requireAuth: true, requireVerification: true });

// Requires admin role
export const withAdminRole = <P extends object>(Component: ComponentType<P>) =>
  withAuth(Component, { 
    requireAuth: true, 
    requireVerification: true, 
    requiredRole: 'admin' 
  });

// Requires staff role (staff, owner, or admin)
export const withStaffRole = <P extends object>(Component: ComponentType<P>) =>
  withAuth(Component, { 
    requireAuth: true, 
    requireVerification: true, 
    requiredRoles: ['staff', 'owner', 'admin'] 
  });

// Requires owner role (owner or admin)
export const withOwnerRole = <P extends object>(Component: ComponentType<P>) =>
  withAuth(Component, { 
    requireAuth: true, 
    requireVerification: true, 
    requiredRoles: ['owner', 'admin'] 
  });

// Requires user role (any authenticated user)
export const withUserRole = <P extends object>(Component: ComponentType<P>) =>
  withAuth(Component, { 
    requireAuth: true, 
    requiredRole: 'user' 
  });

// Requires authentication but allows unverified users
export const withAuthOnly = <P extends object>(Component: ComponentType<P>) =>
  withAuth(Component, { 
    requireAuth: true, 
    requireVerification: false 
  });

// Requires authentication and verification (any verified user)
export const withVerifiedOnly = <P extends object>(Component: ComponentType<P>) =>
  withAuth(Component, { 
    requireAuth: true, 
    requireVerification: true 
  });