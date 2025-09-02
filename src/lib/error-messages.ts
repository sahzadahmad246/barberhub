/**
 * User-friendly error messages for common scenarios
 * Provides consistent, helpful error messages across the application
 */

import { AUTH_ERRORS } from './errors';

/**
 * Maps error codes to user-friendly messages
 */
export const ERROR_MESSAGES: Record<string, string> = {
    // Authentication errors
    [AUTH_ERRORS.INVALID_CREDENTIALS]: 'Invalid email or password. Please check your credentials and try again.',
    [AUTH_ERRORS.EMAIL_NOT_VERIFIED]: 'Please verify your email address before logging in. Check your inbox for a verification link.',
    [AUTH_ERRORS.USER_EXISTS]: 'An account with this email address already exists. Please use a different email or try logging in.',
    [AUTH_ERRORS.USER_NOT_FOUND]: 'No account found with this email address. Please check your email or create a new account.',

    // Token errors
    [AUTH_ERRORS.INVALID_TOKEN]: 'The verification link is invalid or has expired. Please request a new verification email.',
    [AUTH_ERRORS.EXPIRED_TOKEN]: 'The verification link has expired. Please request a new verification email.',
    [AUTH_ERRORS.TOKEN_REQUIRED]: 'Authentication token is required. Please log in again.',
    [AUTH_ERRORS.MISSING_TOKEN]: 'Authentication token is missing. Please log in again.',

    // Validation errors
    [AUTH_ERRORS.VALIDATION_ERROR]: 'Please check your input and try again.',
    [AUTH_ERRORS.INVALID_EMAIL]: 'Please enter a valid email address.',
    [AUTH_ERRORS.WEAK_PASSWORD]: 'Password does not meet security requirements.',

    // Upload errors
    [AUTH_ERRORS.UPLOAD_FAILED]: 'Failed to upload file. Please try again with a different image.',
    [AUTH_ERRORS.INVALID_FILE_TYPE]: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.',
    [AUTH_ERRORS.FILE_TOO_LARGE]: 'File size is too large. Please upload an image smaller than 5MB.',

    // Server errors
    [AUTH_ERRORS.DATABASE_ERROR]: 'Database error occurred. Please try again later.',
    [AUTH_ERRORS.EMAIL_SERVICE_ERROR]: 'Failed to send email. Please try again later.',
    [AUTH_ERRORS.EXTERNAL_SERVICE_ERROR]: 'External service error. Please try again later.',

    // Authorization errors
    [AUTH_ERRORS.UNAUTHORIZED]: 'You must be logged in to access this resource.',
    [AUTH_ERRORS.FORBIDDEN]: 'You do not have permission to access this resource.',

    // Rate limiting
    [AUTH_ERRORS.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment before trying again.',

    // Generic fallback
    'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.'
};

/**
 * Context-specific error messages for different scenarios
 */
export const CONTEXT_ERROR_MESSAGES = {
    registration: {
        [AUTH_ERRORS.USER_EXISTS]: 'An account with this email already exists. Would you like to log in instead?',
        [AUTH_ERRORS.WEAK_PASSWORD]: 'Please create a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.',
        [AUTH_ERRORS.INVALID_EMAIL]: 'Please enter a valid email address. We\'ll send you a verification link.',
        [AUTH_ERRORS.VALIDATION_ERROR]: 'Please fill in all required fields correctly.'
    },

    login: {
        [AUTH_ERRORS.INVALID_CREDENTIALS]: 'The email or password you entered is incorrect. Please try again.',
        [AUTH_ERRORS.EMAIL_NOT_VERIFIED]: 'Your email address hasn\'t been verified yet. Please check your inbox and click the verification link.',
        [AUTH_ERRORS.USER_NOT_FOUND]: 'We couldn\'t find an account with that email address. Would you like to create a new account?',
        [AUTH_ERRORS.RATE_LIMIT_EXCEEDED]: 'Too many login attempts. Please wait 15 minutes before trying again.'
    },

    profile: {
        [AUTH_ERRORS.VALIDATION_ERROR]: 'Please check your profile information and try again.',
        [AUTH_ERRORS.INVALID_EMAIL]: 'Please enter a valid email address for your profile.',
        'DUPLICATE_RESOURCE': 'This email address is already in use by another account.',
        [AUTH_ERRORS.UNAUTHORIZED]: 'Your session has expired. Please log in again.'
    },

    upload: {
        [AUTH_ERRORS.INVALID_FILE_TYPE]: 'Please upload an image file (JPEG, PNG, WebP, or GIF).',
        [AUTH_ERRORS.FILE_TOO_LARGE]: 'Image file is too large. Please choose an image smaller than 5MB.',
        [AUTH_ERRORS.UPLOAD_FAILED]: 'Failed to upload your image. Please try again with a different file.',
        [AUTH_ERRORS.UNAUTHORIZED]: 'You must be logged in to upload a profile picture.'
    },

    verification: {
        [AUTH_ERRORS.INVALID_TOKEN]: 'This verification link is invalid or has expired. Please request a new verification email.',
        [AUTH_ERRORS.EXPIRED_TOKEN]: 'This verification link has expired. Please request a new verification email.',
        [AUTH_ERRORS.USER_NOT_FOUND]: 'We couldn\'t find your account. Please try registering again.',
        [AUTH_ERRORS.EMAIL_SERVICE_ERROR]: 'Failed to send verification email. Please try again later.'
    }
};

/**
 * Gets a user-friendly error message for a given error code and context
 */
export function getErrorMessage(
    errorCode: string,
    context?: keyof typeof CONTEXT_ERROR_MESSAGES,
    fallbackMessage?: string
): string {
    // Try context-specific message first
    if (context) {
        const contextMap = CONTEXT_ERROR_MESSAGES[context] as Record<string, string> | undefined;
        if (contextMap && contextMap[errorCode]) {
            return contextMap[errorCode];
        }
    }

    // Fall back to general error message
    if (ERROR_MESSAGES[errorCode]) {
        return ERROR_MESSAGES[errorCode];
    }

    // Use provided fallback or generic message
    return fallbackMessage || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Gets helpful suggestions for common error scenarios
 */
export function getErrorSuggestions(errorCode: string): string[] {
    const suggestions: Record<string, string[]> = {
        [AUTH_ERRORS.INVALID_CREDENTIALS]: [
            'Double-check your email address for typos',
            'Make sure your password is correct',
            'Try resetting your password if you\'ve forgotten it'
        ],

        [AUTH_ERRORS.EMAIL_NOT_VERIFIED]: [
            'Check your email inbox and spam folder',
            'Click the verification link in the email we sent',
            'Request a new verification email if needed'
        ],

        [AUTH_ERRORS.WEAK_PASSWORD]: [
            'Use at least 8 characters',
            'Include uppercase and lowercase letters',
            'Add numbers and special characters (@$!%*?&)',
            'Avoid common passwords like "password123"'
        ],

        [AUTH_ERRORS.INVALID_EMAIL]: [
            'Make sure your email includes @ and a domain',
            'Check for typos in the domain (e.g., gmail.com not gmail.co)',
            'Use a valid email format like user@example.com'
        ],

        [AUTH_ERRORS.FILE_TOO_LARGE]: [
            'Compress your image using an online tool',
            'Choose a smaller image file',
            'Resize your image to reduce file size'
        ],

        [AUTH_ERRORS.INVALID_FILE_TYPE]: [
            'Use JPEG, PNG, WebP, or GIF format',
            'Convert your image to a supported format',
            'Make sure the file extension matches the format'
        ]
    };

    return suggestions[errorCode] || [];
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: Array<{ field: string; message: string; code?: string }>): {
    summary: string;
    details: Record<string, string>;
    suggestions: Record<string, string[]>;
} {
    const details: Record<string, string> = {};
    const suggestions: Record<string, string[]> = {};

    errors.forEach(error => {
        details[error.field] = error.message;
        if (error.code) {
            suggestions[error.field] = getErrorSuggestions(error.code);
        }
    });

    const fieldCount = errors.length;
    const summary = fieldCount === 1
        ? `Please fix the error in the ${errors[0].field} field`
        : `Please fix the errors in ${fieldCount} fields`;

    return { summary, details, suggestions };
}

/**
 * Network error messages
 */
export const NETWORK_ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
    TIMEOUT_ERROR: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    CONNECTION_ERROR: 'Connection error. Please check your internet connection.'
};

/**
 * Gets appropriate error message for network/fetch errors
 */
export function getNetworkErrorMessage(error: unknown): string {
    if (!navigator.onLine) {
        return 'You appear to be offline. Please check your internet connection.';
    }

    if ((error as Error)?.name === 'AbortError') {
        return NETWORK_ERROR_MESSAGES.TIMEOUT_ERROR;
    }

    if ((error as { code?: string; message?: string })?.code === 'NETWORK_ERROR' || (error as Error)?.message?.includes('fetch')) {
        return NETWORK_ERROR_MESSAGES.NETWORK_ERROR;
    }

    return NETWORK_ERROR_MESSAGES.SERVER_ERROR;
}

/**
 * Success messages for positive user feedback
 */
export const SUCCESS_MESSAGES = {
    REGISTRATION_SUCCESS: 'Account created successfully! Please check your email to verify your account.',
    LOGIN_SUCCESS: 'Welcome back! You have been logged in successfully.',
    PROFILE_UPDATED: 'Your profile has been updated successfully.',
    PROFILE_PICTURE_UPLOADED: 'Profile picture updated successfully.',
    PROFILE_PICTURE_REMOVED: 'Profile picture removed successfully.',
    EMAIL_VERIFIED: 'Your email has been verified successfully! You can now access all features.',
    VERIFICATION_EMAIL_SENT: 'Verification email sent! Please check your inbox and click the verification link.',
    PASSWORD_RESET_SENT: 'Password reset instructions have been sent to your email.',
    LOGOUT_SUCCESS: 'You have been logged out successfully.'
};

/**
 * Gets success message for a given action
 */
export function getSuccessMessage(action: keyof typeof SUCCESS_MESSAGES): string {
    return SUCCESS_MESSAGES[action] || 'Operation completed successfully.';
}