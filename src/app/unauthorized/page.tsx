'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, Home, LogIn } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const [countdown, setCountdown] = useState(10);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleLogout = async () => {
    await logout('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Access Denied
          </CardTitle>
          <CardDescription className="text-gray-600">
            You don&apos;t have permission to access this page
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isAuthenticated ? (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Hi {user?.name || user?.email}, you&apos;re signed in but don&apos;t have the required permissions for this page.
              </p>
              <p className="text-xs text-gray-500">
                If you believe this is an error, please contact your administrator.
              </p>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                You need to be signed in to access this page.
              </p>
              <p className="text-xs text-gray-500">
                Please sign in with an account that has the required permissions.
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-500 mb-4">
              Redirecting to home page in {countdown} seconds...
            </p>
          </div>

          <div className="space-y-2">
            {!isAuthenticated ? (
              <Button 
                onClick={handleLogin} 
                className="w-full"
                variant="default"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            ) : (
              <Button 
                onClick={handleLogout} 
                className="w-full"
                variant="outline"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign Out & Sign In as Different User
              </Button>
            )}
            
            <Button 
              onClick={handleGoHome} 
              className="w-full"
              variant="outline"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Home Page
            </Button>
            
            <Button 
              onClick={handleGoBack} 
              className="w-full"
              variant="ghost"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}