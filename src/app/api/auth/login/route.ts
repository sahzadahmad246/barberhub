import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth-service';
import {
  withErrorHandling,
  createSuccessResponse,
  parseRequestBody,
  validateMethod,
  validateRequestBody
} from '@/lib/api-middleware';
import { validateLoginForm, validateAndSanitize } from '@/lib/validation';
import { LoginCredentials } from '@/types/auth';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * POST /api/auth/login
 * Login user with email and password
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Validate request body content type
  const bodyError = validateRequestBody(request);
  if (bodyError) throw bodyError;

  // Parse, validate, and sanitize request body
  const rawBody = await parseRequestBody<{
    email: string;
    password: string;
  }>(request);

  const body = validateAndSanitize(rawBody, validateLoginForm);

  // Prepare login credentials
  const credentials: LoginCredentials = {
    email: body.email.toLowerCase(),
    password: body.password
  };

  // Authenticate user
  const result = await AuthService.login(credentials);

  return createSuccessResponse(
    {
      user: {
        id: result.user?._id,
        name: result.user?.name,
        email: result.user?.email,
        emailVerified: result.user?.emailVerified,
        role: result.user?.role,
        provider: result.user?.provider,
        profilePicture: result.user?.profilePicture,
        createdAt: result.user?.createdAt
      },
      token: result.token
    },
    result.message,
    HTTP_STATUS.OK
  );
});