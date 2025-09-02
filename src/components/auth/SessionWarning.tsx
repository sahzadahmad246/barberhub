'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SessionWarningProps {
  isOpen: boolean;
  timeLeft: number; // in milliseconds
  onExtend: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export default function SessionWarning({
  isOpen,
  timeLeft,
  onExtend,
  onLogout,
  onClose
}: SessionWarningProps) {
  const [countdown, setCountdown] = useState(Math.floor(timeLeft / 1000));
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onLogout]);

  useEffect(() => {
    setCountdown(Math.floor(timeLeft / 1000));
  }, [timeLeft]);

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await onExtend();
      onClose();
    } catch (error) {
      console.error('Failed to extend session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription>
            Your session will expire in{' '}
            <span className="font-mono font-semibold text-foreground">
              {formatTime(countdown)}
            </span>
            . Would you like to extend your session?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-2 py-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You will be automatically logged out when the timer reaches zero.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout Now
          </Button>
          <Button
            onClick={handleExtend}
            disabled={isExtending}
            className="w-full sm:w-auto"
          >
            {isExtending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Extending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Extend Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing session warnings
export function useSessionWarning() {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [warningTimeLeft, setWarningTimeLeft] = useState(0);
  const { refreshSession, logout } = useAuth();

  const showWarning = (timeLeft: number) => {
    setWarningTimeLeft(timeLeft);
    setIsWarningOpen(true);
  };

  const hideWarning = () => {
    setIsWarningOpen(false);
    setWarningTimeLeft(0);
  };

  const handleExtendSession = async () => {
    await refreshSession();
    hideWarning();
  };

  const handleLogout = async () => {
    hideWarning();
    await logout('/auth/login?expired=true');
  };

  return {
    isWarningOpen,
    warningTimeLeft,
    showWarning,
    hideWarning,
    handleExtendSession,
    handleLogout,
    SessionWarningComponent: () => (
      <SessionWarning
        isOpen={isWarningOpen}
        timeLeft={warningTimeLeft}
        onExtend={handleExtendSession}
        onLogout={handleLogout}
        onClose={hideWarning}
      />
    )
  };
}