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
 * POST /api/auth/reset-password
 * Reset password using OTP verification
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Validate request body content type
  const bodyError = validateRequestBody(request);
  if (bodyError) throw bodyError;

  // Parse request body
  const { email, otp, newPassword } = await parseRequestBody<{
    email: string;
    otp: string;
    newPassword: string;
  }>(request);

  if (!email || !otp || !newPassword) {
    throw new Error('Email, OTP, and new password are required');
  }

  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Reset password with OTP
  const result = await AuthService.resetPasswordWithOTP(email, otp, newPassword);

  return createSuccessResponse(
    result,
    result.message,
    HTTP_STATUS.OK
  );
});
