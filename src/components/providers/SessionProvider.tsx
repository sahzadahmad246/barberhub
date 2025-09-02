'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SessionManagerProvider } from './SessionManagerProvider';
import type { Session } from 'next-auth';

interface SessionProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

export default function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session}>
      <AuthProvider>
        <SessionManagerProvider>
          {children}
        </SessionManagerProvider>
      </AuthProvider>
    </NextAuthSessionProvider>
  );
}