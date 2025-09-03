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
 * POST /api/auth/add-password
 * Allow Google users to add a password for email login
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Validate request body content type
  const bodyError = validateRequestBody(request);
  if (bodyError) throw bodyError;

  // Parse request body
  const { email, password } = await parseRequestBody<{ email: string; password: string }>(request);

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Add password to Google user
  const result = await AuthService.addPasswordToGoogleUser(email, password);

  return createSuccessResponse(
    result,
    result.message,
    HTTP_STATUS.OK
  );
});
