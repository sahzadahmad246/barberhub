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
 * POST /api/auth/send-verification-otp
 * Send email verification OTP
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

  // Send verification OTP
  const result = await AuthService.sendEmailVerificationOTP(email);

  return createSuccessResponse(
    result,
    result.message,
    HTTP_STATUS.OK
  );
});
