/**
 * Example usage of the centralized error handling system
 * This file demonstrates how to use the error handling middleware in API routes
 * 
 * NOTE: This is an example file and should be removed once actual API routes are implemented
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  createSuccessResponse,
  AuthError,
  AUTH_ERRORS,
  HTTP_STATUS,
  validateEmail,
  validatePassword,
  parseRequestBody,
  validateRequiredFields
} from './auth-errors';

// Example: Registration API route handler
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Parse and validate request body
  const body = await parseRequestBody<{
    name: string;
    email: string;
    password: string;
  }>(request);
  
  // Validate required fields
  validateRequiredFields(body, ['name', 'email', 'password']);
  
  // Validate individual fields
  validateEmail(body.email);
  validatePassword(body.password);
  
  // Check if user already exists (example)
  const existingUser = null; // This would be a database query
  if (existingUser) {
    throw new AuthError(
      'User with this email already exists',
      HTTP_STATUS.CONFLICT,
      AUTH_ERRORS.USER_EXISTS,
      'email'
    );
  }
  
  // Create user (example)
  const newUser = {
    id: '123',
    name: body.name,
    email: body.email,
    emailVerified: false
  };
  
  // Return success response
  return createSuccessResponse(
    { user: newUser },
    'User registered successfully. Please check your email for verification.',
    HTTP_STATUS.CREATED
  );
});

// Example: Login API route handler
export const loginHandler = withErrorHandling(async (request: NextRequest) => {
  const body = await parseRequestBody<{
    email: string;
    password: string;
  }>(request);
  
  validateRequiredFields(body, ['email', 'password']);
  validateEmail(body.email);
  
  // Authenticate user (example)
  const user = null; // This would be a database query
  if (!user) {
    throw new AuthError(
      'Invalid email or password',
      HTTP_STATUS.UNAUTHORIZED,
      AUTH_ERRORS.INVALID_CREDENTIALS
    );
  }
  
  // Check if email is verified
  const isEmailVerified = false; // This would come from the user object
  if (!isEmailVerified) {
    throw new AuthError(
      'Please verify your email before logging in',
      HTTP_STATUS.UNAUTHORIZED,
      AUTH_ERRORS.EMAIL_NOT_VERIFIED
    );
  }
  
  return createSuccessResponse(
    { user, token: 'jwt-token-here' },
    'Login successful'
  );
});

// Example: Protected route handler
export const protectedHandler = withErrorHandling(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError(
      'Authorization token required',
      HTTP_STATUS.UNAUTHORIZED,
      AUTH_ERRORS.TOKEN_REQUIRED
    );
  }
  
  
  
  // Validate token (example)
  const isValidToken = false; // This would be JWT validation
  if (!isValidToken) {
    throw new AuthError(
      'Invalid or expired token',
      HTTP_STATUS.UNAUTHORIZED,
      AUTH_ERRORS.INVALID_TOKEN
    );
  }
  
  return createSuccessResponse(
    { message: 'Access granted to protected resource' }
  );
});