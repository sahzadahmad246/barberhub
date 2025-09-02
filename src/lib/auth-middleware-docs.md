# Authentication Middleware and Route Protection

This document describes the comprehensive authentication middleware and route protection system implemented for the Barber Hub application.

## Overview

The authentication system provides multiple layers of protection:

1. **Next.js Middleware** - Server-side route protection at the edge
2. **Client-side Guards** - React components for protecting pages and components
3. **API Route Protection** - Server-side authentication for API endpoints
4. **Higher-Order Components** - Reusable authentication wrappers

## Components

### 1. Next.js Middleware (`middleware.ts`)

Runs on every request and provides automatic redirects based on authentication status and user roles.

**Protected Route Categories:**
- `auth`: Requires authentication only
- `verified`: Requires authentication and email verification
- `staff`: Requires staff role or higher
- `owner`: Requires owner role or higher
- `admin`: Requires admin role only

**Features:**
- Automatic redirects to login page for unauthenticated users
- Redirects to verification page for unverified users
- Role-based access control with unauthorized page redirect
- Callback URL preservation for post-login redirects

### 2. Client-side Route Guards

#### AuthGuard Component
```tsx
<AuthGuard 
  requireAuth={true}
  requireVerification={true}
  requiredRole="admin"
  requiredRoles={['staff', 'owner', 'admin']}
>
  <ProtectedContent />
</AuthGuard>
```

#### Predefined Guard Components
- `<ProtectedRoute>` - Requires authentication
- `<VerifiedRoute>` - Requires authentication and verification
- `<AdminRoute>` - Requires admin role
- `<StaffRoute>` - Requires staff role or higher
- `<OwnerRoute>` - Requires owner role or higher
- `<UserRoute>` - Requires user role
- `<AuthOnlyRoute>` - Requires authentication only

### 3. Higher-Order Components (HOCs)

#### Basic HOC Usage
```tsx
const ProtectedComponent = withAuth(MyComponent, {
  requireAuth: true,
  requireVerification: true,
  requiredRole: 'admin'
});
```

#### Predefined HOCs
- `withAuthRequired` - Requires authentication
- `withVerifiedUser` - Requires authentication and verification
- `withAdminRole` - Requires admin role
- `withStaffRole` - Requires staff role or higher
- `withOwnerRole` - Requires owner role or higher
- `withUserRole` - Requires user role
- `withAuthOnly` - Requires authentication only
- `withVerifiedOnly` - Requires verification

### 4. Server-side API Protection

#### Using ServerAuth utilities
```typescript
import { ServerAuth } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  // Require authentication
  const { session, user } = await ServerAuth.requireAuth(req);
  
  // Require specific role
  const { session, user } = await ServerAuth.requireAdmin(req);
  
  // Custom requirements
  const { session, user } = await ServerAuth.custom(req, {
    requireAuth: true,
    requireVerification: true,
    requiredRoles: ['staff', 'owner']
  });
}
```

#### Using HOC pattern for API routes
```typescript
import { withAuth, withAdmin } from '@/lib/server-auth';

export const GET = withAuth(async (req, { session, user }) => {
  // Handler with authenticated context
  return Response.json({ user });
});

export const POST = withAdmin(async (req, { session, user }) => {
  // Handler requiring admin role
  return Response.json({ message: 'Admin only' });
});
```

### 5. Authentication Hooks

#### useAuthGuard Hook
```tsx
const { isAuthorized, isLoading, checkRole } = useAuthGuard({
  requireAuth: true,
  requireVerification: true,
  requiredRole: 'admin'
});
```

#### Predefined Hooks
- `useRequireAuth()` - Requires authentication
- `useRequireVerification()` - Requires verification
- `useRequireAdmin()` - Requires admin role
- `useRequireStaff()` - Requires staff role

## Role Hierarchy

The system implements a role hierarchy for permission checking:

```typescript
const ROLE_HIERARCHY = {
  user: 0,      // Basic user
  staff: 1,     // Staff member
  owner: 2,     // Salon owner
  admin: 3      // System administrator
};
```

**Role Permissions:**
- `user`: Basic authenticated user
- `staff`: Can access staff features + user features
- `owner`: Can access owner features + staff features + user features
- `admin`: Can access all features

## Usage Examples

### Page Protection
```tsx
// pages/admin/dashboard.tsx
import { AdminRoute } from '@/components/auth';

export default function AdminDashboard() {
  return (
    <AdminRoute>
      <div>Admin Dashboard Content</div>
    </AdminRoute>
  );
}
```

### Component Protection
```tsx
// components/AdminPanel.tsx
import { withAdminRole } from '@/components/auth';

const AdminPanel = () => {
  return <div>Admin Panel</div>;
};

export default withAdminRole(AdminPanel);
```

### API Route Protection
```typescript
// app/api/admin/users/route.ts
import { withAdmin } from '@/lib/server-auth';

export const GET = withAdmin(async (req, { session, user }) => {
  // Only admins can access this endpoint
  const users = await getAllUsers();
  return Response.json(users);
});
```

### Conditional Rendering
```tsx
import { useAuth } from '@/contexts/AuthContext';

function Navigation() {
  const { hasRole, isVerified } = useAuth();
  
  return (
    <nav>
      <Link href="/">Home</Link>
      {hasRole('staff') && <Link href="/staff">Staff Dashboard</Link>}
      {hasRole('admin') && <Link href="/admin">Admin Panel</Link>}
      {!isVerified && <Link href="/verify-email">Verify Email</Link>}
    </nav>
  );
}
```

## Error Handling

### Automatic Redirects
- **Unauthenticated users** → `/auth/login`
- **Unverified users** → `/auth/verify-email`
- **Insufficient permissions** → `/unauthorized`

### Custom Error Handling
```tsx
const { isAuthorized, isLoading } = useAuthGuard({
  requireAuth: true,
  onUnauthorized: () => {
    // Custom handling
    toast.error('You need to be logged in');
    router.push('/auth/login');
  }
});
```

## Configuration

### Environment Variables
```env
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### Middleware Configuration
The middleware runs on all routes except:
- API routes (`/api/*`)
- Static files (`/_next/static/*`)
- Image optimization (`/_next/image/*`)
- Public assets (`.svg`, `.png`, etc.)

## Best Practices

1. **Use the most specific protection** - Don't use `requireAuth` when you need `requireVerification`
2. **Combine server and client protection** - Use middleware for automatic redirects and guards for UX
3. **Handle loading states** - Always show loading indicators during auth checks
4. **Provide fallbacks** - Use custom fallback components for better UX
5. **Test all permission levels** - Ensure each role can only access appropriate resources

## Troubleshooting

### Common Issues

1. **Infinite redirects** - Check that protected routes don't redirect to themselves
2. **Session not updating** - Call `refreshSession()` after profile changes
3. **Middleware not running** - Verify the `matcher` configuration in `middleware.ts`
4. **Role checks failing** - Ensure roles are properly set in the database and session

### Debug Mode
Set `NODE_ENV=development` to enable debug logging in NextAuth and middleware.