import { NextRequest } from 'next/server';
import { withErrorHandling, createSuccessResponse,  } from '@/lib/api-middleware';
import { AuthService } from '@/lib/auth-service';
import { AuthError } from '@/lib/errors';
import type { GoogleAuthData } from '@/types/auth';

/**
 * POST /api/auth/google
 * Handle Google OAuth authentication
 */
async function handleGoogleAuth(request: NextRequest) {
  const body = await request.json();
  
  // Validate required fields
  const { googleId, name, email, profilePicture } = body;
  
  if (!googleId || !name || !email) {
    throw new AuthError('Missing required Google authentication data', 400, 'MISSING_GOOGLE_DATA');
  }

  // Prepare Google auth data
  const googleData: GoogleAuthData = {
    googleId,
    name,
    email,
    profilePicture,
    provider: 'google'
  };

  // Authenticate with Google data
  const result = await AuthService.googleAuth(googleData);

  return createSuccessResponse(result, 'Google authentication successful');
}

export const POST = withErrorHandling(handleGoogleAuth);