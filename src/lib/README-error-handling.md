# Centralized Error Handling System

This directory contains the centralized error handling system for the Barber Hub authentication system.

## Components

### 1. Error Classes and Constants (`errors.ts`)
- `AuthError`: Custom error class for authentication-related errors
- `AUTH_ERRORS`: Constants for consistent error codes
- `HTTP_STATUS`: HTTP status code constants

### 2. API Response Types (`../types/api.ts`)
- `ErrorResponse`: Standard error response interface
- `SuccessResponse<T>`: Standard success response interface
- `ValidationErrorResponse`: Extended error response for validation errors

### 3. API Middleware (`api-middleware.ts`)
- `withErrorHandling()`: Wrapper for API route handlers
- `createErrorResponse()`: Creates standardized error responses
- `createSuccessResponse()`: Creates standardized success responses
- `validateMethod()`: Validates HTTP methods
- `parseRequestBody()`: Safely parses JSON request bodies

### 4. Validation Utilities (`validation.ts`)
- `validateEmail()`: Email format validation
- `validatePassword()`: Password strength validation
- `validateName()`: Name validation
- `validateFileUpload()`: File upload validation
- `validateRequiredFields()`: Required field validation
- `sanitizeInput()`: Input sanitization

### 5. Centralized Exports (`auth-errors.ts`)
- Single import point for all error handling utilities

## Usage Examples

### Basic API Route with Error Handling

```typescript
import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  createSuccessResponse,
  AuthError,
  AUTH_ERRORS,
  HTTP_STATUS,
  parseRequestBody,
  validateEmail
} from '@/lib/auth-errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Parse request body safely
  const body = await parseRequestBody<{ email: string }>(request);
  
  // Validate input
  validateEmail(body.email);
  
  // Business logic
  const user = await findUserByEmail(body.email);
  if (!user) {
    throw new AuthError(
      'User not found',
      HTTP_STATUS.NOT_FOUND,
      AUTH_ERRORS.USER_NOT_FOUND
    );
  }
  
  // Return success response
  return createSuccessResponse(
    { user },
    'User found successfully'
  );
});
```

### Custom Error Throwing

```typescript
// Simple error
throw new AuthError('Invalid credentials');

// Error with status code
throw new AuthError('User not found', HTTP_STATUS.NOT_FOUND);

// Error with code and field
throw new AuthError(
  'Email already exists',
  HTTP_STATUS.CONFLICT,
  AUTH_ERRORS.USER_EXISTS,
  'email'
);
```

### Validation

```typescript
import { validateEmail, validatePassword, validateRequiredFields } from '@/lib/auth-errors';

// Validate individual fields
validateEmail('user@example.com');
validatePassword('StrongPass123!');

// Validate required fields
validateRequiredFields(userData, ['name', 'email', 'password']);
```

## Error Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "field": "fieldName"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Codes

Common error codes defined in `AUTH_ERRORS`:
- `INVALID_CREDENTIALS`: Invalid login credentials
- `EMAIL_NOT_VERIFIED`: Email verification required
- `USER_EXISTS`: User already exists
- `USER_NOT_FOUND`: User not found
- `INVALID_TOKEN`: Invalid or expired token
- `VALIDATION_ERROR`: General validation error
- `UPLOAD_FAILED`: File upload failed
- `UNAUTHORIZED`: Unauthorized access
- `FORBIDDEN`: Forbidden access

## Testing

Tests are located in `__tests__/error-handling.test.ts`. Run tests with your preferred testing framework (Jest, Vitest, etc.).

## Requirements Satisfied

This implementation satisfies the following requirements:
- **9.1**: TypeScript without "any" types - All components are fully typed
- **9.2**: Centralized error handling - All errors go through the same system
- **9.4**: Proper error handling for database operations and API routes