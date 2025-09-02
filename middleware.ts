import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes and their requirements
const protectedRoutes = {
  // Routes that require authentication only
  auth: [
    '/profile',
    '/dashboard',
    '/settings'
  ],
  // Routes that require authentication and email verification
  verified: [
    '/profile/edit',
    '/bookings',
    '/appointments'
  ],
  // Routes that require staff role (staff, owner, admin)
  staff: [
    '/staff',
    '/staff/dashboard',
    '/staff/appointments',
    '/staff/clients'
  ],
  // Routes that require owner role (owner, admin)
  owner: [
    '/owner',
    '/owner/dashboard',
    '/owner/salon',
    '/owner/staff',
    '/owner/analytics'
  ],
  // Routes that require admin role
  admin: [
    '/admin',
    '/admin/dashboard',
    '/admin/users',
    '/admin/salons',
    '/admin/system'
  ]
};

// Routes that should redirect authenticated users away (like login/register)
const publicOnlyRoutes = [
  '/auth/login',
  '/auth/register'
];

// Helper function to check if a path matches any pattern in an array
function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // Exact match
    if (pathname === pattern) return true;
    // Wildcard match (pattern ends with /*)
    if (pattern.endsWith('/*') && pathname.startsWith(pattern.slice(0, -2))) return true;
    // Nested path match
    if (pathname.startsWith(pattern + '/')) return true;
    return false;
  });
}

// Helper function to get user role from token
function getUserRole(token: unknown): string | null {
  return (token as { role?: string })?.role || null;
}

// Helper function to check if user is verified
function isUserVerified(token: unknown): boolean {
  return (token as { emailVerified?: boolean })?.emailVerified === true;
}

// Helper function to check if user has required role
function hasRequiredRole(userRole: string | null, requiredRoles: string[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: unknown } }) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const isAuthenticated = !!token;
    const userRole = getUserRole(token);
    const isVerified = isUserVerified(token);

    // Handle public-only routes (redirect authenticated users)
    if (matchesPath(pathname, publicOnlyRoutes) && isAuthenticated) {
      const redirectUrl = new URL('/dashboard', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Handle admin routes
    if (matchesPath(pathname, protectedRoutes.admin)) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/auth/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      if (!isVerified) {
        const verifyUrl = new URL('/auth/verify-email', req.url);
        return NextResponse.redirect(verifyUrl);
      }
      
      if (!hasRequiredRole(userRole, ['admin'])) {
        const unauthorizedUrl = new URL('/unauthorized', req.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }

    // Handle owner routes
    if (matchesPath(pathname, protectedRoutes.owner)) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/auth/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      if (!isVerified) {
        const verifyUrl = new URL('/auth/verify-email', req.url);
        return NextResponse.redirect(verifyUrl);
      }
      
      if (!hasRequiredRole(userRole, ['owner', 'admin'])) {
        const unauthorizedUrl = new URL('/unauthorized', req.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }

    // Handle staff routes
    if (matchesPath(pathname, protectedRoutes.staff)) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/auth/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      if (!isVerified) {
        const verifyUrl = new URL('/auth/verify-email', req.url);
        return NextResponse.redirect(verifyUrl);
      }
      
      if (!hasRequiredRole(userRole, ['staff', 'owner', 'admin'])) {
        const unauthorizedUrl = new URL('/unauthorized', req.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }

    // Handle verified routes (require authentication and verification)
    if (matchesPath(pathname, protectedRoutes.verified)) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/auth/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      if (!isVerified) {
        const verifyUrl = new URL('/auth/verify-email', req.url);
        return NextResponse.redirect(verifyUrl);
      }
    }

    // Handle auth-only routes (require authentication only)
    if (matchesPath(pathname, protectedRoutes.auth)) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/auth/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to public routes
        if (!matchesPath(pathname, [
          ...protectedRoutes.auth,
          ...protectedRoutes.verified,
          ...protectedRoutes.staff,
          ...protectedRoutes.owner,
          ...protectedRoutes.admin
        ])) {
          return true;
        }
        
        // For protected routes, require a token
        return !!token;
      },
    },
  }
);

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};