// Authentication components and utilities
export { 
  default as AuthGuard, 
  ProtectedRoute, 
  VerifiedRoute, 
  AdminRoute, 
  StaffRoute, 
  OwnerRoute,
  UserRoute,
  AuthOnlyRoute,
  withAuthGuard 
} from './AuthGuard';
export { default as SessionWarning, useSessionWarning } from './SessionWarning';
export { 
  withAuth, 
  withAuthRequired, 
  withVerifiedUser, 
  withAdminRole, 
  withStaffRole, 
  withOwnerRole,
  withUserRole,
  withAuthOnly,
  withVerifiedOnly
} from './withAuth';

// Context and hooks
export { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Hooks
export { useAuthGuard, useRequireAuth, useRequireVerification, useRequireAdmin, useRequireStaff } from '@/hooks/useAuthGuard';

// Session management
export { sessionManager, initializeSessionManager, refreshSession, isSessionValid, getTimeUntilExpiration } from '@/lib/session-manager';