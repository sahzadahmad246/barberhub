'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  LogOut,
  AlertTriangle
} from 'lucide-react';

export default function TestAuthPage() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isVerified, 
    hasRole, 
    hasAnyRole, 
    logout, 
    refreshSession 
  } = useAuth();

  const { 
    checkAuth, 
    checkVerification, 
    checkRole, 
    checkRoles 
  } = useAuthGuard();

  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const runTests = () => {
    const results = {
      'Authentication Check': checkAuth(),
      'Verification Check': checkVerification(),
      'User Role Check': checkRole('user'),
      'Admin Role Check': checkRole('admin'),
      'Staff Roles Check': checkRoles(['staff', 'owner', 'admin']),
      'Has User Role': hasRole('user'),
      'Has Admin Role': hasRole('admin'),
      'Has Any Staff Role': hasAnyRole(['staff', 'owner', 'admin'])
    };
    
    setTestResults(results);
  };

  const handleRefreshSession = async () => {
    try {
      await refreshSession();
      console.log('Session refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Authentication System Test</h1>
        <p className="text-muted-foreground">
          Test and verify the authentication context and session management
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Authentication Status
            </CardTitle>
            <CardDescription>
              Current authentication state and user information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Loading State:</span>
              <Badge variant={isLoading ? "default" : "outline"}>
                {isLoading ? "Loading" : "Ready"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Authenticated:</span>
              <Badge variant={isAuthenticated ? "default" : "destructive"} className={isAuthenticated ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
                {isAuthenticated ? (
                  <><CheckCircle className="h-3 w-3 mr-1" />Yes</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" />No</>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email Verified:</span>
              <Badge variant="default" className={isVerified ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"}>
                {isVerified ? (
                  <><CheckCircle className="h-3 w-3 mr-1" />Verified</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 mr-1" />Unverified</>
                )}
              </Badge>
            </div>

            {user && (
              <>
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm text-muted-foreground">{user.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Role:</span>
                    <Badge variant="outline" className="text-xs">
                      {((user as { role?: string })?.role) || 'user'}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Authorization Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Authorization Tests
            </CardTitle>
            <CardDescription>
              Test various authorization checks and role-based access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runTests} className="w-full" variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              Run Authorization Tests
            </Button>

            {Object.keys(testResults).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Test Results:</h4>
                {Object.entries(testResults).map(([test, result]) => (
                  <div key={test} className="flex items-center justify-between">
                    <span className="text-sm">{test}:</span>
                    <Badge variant={result ? "default" : "destructive"} className={result ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
                      {result ? (
                        <><CheckCircle className="h-3 w-3 mr-1" />Pass</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" />Fail</>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Session Management
            </CardTitle>
            <CardDescription>
              Test session refresh and logout functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleRefreshSession} 
              className="w-full" 
              variant="outline"
              disabled={!isAuthenticated}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Session
            </Button>

            <Button 
              onClick={handleLogout} 
              className="w-full" 
              variant="destructive"
              disabled={!isAuthenticated}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Test Logout
            </Button>

            <div className="text-xs text-muted-foreground">
              <p>• Session refresh updates authentication state</p>
              <p>• Logout clears session and redirects to login</p>
              <p>• Session warnings appear before expiration</p>
            </div>
          </CardContent>
        </Card>

        {/* Route Protection Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Route Protection
            </CardTitle>
            <CardDescription>
              Information about protected routes and guards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Available Guards:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• <code>ProtectedRoute</code> - Requires authentication</p>
                <p>• <code>VerifiedRoute</code> - Requires email verification</p>
                <p>• <code>AdminRoute</code> - Requires admin role</p>
                <p>• <code>StaffRoute</code> - Requires staff+ role</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">HOC Examples:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• <code>withAuthRequired</code></p>
                <p>• <code>withVerifiedUser</code></p>
                <p>• <code>withAdminRole</code></p>
                <p>• <code>withStaffRole</code></p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Test Pages:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• <code>/profile</code> - Protected route</p>
                <p>• <code>/admin</code> - Admin only</p>
                <p>• <code>/unauthorized</code> - Access denied page</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}