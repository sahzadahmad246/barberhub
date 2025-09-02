'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Shield, CheckCircle, XCircle } from 'lucide-react';

function DashboardContent() {
  const { user, isVerified, logout } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome to your protected dashboard</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
            <CardDescription>
              Your account details and authentication status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Name:</span>
                  <span className="text-sm">{user?.name || 'Not provided'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{user?.email || 'Not provided'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Role:</span>
                  <Badge variant="outline">
                    {user?.role || 'user'}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {isVerified ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">Email Verified:</span>
                  <Badge variant={isVerified ? "default" : "destructive"}>
                    {isVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Provider:</span>
                  <Badge variant="secondary">
                    {user?.provider || 'email'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Test</CardTitle>
            <CardDescription>
              This page is protected by the ProtectedRoute component and middleware
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Authentication Successful</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  You have successfully accessed this protected route. Both the middleware and 
                  client-side protection are working correctly.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => logout()}
                  variant="outline"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Routes</CardTitle>
            <CardDescription>
              Based on your current role and verification status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Accessible Routes:</h4>
                <ul className="text-sm space-y-1 text-green-600">
                  <li>✓ /dashboard (current)</li>
                  <li>✓ /profile</li>
                  {isVerified && <li>✓ /profile/edit</li>}
                  {user?.role === 'admin' && <li>✓ /admin/*</li>}
                  {['staff', 'owner', 'admin'].includes(user?.role || '') && <li>✓ /staff/*</li>}
                  {['owner', 'admin'].includes(user?.role || '') && <li>✓ /owner/*</li>}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Restricted Routes:</h4>
                <ul className="text-sm space-y-1 text-red-600">
                  {!isVerified && <li>✗ /profile/edit (requires verification)</li>}
                  {user?.role !== 'admin' && <li>✗ /admin/* (requires admin role)</li>}
                  {!['staff', 'owner', 'admin'].includes(user?.role || '') && <li>✗ /staff/* (requires staff+ role)</li>}
                  {!['owner', 'admin'].includes(user?.role || '') && <li>✗ /owner/* (requires owner+ role)</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}