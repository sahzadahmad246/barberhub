import { NextRequest } from 'next/server';
import { 
  withErrorHandling, 
  createSuccessResponse, 
  validateMethod
} from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * POST /api/auth/logout
 * Logout user and clear session/cookies
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Create response with cleared cookies
  const response = createSuccessResponse(
    { loggedOut: true },
    'Logged out successfully',
    HTTP_STATUS.OK
  );

  // Clear authentication cookies if they exist
  // Note: In a JWT-based system, logout is primarily handled client-side
  // by removing the token from storage. However, we can clear any HTTP-only
  // cookies that might be set for additional security
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expire immediately
    path: '/'
  });

  response.cookies.set('refresh-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expire immediately
    path: '/'
  });

  return response;
});