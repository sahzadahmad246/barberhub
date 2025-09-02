'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionWarning } from '@/components/auth/SessionWarning';
import { initializeSessionManager } from '@/lib/session-manager';

interface SessionManagerProviderProps {
  children: React.ReactNode;
}

export function SessionManagerProvider({ children }: SessionManagerProviderProps) {
  const { isAuthenticated, logout } = useAuth();
  const { showWarning, SessionWarningComponent } = useSessionWarning();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialize session manager when user is authenticated
    const handleSessionExpired = () => {
      console.log('Session expired, logging out...');
      logout('/auth/login?expired=true');
    };

    const handleSessionWarning = (timeLeft: number) => {
      console.log('Session warning:', timeLeft);
      showWarning(timeLeft);
    };

    // Initialize session manager
    initializeSessionManager(handleSessionExpired, handleSessionWarning);

    // Cleanup is handled by the session manager internally
  }, [isAuthenticated, logout, showWarning]);

  return (
    <>
      {children}
      <SessionWarningComponent />
    </>
  );
}