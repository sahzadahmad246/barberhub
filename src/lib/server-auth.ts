import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { AuthError, HTTP_STATUS } from './errors';
import { checkRouteProtection, RouteProtectionConfig, type UserRole } from './route-protection';
import type { Session } from 'next-auth';

/**
 * Get session from NextAuth JWT token in API routes
 */
export async function getServerSession(req: NextRequest): Promise<Session | null> {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) return null;
    
    // Convert JWT token to session format
    return {
      user: {
        id: token.sub || '',
        email: token.email || '',
        name: token.name || '',
        image: token.picture || null,
        role: (token as unknown as { role?: string }).role || 'user',
        emailVerified: (token as unknown as { emailVerified?: boolean }).emailVerified || false,
        provider: (token as unknown as { provider?: string }).provider || 'email',
        salonId: (token as unknown as { salonId?: string | null }).salonId || null
      },
      expires: new Date(Number((token as unknown as { exp?: number }).exp ?? Math.floor(Date.now() / 1000)) * 1000).toISOString()
    } as Session;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

/**
 * Server-side route protection for API routes
 */
export async function protectRoute(
  req: NextRequest,
  config: RouteProtectionConfig
): Promise<{ session: Session; user: Session['user'] }> {
  const session = await getServerSession(req);
  const protection = checkRouteProtection(session, config);
  
  if (!protection.allowed) {
    const statusCode = protection.statusCode || HTTP_STATUS.UNAUTHORIZED;
    const message = protection.reason || 'Access denied';
    
    throw new AuthError(message, statusCode, getErrorCode(statusCode));
  }
  
  return {
    session: session!,
    user: session!.user
  };
}

/**
 * Get appropriate error code based on status
 */
function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case HTTP_STATUS.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HTTP_STATUS.FORBIDDEN:
      return 'FORBIDDEN';
    default:
      return 'ACCESS_DENIED';
  }
}

/**
 * Predefined protection functions for common use cases
 */
export const ServerAuth = {
  /**
   * Require authentication only
   */
  requireAuth: async (req: NextRequest) => {
    return protectRoute(req, { requireAuth: true });
  },
  
  /**
   * Require authentication and email verification
   */
  requireVerified: async (req: NextRequest) => {
    return protectRoute(req, { 
      requireAuth: true, 
      requireVerification: true 
    });
  },
  
  /**
   * Require specific role
   */
  requireRole: async (req: NextRequest, role: UserRole) => {
    return protectRoute(req, { 
      requireAuth: true, 
      requireVerification: true,
      requiredRole: role 
    });
  },
  
  /**
   * Require any of the specified roles
   */
  requireAnyRole: async (req: NextRequest, roles: UserRole[]) => {
    return protectRoute(req, { 
      requireAuth: true, 
      requireVerification: true,
      requiredRoles: roles 
    });
  },
  
  /**
   * Require minimum role level
   */
  requireMinRole: async (req: NextRequest, minRole: UserRole) => {
    return protectRoute(req, { 
      requireAuth: true, 
      requireVerification: true,
      minRoleLevel: minRole 
    });
  },
  
  /**
   * Require admin role
   */
  requireAdmin: async (req: NextRequest) => {
    return protectRoute(req, { 
      requireAuth: true, 
      requireVerification: true,
      requiredRole: 'admin' 
    });
  },
  
  /**
   * Require owner role or higher
   */
  requireOwner: async (req: NextRequest) => {
    return protectRoute(req, { 
      requireAuth: true, 
      requireVerification: true,
      minRoleLevel: 'owner' 
    });
  },
  
  /**
   * Require staff role or higher
   */
  requireStaff: async (req: NextRequest) => {
    return protectRoute(req, { 
      requireAuth: true, 
      requireVerification: true,
      minRoleLevel: 'staff' 
    });
  },
  
  /**
   * Custom protection
   */
  custom: async (req: NextRequest, config: RouteProtectionConfig) => {
    return protectRoute(req, config);
  }
};

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withServerAuth(config: RouteProtectionConfig) {
  return function <T extends unknown[]>(
    handler: (req: NextRequest, context: { session: Session; user: Session['user'] }, ...args: T) => Promise<Response>
  ) {
    return async (req: NextRequest, ...args: T): Promise<Response> => {
      try {
        const authContext = await protectRoute(req, config);
        return await handler(req, authContext, ...args);
      } catch (error) {
        if (error instanceof AuthError) {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                message: error.message,
                code: error.code
              }
            }),
            {
              status: error.statusCode,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: 'Internal server error'
            }
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    };
  };
}

/**
 * Convenience wrappers for common protection patterns
 */
export const withAuth = (handler: (ctx: unknown) => Promise<Response>) => 
  withServerAuth({ requireAuth: true })(handler);

export const withVerified = (handler: (ctx: unknown) => Promise<Response>) => 
  withServerAuth({ requireAuth: true, requireVerification: true })(handler);

export const withAdmin = (handler: (ctx: unknown) => Promise<Response>) => 
  withServerAuth({ requireAuth: true, requireVerification: true, requiredRole: 'admin' })(handler);

export const withOwner = (handler: (ctx: unknown) => Promise<Response>) => 
  withServerAuth({ requireAuth: true, requireVerification: true, minRoleLevel: 'owner' })(handler);

export const withStaff = (handler: (ctx: unknown) => Promise<Response>) => 
  withServerAuth({ requireAuth: true, requireVerification: true, minRoleLevel: 'staff' })(handler);