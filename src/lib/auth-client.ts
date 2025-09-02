import { signIn } from 'next-auth/react';
import type { Session } from 'next-auth';

/**
 * Client-side authentication utilities
 * 
 * Note: Most authentication functionality has been moved to the AuthContext.
 * This file now contains only utility functions that don't require context.
 */

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (callbackUrl?: string) => {
  try {
    const result = await signIn('google', {
      callbackUrl: callbackUrl || '/profile',
      redirect: false
    });
    
    return result;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw new Error('Failed to sign in with Google');
  }
};

/**
 * Check if user is authenticated and verified
 */
export const isUserVerified = (session: Session | null): boolean => {
  return !!((session?.user as { emailVerified?: boolean })?.emailVerified);
};

/**
 * Check if user has specific role
 */
export const hasRole = (session: Session | null, role: string): boolean => {
  return ((session?.user as { role?: string })?.role) === role;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (session: Session | null, roles: string[]): boolean => {
  const userRole = (session?.user as { role?: string })?.role;
  return !!(userRole && roles.includes(userRole));
};

/**
 * Get user's display name
 */
export const getUserDisplayName = (session: Session | null): string => {
  return session?.user?.name || session?.user?.email || 'User';
};

/**
 * Get user's profile picture URL
 */
export const getUserProfilePicture = (session: Session | null): string | null => {
  return session?.user?.image || null;
};

// Re-export from AuthContext for backward compatibility
export { useAuth, signOutUser } from '@/contexts/AuthContext';