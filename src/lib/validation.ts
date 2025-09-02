import { AuthError, AUTH_ERRORS, HTTP_STATUS } from './errors';
import { ValidationError } from '@/types/api';

/**
 * Email validation regex pattern - more comprehensive
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Password validation requirements
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
// const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

/**
 * Name validation requirements
 */
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

/**
 * Validates email format with comprehensive checks
 */
export function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new AuthError(
      'Email address is required',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'email'
    );
  }
  
  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length === 0) {
    throw new AuthError(
      'Email address cannot be empty',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'email'
    );
  }
  
  if (trimmedEmail.length > 254) {
    throw new AuthError(
      'Email address is too long (maximum 254 characters)',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.INVALID_EMAIL,
      'email'
    );
  }
  
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    throw new AuthError(
      'Please enter a valid email address (e.g., user@example.com)',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.INVALID_EMAIL,
      'email'
    );
  }
  
  // Check for common typos
  const commonDomainTypos = [
    { typo: 'gmail.co', correct: 'gmail.com' },
    { typo: 'yahoo.co', correct: 'yahoo.com' },
    { typo: 'hotmail.co', correct: 'hotmail.com' },
    { typo: 'outlook.co', correct: 'outlook.com' }
  ];
  
  const lower = trimmedEmail.toLowerCase();
  const atIndex = lower.lastIndexOf('@');
  const domain = atIndex === -1 ? '' : lower.slice(atIndex + 1);
  for (const { typo, correct } of commonDomainTypos) {
    if (domain === typo) {
      throw new AuthError(
        `Did you mean ${lower.replace(typo, correct)}?`,
        HTTP_STATUS.BAD_REQUEST,
        AUTH_ERRORS.INVALID_EMAIL,
        'email'
      );
    }
  }
}

/**
 * Validates password strength with detailed feedback
 */
export function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new AuthError(
      'Password is required',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'password'
    );
  }
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AuthError(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.WEAK_PASSWORD,
      'password'
    );
  }
  
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new AuthError(
      `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`,
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.WEAK_PASSWORD,
      'password'
    );
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    throw new AuthError(
      'This password is too common. Please choose a more secure password',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.WEAK_PASSWORD,
      'password'
    );
  }
  
  // Detailed strength validation
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  const missingRequirements = [];
  if (!hasLowercase) missingRequirements.push('one lowercase letter');
  if (!hasUppercase) missingRequirements.push('one uppercase letter');
  if (!hasNumbers) missingRequirements.push('one number');
  if (!hasSpecialChar) missingRequirements.push('one special character (@$!%*?&)');
  
  if (missingRequirements.length > 0) {
    throw new AuthError(
      `Password must contain ${missingRequirements.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.WEAK_PASSWORD,
      'password'
    );
  }
  
  // Check for sequential characters
  if (/123|abc|qwe/i.test(password)) {
    throw new AuthError(
      'Password should not contain sequential characters (e.g., 123, abc)',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.WEAK_PASSWORD,
      'password'
    );
  }
}

/**
 * Validates user name with comprehensive checks
 */
export function validateName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new AuthError(
      'Name is required',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'name'
    );
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    throw new AuthError(
      'Name cannot be empty',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'name'
    );
  }
  
  if (trimmedName.length < NAME_MIN_LENGTH) {
    throw new AuthError(
      `Name must be at least ${NAME_MIN_LENGTH} characters long`,
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'name'
    );
  }
  
  if (trimmedName.length > NAME_MAX_LENGTH) {
    throw new AuthError(
      `Name cannot exceed ${NAME_MAX_LENGTH} characters`,
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'name'
    );
  }
  
  if (!NAME_REGEX.test(trimmedName)) {
    throw new AuthError(
      'Name can only contain letters, spaces, hyphens, and apostrophes',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'name'
    );
  }
  
  // Check for suspicious patterns
  if (/^\s+|\s+$/.test(name)) {
    throw new AuthError(
      'Name cannot start or end with spaces',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'name'
    );
  }
  
  if (/\s{2,}/.test(trimmedName)) {
    throw new AuthError(
      'Name cannot contain multiple consecutive spaces',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'name'
    );
  }
}

/**
 * Validates file upload
 */
export function validateFileUpload(file: File, maxSizeInMB: number = 5): void {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!allowedTypes.includes(file.type)) {
    throw new AuthError(
      'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.INVALID_FILE_TYPE
    );
  }
  
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    throw new AuthError(
      `File size cannot exceed ${maxSizeInMB}MB`,
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.FILE_TOO_LARGE
    );
  }
}

/**
 * Validates required fields in an object
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missingFields.push(String(field));
    }
  }
  
  if (missingFields.length > 0) {
    throw new AuthError(
      `Missing required fields: ${missingFields.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR
    );
  }
}

/**
 * Validates password confirmation matches
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): void {
  if (!confirmPassword || typeof confirmPassword !== 'string') {
    throw new AuthError(
      'Password confirmation is required',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'confirmPassword'
    );
  }
  
  if (password !== confirmPassword) {
    throw new AuthError(
      'Passwords do not match',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR,
      'confirmPassword'
    );
  }
}

/**
 * Validates multiple fields and returns all validation errors
 */
export function validateMultipleFields(validations: Array<() => void>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const validation of validations) {
    try {
      validation();
    } catch (error) {
      if (error instanceof AuthError && error.field) {
        errors.push({
          field: error.field,
          message: error.message,
          code: error.code
        });
      }
    }
  }
  
  return errors;
}

/**
 * Throws a validation error response with multiple field errors
 */
export function throwValidationErrors(errors: ValidationError[]): never {
  if (errors.length === 0) {
    throw new AuthError(
      'Validation error invoked without errors',
      HTTP_STATUS.BAD_REQUEST,
      AUTH_ERRORS.VALIDATION_ERROR
    );
  }
  
  const error = new AuthError(
    `Validation failed for ${errors.length} field(s)`,
    HTTP_STATUS.BAD_REQUEST,
    AUTH_ERRORS.VALIDATION_ERROR
  );
  
  // Attach validation errors for middleware to handle
  (error as AuthError & { validationErrors: ValidationError[] }).validationErrors = errors;
  throw error;
}

/**
 * Comprehensive form validation for registration
 */
export function validateRegistrationForm(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}): void {
  const validationErrors = validateMultipleFields([
    () => validateName(data.name),
    () => validateEmail(data.email),
    () => validatePassword(data.password),
    ...(typeof data.confirmPassword === 'string' && data.confirmPassword.length > 0
      ? [() => validatePasswordConfirmation(data.password, data.confirmPassword as string)]
      : [])
  ]);
  
  if (validationErrors.length > 0) {
    throwValidationErrors(validationErrors);
  }
}

/**
 * Comprehensive form validation for login
 */
export function validateLoginForm(data: {
  email: string;
  password: string;
}): void {
  const validationErrors = validateMultipleFields([
    () => validateEmail(data.email),
    () => {
      if (!data.password || typeof data.password !== 'string') {
        throw new AuthError(
          'Password is required',
          HTTP_STATUS.BAD_REQUEST,
          AUTH_ERRORS.VALIDATION_ERROR,
          'password'
        );
      }
    }
  ]);
  
  if (validationErrors.length > 0) {
    throwValidationErrors(validationErrors);
  }
}

/**
 * Comprehensive form validation for profile updates
 */
export function validateProfileUpdateForm(data: {
  name?: string;
  email?: string;
}): void {
  const validationErrors = validateMultipleFields([
    ...(typeof data.name === 'string' ? [() => validateName(data.name as string)] : []),
    ...(typeof data.email === 'string' ? [() => validateEmail(data.email as string)] : [])
  ]);
  
  if (validationErrors.length > 0) {
    throwValidationErrors(validationErrors);
  }
}

/**
 * Sanitizes user input by trimming whitespace and removing potentially harmful content
 */
export function sanitizeInput<T extends Record<string, unknown>>(data: T): T {
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      let value = (sanitized[key] as string).trim();
      
      // Remove null bytes and control characters (except newlines and tabs)
      value = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Normalize whitespace
      value = value.replace(/\s+/g, ' ');
      
      sanitized[key] = value as T[Extract<keyof T, string>];
    }
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes input data
 */
export function validateAndSanitize<T extends Record<string, unknown>>(
  data: T,
  validator?: (data: T) => void
): T {
  const sanitized = sanitizeInput(data);
  
  if (validator) {
    validator(sanitized);
  }
  
  return sanitized;
}