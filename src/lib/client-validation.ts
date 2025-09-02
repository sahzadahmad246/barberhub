/**
 * Client-side validation utilities for forms
 * Provides real-time validation with user-friendly error messages
 */

import React from 'react';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface ValidationRule<T = unknown> {
  validate: (value: T, allValues?: Record<string, unknown>) => boolean;
  message: string;
  severity?: 'error' | 'warning';
}

/**
 * Email validation for client-side
 */
export const emailValidationRules: ValidationRule<string>[] = [
  {
    validate: (value) => Boolean(value?.trim()),
    message: 'Email address is required'
  },
  {
    validate: (value) => value.trim().length <= 254,
    message: 'Email address is too long (maximum 254 characters)'
  },
  {
    validate: (value) => {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      return emailRegex.test(value.trim());
    },
    message: 'Please enter a valid email address (e.g., user@example.com)'
  },
  {
    validate: (value) => {
      const lower = value.toLowerCase().trim();
      const atIndex = lower.lastIndexOf('@');
      if (atIndex === -1) return true;
      const domain = lower.slice(atIndex + 1);
      const commonTypos = ['gmail.co', 'yahoo.co', 'hotmail.co', 'outlook.co'];
      return !commonTypos.includes(domain);
    },
    message: 'Please check your email domain (did you mean .com?)',
    severity: 'warning'
  }
];

/**
 * Password validation for client-side
 */
export const passwordValidationRules: ValidationRule<string>[] = [
  {
    validate: (value) => Boolean(value),
    message: 'Password is required'
  },
  {
    validate: (value) => value.length >= 8,
    message: 'Password must be at least 8 characters long'
  },
  {
    validate: (value) => value.length <= 128,
    message: 'Password cannot exceed 128 characters'
  },
  {
    validate: (value) => /[a-z]/.test(value),
    message: 'Password must contain at least one lowercase letter'
  },
  {
    validate: (value) => /[A-Z]/.test(value),
    message: 'Password must contain at least one uppercase letter'
  },
  {
    validate: (value) => /\d/.test(value),
    message: 'Password must contain at least one number'
  },
  {
    validate: (value) => /[@$!%*?&]/.test(value),
    message: 'Password must contain at least one special character (@$!%*?&)'
  },
  {
    validate: (value) => {
      const commonPasswords = [
        'password', '123456', '123456789', 'qwerty', 'abc123',
        'password123', 'admin', 'letmein', 'welcome', 'monkey'
      ];
      return !commonPasswords.includes(value.toLowerCase());
    },
    message: 'This password is too common. Please choose a more secure password'
  },
  {
    validate: (value) => !/123|abc|qwe/i.test(value),
    message: 'Password should not contain sequential characters (e.g., 123, abc)',
    severity: 'warning'
  }
];

/**
 * Name validation for client-side
 */
export const nameValidationRules: ValidationRule<string>[] = [
  {
    validate: (value) => Boolean(value?.trim()),
    message: 'Name is required'
  },
  {
    validate: (value) => value.trim().length >= 2,
    message: 'Name must be at least 2 characters long'
  },
  {
    validate: (value) => value.trim().length <= 50,
    message: 'Name cannot exceed 50 characters'
  },
  {
    validate: (value) => /^[a-zA-Z\s'-]+$/.test(value.trim()),
    message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
  },
  {
    validate: (value) => !/\s{2,}/.test(value.trim()),
    message: 'Name cannot contain multiple consecutive spaces'
  }
];

/**
 * Password confirmation validation
 */
export const passwordConfirmationRules: ValidationRule<string>[] = [
  {
    validate: (value) => Boolean(value),
    message: 'Password confirmation is required'
  },
  {
    validate: (value, allValues) => value === allValues?.password,
    message: 'Passwords do not match'
  }
];

/**
 * Validates a single field against its rules
 */
export function validateField<TValues extends Record<string, unknown>>(
  value: unknown,
  rules: ValidationRule[],
  allValues?: TValues
): { error?: string; warning?: string } {
  for (const rule of rules) {
    if (!rule.validate(value, allValues)) {
      if (rule.severity === 'warning') {
        return { warning: rule.message };
      }
      return { error: rule.message };
    }
  }
  return {};
}

/**
 * Validates multiple fields
 */
export function validateForm<TValues extends Record<string, unknown>>(
  values: TValues,
  fieldRules: Record<string, ValidationRule[]>
): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  for (const [fieldName, rules] of Object.entries(fieldRules)) {
    const value = (values as Record<string, unknown>)[fieldName];
    const result = validateField(value, rules, values as Record<string, unknown>);
    
    if (result.error) {
      errors[fieldName] = result.error;
    }
    if (result.warning) {
      warnings[fieldName] = result.warning;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

/**
 * Real-time validation hook for React forms
 */
export function useFormValidation<TValues extends Record<string, unknown>>(
  initialValues: TValues,
  fieldRules: Record<keyof TValues & string, ValidationRule[]>
) {
  const [values, setValues] = React.useState<TValues>(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [warnings, setWarnings] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateSingleField = (fieldName: keyof TValues & string, value: unknown) => {
    const rules = fieldRules[fieldName];
    if (!rules) return;

    const result = validateField(value, rules, values);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.error || ''
    }));
    
    setWarnings(prev => ({
      ...prev,
      [fieldName]: result.warning || ''
    }));
  };

  const handleChange = (fieldName: keyof TValues & string, value: unknown) => {
    setValues(prev => ({ ...(prev as Record<string, unknown>), [fieldName]: value }) as TValues);
    
    // Only validate if field has been touched
    if (touched[fieldName]) {
      validateSingleField(fieldName, value);
    }
  };

  const handleBlur = (fieldName: keyof TValues & string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateSingleField(fieldName, (values as Record<string, unknown>)[fieldName]);
  };

  const validateAll = (): boolean => {
    const result = validateForm(values, fieldRules as Record<string, ValidationRule[]>);
    setErrors(result.errors);
    setWarnings(result.warnings || {});
    
    // Mark all fields as touched
    const allTouched = (Object.keys(fieldRules) as Array<keyof TValues & string>).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouched(allTouched);
    
    return result.isValid;
  };

  const clearErrors = () => {
    setErrors({});
    setWarnings({});
    setTouched({});
  };

  return {
    values,
    errors,
    warnings,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    clearErrors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Pre-defined validation rule sets for common forms
 */
export const validationRuleSets = {
  registration: {
    name: nameValidationRules,
    email: emailValidationRules,
    password: passwordValidationRules,
    confirmPassword: passwordConfirmationRules
  },
  login: {
    email: emailValidationRules,
    password: [
      {
        validate: (value: string) => Boolean(value),
        message: 'Password is required'
      }
    ]
  },
  profile: {
    name: nameValidationRules,
    email: emailValidationRules
  }
};

/**
 * Get user-friendly error messages for API errors
 */
export function getApiErrorMessage(error: { code?: string; message?: string }): string {
  if (error?.code) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'EMAIL_NOT_VERIFIED':
        return 'Please verify your email address before logging in. Check your inbox for a verification link.';
      case 'USER_EXISTS':
        return 'An account with this email address already exists. Please use a different email or try logging in.';
      case 'USER_NOT_FOUND':
        return 'No account found with this email address. Please check your email or create a new account.';
      case 'INVALID_TOKEN':
        return 'The verification link is invalid or has expired. Please request a new verification email.';
      case 'EXPIRED_TOKEN':
        return 'The verification link has expired. Please request a new verification email.';
      case 'WEAK_PASSWORD':
        return error.message || 'Password does not meet security requirements.';
      case 'INVALID_EMAIL':
        return error.message || 'Please enter a valid email address.';
      case 'VALIDATION_ERROR':
        return error.message || 'Please check your input and try again.';
      case 'UPLOAD_FAILED':
        return 'Failed to upload file. Please try again with a different image.';
      case 'INVALID_FILE_TYPE':
        return 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.';
      case 'FILE_TOO_LARGE':
        return 'File size is too large. Please upload an image smaller than 5MB.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your internet connection and try again.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
  
  return error?.message || 'An unexpected error occurred. Please try again.';
}