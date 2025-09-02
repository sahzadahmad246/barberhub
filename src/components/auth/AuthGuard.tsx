'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireVerification?: boolean;
  requiredRole?: string;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({
  children,
  requireAuth = false,
  requireVerification = false,
  requiredRole,
  requiredRoles,
  fallback,
}: AuthGuardProps) {
  const { isLoading, hasAnyRole, requireAuth: doRequireAuth, requireVerification: doRequireVerification, requireRole: doRequireRole } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for auth to initialize
      if (isLoading) return;

      // Check authentication requirement
      if (requireAuth && !doRequireAuth()) {
        return;
      }

      // Check verification requirement
      if (requireVerification && !doRequireVerification()) {
        return;
      }

      // Check single role requirement
      if (requiredRole && !doRequireRole(requiredRole)) {
        return;
      }

      // Check multiple roles requirement
      if (requiredRoles && !hasAnyRole(requiredRoles)) {
        return;
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [
    isLoading,
    requireAuth,
    requireVerification,
    requiredRole,
    requiredRoles,
    doRequireAuth,
    doRequireVerification,
    doRequireRole,
    hasAnyRole
  ]);

  // Show loading state
  if (isLoading || isChecking) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}

// Higher-order component for route protection
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<AuthGuardProps, 'children'>
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...guardProps}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

// Specific guard components for common use cases
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth>
      {children}
    </AuthGuard>
  );
}

export function VerifiedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth requireVerification>
      {children}
    </AuthGuard>
  );
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth requireVerification requiredRole="admin">
      {children}
    </AuthGuard>
  );
}

export function StaffRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth requireVerification requiredRoles={['staff', 'owner', 'admin']}>
      {children}
    </AuthGuard>
  );
}

export function OwnerRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth requireVerification requiredRoles={['owner', 'admin']}>
      {children}
    </AuthGuard>
  );
}

export function UserRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth requiredRole="user">
      {children}
    </AuthGuard>
  );
}

export function AuthOnlyRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth>
      {children}
    </AuthGuard>
  );
}