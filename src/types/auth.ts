import { IUser } from '@/app/models/User';

// Authentication related types
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  provider: 'email';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface GoogleAuthData {
  googleId: string;
  name: string;
  email: string;
  profilePicture?: string;
  provider: 'google';
}

export interface AuthResult {
  success: boolean;
  user?: IUser;
  token?: string;
  message?: string;
}

// New types for enhanced authentication
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetVerify {
  email: string;
  otp: string;
  newPassword: string;
}

export interface EmailVerificationOTP {
  email: string;
  otp: string;
}

export interface AddPasswordToGoogleUser {
  email: string;
  password: string;
}

export interface CloudinaryResult {
  url: string;
  publicId: string;
}

// Re-export API response types from centralized location
export type {
  ErrorResponse,
  SuccessResponse,
  ApiResponse,
  ValidationError,
  ValidationErrorResponse
} from './api';

// Re-export User interface
export type { IUser } from '@/app/models/User';