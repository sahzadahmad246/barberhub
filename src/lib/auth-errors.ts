/**
 * Centralized exports for authentication error handling system
 */

// Error classes and constants
export { AuthError, AUTH_ERRORS, HTTP_STATUS } from './errors';

// API response types
export type {
  ErrorResponse,
  SuccessResponse,
  ApiResponse,
  ValidationError,
  ValidationErrorResponse
} from '@/types/api';

// Middleware and utilities
export {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandling,
  validateMethod,
  validateRequestBody,
  parseRequestBody
} from './api-middleware';

// Validation utilities
export {
  validateEmail,
  validatePassword,
  validateName,
  validateFileUpload,
  validateRequiredFields,
  sanitizeInput
} from './validation';