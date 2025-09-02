import type { Session } from 'next-auth';

// Define role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  user: 0,
  staff: 1,
  owner: 2,
  admin: 3
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;

// Route protection configuration
export interface RouteProtectionConfig {
  requireAuth?: boolean;
  requireVerification?: boolean;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  minRoleLevel?: UserRole;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

// Route protection result
export interface RouteProtectionResult {
  allowed: boolean;
  reason?: string;
  redirectTo?: string;
  statusCode?: number;
}

/**
 * Check if a user has a specific role
 */
export function hasRole(userRole: string | undefined, requiredRole: UserRole): boolean {
  return userRole === requiredRole;
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(userRole: string | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole as UserRole);
}

/**
 * Check if a user has a minimum role level (hierarchical check)
 */
export function hasMinRoleLevel(userRole: string | undefined, minRole: UserRole): boolean {
  if (!userRole || !(userRole in ROLE_HIERARCHY)) return false;
  
  const userLevel = ROLE_HIERARCHY[userRole as UserRole];
  const minLevel = ROLE_HIERARCHY[minRole];
  
  return userLevel >= minLevel;
}

/**
 * Get user role from session
 */
export function getUserRole(session: Session | null): string | undefined {
  return (session?.user as { role?: string })?.role;
}

/**
 * Check if user is verified
 */
export function isUserVerified(session: Session | null): boolean {
  return !!((session?.user as { emailVerified?: boolean })?.emailVerified);
}

/**
 * Check if user is authenticated
 */
export function isUserAuthenticated(session: Session | null): boolean {
  return !!session?.user;
}

/**
 * Main route protection function
 */
export function checkRouteProtection(
  session: Session | null,
  config: RouteProtectionConfig
): RouteProtectionResult {
  const {
    requireAuth = false,
    requireVerification = false,
    requiredRole,
    requiredRoles,
    minRoleLevel,
    allowedRoles,
    redirectTo
  } = config;

  const isAuthenticated = isUserAuthenticated(session);
  const isVerified = isUserVerified(session);
  const userRole = getUserRole(session);

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return {
      allowed: false,
      reason: 'Authentication required',
      redirectTo: redirectTo || '/auth/login',
      statusCode: 401
    };
  }

  // Check verification requirement
  if (requireVerification && !isVerified) {
    return {
      allowed: false,
      reason: 'Email verification required',
      redirectTo: redirectTo || '/auth/verify-email',
      statusCode: 403
    };
  }

  // Check specific role requirement
  if (requiredRole && !hasRole(userRole, requiredRole)) {
    return {
      allowed: false,
      reason: `Role '${requiredRole}' required`,
      redirectTo: redirectTo || '/unauthorized',
      statusCode: 403
    };
  }

  // Check multiple roles requirement
  if (requiredRoles && !hasAnyRole(userRole, requiredRoles)) {
    return {
      allowed: false,
      reason: `One of roles [${requiredRoles.join(', ')}] required`,
      redirectTo: redirectTo || '/unauthorized',
      statusCode: 403
    };
  }

  // Check minimum role level requirement
  if (minRoleLevel && !hasMinRoleLevel(userRole, minRoleLevel)) {
    return {
      allowed: false,
      reason: `Minimum role level '${minRoleLevel}' required`,
      redirectTo: redirectTo || '/unauthorized',
      statusCode: 403
    };
  }

  // Check allowed roles (whitelist)
  if (allowedRoles && !hasAnyRole(userRole, allowedRoles)) {
    return {
      allowed: false,
      reason: `Role must be one of [${allowedRoles.join(', ')}]`,
      redirectTo: redirectTo || '/unauthorized',
      statusCode: 403
    };
  }

  return {
    allowed: true
  };
}

/**
 * Predefined route protection configurations
 */
export const ROUTE_CONFIGS = {
  // Public routes (no protection)
  public: {},
  
  // Requires authentication only
  authenticated: {
    requireAuth: true
  },
  
  // Requires authentication and verification
  verified: {
    requireAuth: true,
    requireVerification: true
  },
  
  // User-only routes
  user: {
    requireAuth: true,
    requiredRole: 'user' as UserRole
  },
  
  // Staff and above
  staff: {
    requireAuth: true,
    requireVerification: true,
    minRoleLevel: 'staff' as UserRole
  },
  
  // Owner and above
  owner: {
    requireAuth: true,
    requireVerification: true,
    minRoleLevel: 'owner' as UserRole
  },
  
  // Admin only
  admin: {
    requireAuth: true,
    requireVerification: true,
    requiredRole: 'admin' as UserRole
  }
} as const;

/**
 * Helper functions for common checks
 */
export const RouteProtection = {
  isPublic: (session: Session | null) => 
    checkRouteProtection(session, ROUTE_CONFIGS.public),
    
  requiresAuth: (session: Session | null) => 
    checkRouteProtection(session, ROUTE_CONFIGS.authenticated),
    
  requiresVerification: (session: Session | null) => 
    checkRouteProtection(session, ROUTE_CONFIGS.verified),
    
  requiresUser: (session: Session | null) => 
    checkRouteProtection(session, ROUTE_CONFIGS.user),
    
  requiresStaff: (session: Session | null) => 
    checkRouteProtection(session, ROUTE_CONFIGS.staff),
    
  requiresOwner: (session: Session | null) => 
    checkRouteProtection(session, ROUTE_CONFIGS.owner),
    
  requiresAdmin: (session: Session | null) => 
    checkRouteProtection(session, ROUTE_CONFIGS.admin),
    
  custom: (session: Session | null, config: RouteProtectionConfig) => 
    checkRouteProtection(session, config)
};

/**
 * Route protection decorator for API routes
 */
export function withRouteProtection() {
  return function (
   
  ) {
    return async (): Promise<Response> => {
      // This would need to be implemented with actual session retrieval
      // For now, it's a placeholder for the pattern
      throw new Error('withRouteProtection decorator needs session context implementation');
    };
  };
}