/**
 * Standard error response interface for API routes
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    field?: string; // For validation errors to specify which field failed
    details?: unknown; // Additional error details for debugging
  };
  timestamp: string;
}

/**
 * Standard success response interface for API routes
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Validation error details for form validation
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Extended error response for validation errors
 */
export interface ValidationErrorResponse extends Omit<ErrorResponse, 'error'> {
  success: false;
  error: {
    message: string;
    code: 'VALIDATION_ERROR';
    validationErrors: ValidationError[];
  };
  timestamp: string;
}

/**
 * Form validation state interface
 */
export interface FormValidationState {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
  touched: Record<string, boolean>;
}

/**
 * API request options interface
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * File upload response interface
 */
export interface FileUploadResponse extends SuccessResponse<{
  url: string;
  publicId: string;
  size: number;
  format: string;
}> {
  data: {
    url: string;
    publicId: string;
    size: number;
    format: string;
  };
}