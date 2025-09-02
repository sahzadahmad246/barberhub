import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth-service';
import { 
  withErrorHandling, 
  createSuccessResponse, 
  validateMethod
} from '@/lib/api-middleware';
import { AuthError, AUTH_ERRORS, HTTP_STATUS } from '@/lib/errors';

/**
 * GET /api/auth/verify-email?token=<verification_token>
 * Verify user email using verification token
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['GET'])(request);
  if (methodError) throw methodError;

  // Extract token from query parameters
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    throw new AuthError(
      'Verification token is required',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.MISSING_TOKEN
    );
  }

  // Verify email using the token
  const result = await AuthService.verifyEmail(token);

  return createSuccessResponse(
    { verified: true },
    result.message,
    HTTP_STATUS.OK
  );
});