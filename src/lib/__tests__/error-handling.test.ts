/**
 * Tests for the centralized error handling system
 */

import { AuthError, AUTH_ERRORS, HTTP_STATUS } from '../errors';
import { createErrorResponse, createSuccessResponse } from '../api-middleware';
import { validateEmail, validatePassword, validateName } from '../validation';

describe('AuthError', () => {
  it('should create an AuthError with default values', () => {
    const error = new AuthError('Test error');
    
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('AuthError');
    expect(error.code).toBeUndefined();
    expect(error.field).toBeUndefined();
  });
  
  it('should create an AuthError with custom values', () => {
    const error = new AuthError(
      'Custom error',
      401,
      AUTH_ERRORS.UNAUTHORIZED,
      'email'
    );
    
    expect(error.message).toBe('Custom error');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe(AUTH_ERRORS.UNAUTHORIZED);
    expect(error.field).toBe('email');
  });
});

describe('Error Response Creation', () => {
  it('should create error response from AuthError', () => {
    const authError = new AuthError(
      'Invalid credentials',
      HTTP_STATUS.UNAUTHORIZED,
      AUTH_ERRORS.INVALID_CREDENTIALS
    );
    
    const response = createErrorResponse(authError);
    
    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    // Note: In a real test environment, you'd parse the JSON body
    // This is a simplified test structure
  });
  
  it('should create success response', () => {
    const data = { user: { id: '123', name: 'Test User' } };
    const response = createSuccessResponse(data, 'Success message');
    
    expect(response.status).toBe(HTTP_STATUS.OK);
  });
});

describe('Validation Functions', () => {
  describe('validateEmail', () => {
    it('should pass for valid email', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow();
    });
    
    it('should throw for invalid email', () => {
      expect(() => validateEmail('invalid-email')).toThrow(AuthError);
      expect(() => validateEmail('')).toThrow(AuthError);
    });
  });
  
  describe('validatePassword', () => {
    it('should pass for strong password', () => {
      expect(() => validatePassword('StrongPass123!')).not.toThrow();
    });
    
    it('should throw for weak password', () => {
      expect(() => validatePassword('weak')).toThrow(AuthError);
      expect(() => validatePassword('')).toThrow(AuthError);
    });
  });
  
  describe('validateName', () => {
    it('should pass for valid name', () => {
      expect(() => validateName('John Doe')).not.toThrow();
    });
    
    it('should throw for invalid name', () => {
      expect(() => validateName('')).toThrow(AuthError);
      expect(() => validateName('A')).toThrow(AuthError);
    });
  });
});

describe('AUTH_ERRORS constants', () => {
  it('should have all required error constants', () => {
    expect(AUTH_ERRORS.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
    expect(AUTH_ERRORS.EMAIL_NOT_VERIFIED).toBe('EMAIL_NOT_VERIFIED');
    expect(AUTH_ERRORS.USER_EXISTS).toBe('USER_EXISTS');
    expect(AUTH_ERRORS.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(AUTH_ERRORS.UPLOAD_FAILED).toBe('UPLOAD_FAILED');
  });
});

describe('HTTP_STATUS constants', () => {
  it('should have all required status codes', () => {
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.CREATED).toBe(201);
    expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
  });
});