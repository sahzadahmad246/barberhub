import { NextRequest, NextResponse } from 'next/server';
import { AuthError, HTTP_STATUS } from './errors';
import { ErrorResponse, SuccessResponse } from '@/types/api';

// Define validation error interface
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    validationErrors: ValidationError[];
  };
  timestamp: string;
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code?: string,
  field?: string
): NextResponse<ErrorResponse> {
  const timestamp = new Date().toISOString();

  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        field
      },
      timestamp
    },
    { status: statusCode }
  );
}

/**
 * Creates a standardized error response from Error objects
 */
export function createErrorResponseFromError(
  error: Error | AuthError,
  statusCode?: number
): NextResponse<ErrorResponse | ValidationErrorResponse> {
  const timestamp = new Date().toISOString();

  if (error instanceof AuthError) {
    // Check if this is a validation error with multiple field errors
    const validationErrors = (error as AuthError & { validationErrors?: ValidationError[] }).validationErrors;
    
    if (validationErrors && Array.isArray(validationErrors)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: 'VALIDATION_ERROR',
            validationErrors
          },
          timestamp
        } as ValidationErrorResponse,
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          field: error.field
        },
        timestamp
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      timestamp
    },
    { status: statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR }
  );
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = HTTP_STATUS.OK
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  );
}

/**
 * Error handling middleware wrapper for API routes
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);

      // Handle different types of errors
      if (error instanceof AuthError) {
        return createErrorResponseFromError(error);
      }

      if (error instanceof Error) {
        // Handle MongoDB/Mongoose errors
        if (error.name === 'ValidationError') {
          const mongooseError = error as Error & { errors?: Record<string, { message: string }> };
          const validationErrors = Object.keys(mongooseError.errors || {}).map(field => ({
            field,
            message: mongooseError.errors![field].message,
            code: 'VALIDATION_ERROR'
          }));
          
          if (validationErrors.length > 0) {
            const authError = new AuthError(
              'Validation failed',
              HTTP_STATUS.BAD_REQUEST,
              'VALIDATION_ERROR'
            );
            (authError as AuthError & { validationErrors: ValidationError[] }).validationErrors = validationErrors;
            return createErrorResponseFromError(authError);
          }
          
          return createErrorResponse(
            'Validation failed',
            HTTP_STATUS.BAD_REQUEST,
            'VALIDATION_ERROR'
          );
        }

        if (error.name === 'MongoServerError' && 'code' in error && (error as { code: number }).code === 11000) {
          // Extract field name from duplicate key error
          const duplicateError = error as Error & { keyPattern?: Record<string, number> };
          const field = duplicateError.keyPattern ? Object.keys(duplicateError.keyPattern)[0] : 'field';
          const friendlyMessage = field === 'email' 
            ? 'An account with this email address already exists'
            : `This ${field} is already taken`;
            
          return createErrorResponse(
            friendlyMessage,
            HTTP_STATUS.CONFLICT,
            'DUPLICATE_RESOURCE',
            field
          );
        }

        // Handle CastError (invalid ObjectId)
        if (error.name === 'CastError') {
          return createErrorResponse(
            'Invalid ID format',
            HTTP_STATUS.BAD_REQUEST,
            'INVALID_ID'
          );
        }

        // Handle other known errors
        return createErrorResponseFromError(error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }

      // Fallback for unknown errors
      return createErrorResponse(
        'An unexpected error occurred',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'INTERNAL_SERVER_ERROR'
      );
    }
  };
}

/**
 * Middleware to validate request methods
 */
export function validateMethod(allowedMethods: string[]) {
  return (request: NextRequest): AuthError | null => {
    if (!allowedMethods.includes(request.method)) {
      return new AuthError(
        `Method ${request.method} not allowed`,
        405, // HTTP 405 Method Not Allowed
        'METHOD_NOT_ALLOWED'
      );
    }
    return null;
  };
}

/**
 * Middleware to validate request body exists
 */
export function validateRequestBody(request: NextRequest): AuthError | null {
  const contentType = request.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
    return new AuthError(
      'Content-Type must be application/json',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_CONTENT_TYPE'
    );
  }

  return null;
}

/**
 * Utility to parse and validate JSON request body
 */
export async function parseRequestBody<T = unknown>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    
    // Check if body is empty
    if (body === null || body === undefined) {
      throw new AuthError(
        'Request body cannot be empty',
        HTTP_STATUS.BAD_REQUEST,
        'EMPTY_BODY'
      );
    }
    
    return body as T;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    
    throw new AuthError(
      'Invalid JSON in request body',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_JSON'
    );
  }
}

/**
 * Middleware to validate request size
 */
export function validateRequestSize(maxSizeInMB: number = 10) {
  return (request: NextRequest): AuthError | null => {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      
      if (sizeInBytes > maxSizeInBytes) {
        return new AuthError(
          `Request size cannot exceed ${maxSizeInMB}MB`,
          HTTP_STATUS.BAD_REQUEST,
          'REQUEST_TOO_LARGE'
        );
      }
    }
    
    return null;
  };
}

/**
 * Middleware to validate required headers
 */
export function validateRequiredHeaders(requiredHeaders: string[]) {
  return (request: NextRequest): AuthError | null => {
    const missingHeaders: string[] = [];
    
    for (const header of requiredHeaders) {
      if (!request.headers.get(header)) {
        missingHeaders.push(header);
      }
    }
    
    if (missingHeaders.length > 0) {
      return new AuthError(
        `Missing required headers: ${missingHeaders.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST,
        'MISSING_HEADERS'
      );
    }
    
    return null;
  };
}

/**
 * Middleware to validate authentication token
 * Note: For NextAuth.js integration, use ServerAuth utilities instead
 */
export function validateAuthToken() {
  return (request: NextRequest): AuthError | null => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return new AuthError(
        'Authorization header is required',
        HTTP_STATUS.UNAUTHORIZED,
        'MISSING_AUTH_HEADER'
      );
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return new AuthError(
        'Authorization header must start with "Bearer "',
        HTTP_STATUS.UNAUTHORIZED,
        'INVALID_AUTH_FORMAT'
      );
    }
    
    const token = authHeader.substring(7);
    if (!token || token.trim().length === 0) {
      return new AuthError(
        'Authorization token is required',
        HTTP_STATUS.UNAUTHORIZED,
        'MISSING_TOKEN'
      );
    }
    
    return null;
  };
}

/**
 * Legacy authentication validation - use ServerAuth utilities for NextAuth.js integration
 * @deprecated Use ServerAuth.requireAuth() or withAuth() instead
 */
export function validateAuthTokenLegacy() {
  return validateAuthToken();
}

/**
 * Comprehensive request validation middleware
 */
export function validateRequest(options: {
  methods?: string[];
  requireAuth?: boolean;
  requireJson?: boolean;
  maxSizeInMB?: number;
  requiredHeaders?: string[];
}) {
  return (request: NextRequest): AuthError | null => {
    const {
      methods = [],
      requireAuth = false,
      requireJson = false,
      maxSizeInMB = 10,
      requiredHeaders = []
    } = options;
    
    // Validate method
    if (methods.length > 0) {
      const methodError = validateMethod(methods)(request);
      if (methodError) return methodError;
    }
    
    // Validate request size
    const sizeError = validateRequestSize(maxSizeInMB)(request);
    if (sizeError) return sizeError;
    
    // Validate required headers
    if (requiredHeaders.length > 0) {
      const headersError = validateRequiredHeaders(requiredHeaders)(request);
      if (headersError) return headersError;
    }
    
    // Validate JSON content type
    if (requireJson) {
      const jsonError = validateRequestBody(request);
      if (jsonError) return jsonError;
    }
    
    // Validate authentication
    if (requireAuth) {
      const authError = validateAuthToken()(request);
      if (authError) return authError;
    }
    
    return null;
  };
}