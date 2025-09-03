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
 * POST /api/auth/verify-email-otp
 * Verify email using OTP
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Validate request body content type
  const bodyError = validateRequestBody(request);
  if (bodyError) throw bodyError;

  // Parse request body
  const { email, otp } = await parseRequestBody<{ email: string; otp: string }>(request);

  if (!email || !otp) {
    throw new Error('Email and OTP are required');
  }

  // Verify email with OTP
  const result = await AuthService.verifyEmailWithOTP(email, otp);

  return createSuccessResponse(
    result,
    result.message,
    HTTP_STATUS.OK
  );
});
