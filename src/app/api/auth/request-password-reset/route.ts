import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth-service';
import {
  withErrorHandling,
  createSuccessResponse,
  parseRequestBody,
  validateMethod,
  validateRequestBody
} from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * POST /api/auth/request-password-reset
 * Request password reset by sending OTP to user's email
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Validate request body content type
  const bodyError = validateRequestBody(request);
  if (bodyError) throw bodyError;

  // Parse request body
  const { email } = await parseRequestBody<{ email: string }>(request);

  if (!email) {
    throw new Error('Email is required');
  }

  // Request password reset
  const result = await AuthService.requestPasswordReset(email);

  return createSuccessResponse(
    result,
    result.message,
    HTTP_STATUS.OK
  );
});
