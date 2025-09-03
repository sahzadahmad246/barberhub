import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '@/app/models/User';
import connectDB from './database';
import { AuthError, AUTH_ERRORS } from './errors';
import type { 
  RegisterData, 
  LoginCredentials, 
  AuthResult,
  GoogleAuthData 
} from '@/types/auth';

/**
 * Authentication Service Layer
 * Provides core authentication functionality including registration, login, and verification
 */
export class AuthService {
  private static readonly JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key';
  private static readonly JWT_EXPIRES_IN = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  static async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generate a JWT token for authentication
   */
  static generateJWTToken(payload: { userId: string; email: string; role: string }): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'barberhub',
      audience: 'barberhub-users'
    });
  }

  /**
   * Generate a refresh token
   */
  static generateRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'barberhub',
      audience: 'barberhub-refresh'
    });
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyJWTToken(token: string): { userId: string; email: string; role: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'barberhub',
        audience: 'barberhub-users'
      }) as jwt.JwtPayload & { userId: string; email: string; role: string };
      
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Token has expired', 401, AUTH_ERRORS.EXPIRED_TOKEN);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid token', 401, AUTH_ERRORS.INVALID_TOKEN);
      }
      throw new AuthError('Token verification failed', 401, AUTH_ERRORS.INVALID_TOKEN);
    }
  }

  /**
   * Generate a cryptographically secure email verification token
   */
  static generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Register a new user with email and password
   */
  static async register(userData: RegisterData): Promise<AuthResult> {
    try {
      await connectDB();

      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new AuthError('User already exists with this email', 409, AUTH_ERRORS.USER_EXISTS);
      }

      // Create new user
      const user = new User({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        provider: userData.provider,
        emailVerified: false
      });

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      
      // Save user to database
      await user.save();

      // Send verification email
      try {
        const { EmailService } = await import('./email-service');
        await EmailService.sendVerificationEmail({
          email: user.email,
          name: user.name,
          verificationToken
        });
      } catch (emailError) {
        console.error('Failed to send verification email during registration:', emailError);
        // Don't fail registration if email fails, user can request resend
      }

      // Generate JWT token for immediate login (but with limited access until verified)
      const token = this.generateJWTToken({
        userId: (user._id as mongoose.Types.ObjectId).toString(),
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        user: user.toObject(),
        token,
        message: 'User registered successfully. Please check your email for verification.'
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      // Handle MongoDB duplicate key error
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        throw new AuthError('User already exists with this email', 409, AUTH_ERRORS.USER_EXISTS);
      }

      throw new AuthError('Registration failed', 500, 'REGISTRATION_ERROR');
    }
  }

  /**
   * Login user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      await connectDB();

      // Find user by email and include password field
      const user = await User.findOne({ email: credentials.email }).select('+password');
      
      if (!user) {
        throw new AuthError('Invalid email or password', 401, AUTH_ERRORS.INVALID_CREDENTIALS);
      }

      // Check if user can use email login (has password)
      if (!user.password) {
        if (user.provider === 'google') {
          throw new AuthError('Please use Google sign-in for this account', 400, 'INVALID_LOGIN_METHOD');
        } else {
          throw new AuthError('Incorrect email or password', 401, AUTH_ERRORS.INVALID_CREDENTIALS);
        }
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(credentials.password);
      if (!isPasswordValid) {
        throw new AuthError('Invalid email or password', 401, AUTH_ERRORS.INVALID_CREDENTIALS);
      }

      // Generate JWT token
      const token = this.generateJWTToken({
        userId: (user._id as mongoose.Types.ObjectId).toString(),
        email: user.email,
        role: user.role
      });

      // Remove password from user object before returning
      const userObject = user.toObject();
      delete userObject.password;

      return {
        success: true,
        user: userObject,
        token,
        message: user.emailVerified ? 'Login successful' : 'Login successful. Please verify your email for full access.'
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError('Login failed', 500, 'LOGIN_ERROR');
    }
  }

  /**
   * Verify email using verification token
   */
  static async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      // Find user with the verification token that hasn't expired
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() }
      }).select('+emailVerificationToken +emailVerificationExpires');

      if (!user) {
        throw new AuthError('Invalid or expired verification token', 400, AUTH_ERRORS.INVALID_TOKEN);
      }

      // Update user verification status
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      
      await user.save();

      return {
        success: true,
        message: 'Email verified successfully'
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError('Email verification failed', 500, 'VERIFICATION_ERROR');
    }
  }

  /**
   * Send verification email to user
   */
  static async sendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        throw new AuthError('User not found', 404, AUTH_ERRORS.USER_NOT_FOUND);
      }

      // Check if already verified
      if (user.emailVerified) {
        throw new AuthError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
      }

      // Generate new verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Import EmailService dynamically to avoid circular dependencies
      const { EmailService } = await import('./email-service');

      // Send verification email
      const emailResult = await EmailService.sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationToken
      });

      if (!emailResult.success) {
        if (emailResult.rateLimited) {
          throw new AuthError(emailResult.error || 'Too many emails sent', 429, AUTH_ERRORS.RATE_LIMIT_EXCEEDED);
        }
        throw new AuthError(emailResult.error || 'Failed to send verification email', 500, AUTH_ERRORS.EMAIL_SERVICE_ERROR);
      }

      return {
        success: true,
        message: 'Verification email sent successfully'
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError('Failed to send verification email', 500, AUTH_ERRORS.EMAIL_SERVICE_ERROR);
    }
  }

  /**
   * Handle Google OAuth authentication
   * Creates or updates user account based on Google profile data
   */
  static async googleAuth(googleData: GoogleAuthData): Promise<AuthResult> {
    try {
      await connectDB();

      // Check if user already exists with this email
      let user = await User.findOne({ email: googleData.email });

      if (user) {
        // Update existing user with Google data if not already a Google user
        if (user.provider !== 'google') {
          user.provider = 'google';
          user.googleId = googleData.googleId;
          user.emailVerified = true; // Google users are automatically verified
          
          // Update profile picture if provided by Google
          if (googleData.profilePicture) {
            user.profilePicture = {
              url: googleData.profilePicture,
              publicId: '' // Google images don't have Cloudinary public IDs
            };
          }
          
          await user.save();
        }
      } else {
        // Create new user for Google authentication
        user = new User({
          name: googleData.name,
          email: googleData.email,
          provider: 'google',
          googleId: googleData.googleId,
          emailVerified: true, // Google users are automatically verified
          role: 'user',
          profilePicture: googleData.profilePicture ? {
            url: googleData.profilePicture,
            publicId: '' // Google images don't have Cloudinary public IDs
          } : undefined
        });
        
        await user.save();
      }

      // Generate JWT token
      const token = this.generateJWTToken({
        userId: (user._id as mongoose.Types.ObjectId).toString(),
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        user: user.toObject(),
        token,
        message: 'Google authentication successful'
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError('Google authentication failed', 500, 'GOOGLE_AUTH_ERROR');
    }
  }

  /**
   * Find or create user from Google OAuth data
   * Used by NextAuth callbacks
   */
  static async findOrCreateGoogleUser(googleData: {
    googleId: string;
    name: string;
    email: string;
    profilePicture?: string;
  }): Promise<import('@/app/models/User').IUser> {
    try {
      await connectDB();

      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: googleData.googleId });

      if (!user) {
        // Check if user exists with this email (different provider)
        user = await User.findOne({ email: googleData.email });
        
        if (user) {
          // Update existing user to use Google authentication
          user.provider = 'google';
          user.googleId = googleData.googleId;
          user.emailVerified = true;
          
          if (googleData.profilePicture) {
            user.profilePicture = {
              url: googleData.profilePicture,
              publicId: ''
            };
          }
          
          await user.save();
        } else {
          // Create new user
          user = new User({
            name: googleData.name,
            email: googleData.email,
            provider: 'google',
            googleId: googleData.googleId,
            emailVerified: true,
            role: 'user',
            profilePicture: googleData.profilePicture ? {
              url: googleData.profilePicture,
              publicId: ''
            } : undefined
          });
          
          await user.save();
        }
      }

      return user;
    } catch (error) {
      console.error('Error in findOrCreateGoogleUser:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    try {
      await connectDB();
      
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AuthError('Invalid user ID', 400, 'INVALID_USER_ID');
      }

      const user = await User.findById(userId);
      
      if (!user) {
        throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
      }

      return user;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError('Failed to fetch user', 500, 'DATABASE_ERROR');
    }
  }

  static async linkGoogleToEmailUser(email: string, googleId: string, imageUrl?: string) {
    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (!user.googleId) {
      user.googleId = googleId;
      user.emailVerified = true;
      if (imageUrl) {
        user.profilePicture = { url: imageUrl, publicId: '' };
      }
      await user.save();
    }
    return user;
  }

  /**
   * Request password reset by sending OTP to user's email
   */
  static async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists or not for security
        return {
          success: true,
          message: 'If an account with this email exists, a password reset OTP has been sent.'
        };
      }

      // Generate OTP and save to user
      const otp = user.generateOTP();
      await user.save();

      // Send password reset email with OTP
      try {
        const { EmailService } = await import('./email-service');
        await EmailService.sendPasswordResetOTP({
          email: user.email,
          name: user.name,
          otp
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        throw new AuthError('Failed to send password reset email', 500, AUTH_ERRORS.EMAIL_SERVICE_ERROR);
      }

      return {
        success: true,
        message: 'Password reset OTP sent successfully. Please check your email.'
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Password reset request failed', 500, 'PASSWORD_RESET_ERROR');
    }
  }

  /**
   * Verify OTP and reset password
   */
  static async resetPasswordWithOTP(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const user = await User.findOne({ email }).select('+otpCode +otpExpiresAt');
      if (!user) {
        throw new AuthError('User not found', 404, AUTH_ERRORS.USER_NOT_FOUND);
      }

      // Verify OTP
      if (!user.verifyOTP(otp)) {
        throw new AuthError('Invalid or expired OTP', 400, AUTH_ERRORS.INVALID_TOKEN);
      }

      // Update password
      user.password = newPassword;
      user.otpCode = undefined;
      user.otpExpiresAt = undefined;
      
      // If user was Google-only, now they can use both methods
      if (user.provider === 'google') {
        user.provider = 'both';
      }
      
      await user.save();

      return {
        success: true,
        message: 'Password reset successfully. You can now login with your new password.'
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Password reset failed', 500, 'PASSWORD_RESET_ERROR');
    }
  }

  /**
   * Send OTP for email verification
   */
  static async sendEmailVerificationOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthError('User not found', 404, AUTH_ERRORS.USER_NOT_FOUND);
      }

      if (user.emailVerified) {
        throw new AuthError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
      }

      // Generate OTP and save to user
      const otp = user.generateOTP();
      await user.save();

      // Send verification email with OTP
      try {
        const { EmailService } = await import('./email-service');
        await EmailService.sendVerificationOTP({
          email: user.email,
          name: user.name,
          otp
        });
      } catch (emailError) {
        console.error('Failed to send verification OTP email:', emailError);
        throw new AuthError('Failed to send verification OTP', 500, AUTH_ERRORS.EMAIL_SERVICE_ERROR);
      }

      return {
        success: true,
        message: 'Verification OTP sent successfully. Please check your email.'
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Failed to send verification OTP', 500, AUTH_ERRORS.EMAIL_SERVICE_ERROR);
    }
  }

  /**
   * Verify email using OTP
   */
  static async verifyEmailWithOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const user = await User.findOne({ email }).select('+otpCode +otpExpiresAt');
      if (!user) {
        throw new AuthError('User not found', 404, AUTH_ERRORS.USER_NOT_FOUND);
      }

      if (user.emailVerified) {
        throw new AuthError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
      }

      // Verify OTP
      if (!user.verifyOTP(otp)) {
        throw new AuthError('Invalid or expired OTP', 400, AUTH_ERRORS.INVALID_TOKEN);
      }

      // Mark email as verified
      user.emailVerified = true;
      user.otpCode = undefined;
      user.otpExpiresAt = undefined;
      await user.save();

      return {
        success: true,
        message: 'Email verified successfully'
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Email verification failed', 500, 'VERIFICATION_ERROR');
    }
  }

  /**
   * Allow Google users to add a password for email login
   */
  static async addPasswordToGoogleUser(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthError('User not found', 404, AUTH_ERRORS.USER_NOT_FOUND);
      }

      if (user.provider !== 'google') {
        throw new AuthError('This account is not a Google account', 400, 'INVALID_ACCOUNT_TYPE');
      }

      if (user.password) {
        throw new AuthError('Password already exists for this account', 400, 'PASSWORD_ALREADY_EXISTS');
      }

      // Add password to Google user
      user.password = password;
      user.provider = 'both'; // Now supports both Google and email login
      await user.save();

      return {
        success: true,
        message: 'Password added successfully. You can now login with either Google or email/password.'
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Failed to add password', 500, 'ADD_PASSWORD_ERROR');
    }
  }
}

// Export individual functions for convenience
export const {
  hashPassword,
  comparePassword,
  generateJWTToken,
  verifyJWTToken,
  generateEmailVerificationToken,
  register,
  login,
  verifyEmail,
  getUserById
} = AuthService;