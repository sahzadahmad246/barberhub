import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Rate limiting store (in production, use Redis or database)
const emailRateLimit = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_EMAILS_PER_HOUR = 3; // Maximum 3 verification emails per hour per email

export interface EmailVerificationData {
  email: string;
  name: string;
  verificationToken: string;
}

export interface OtpEmailData {
  email: string;
  name: string;
  otp: string;
  expiresMinutes: number;
}

export interface WelcomeEmailData {
  email: string;
  name: string;
}

export class EmailService {
  /**
   * Check if email is rate limited
   */
  private static isRateLimited(email: string): boolean {
    const now = Date.now();
    const rateData = emailRateLimit.get(email);

    if (!rateData) {
      return false;
    }

    // Reset if window has passed
    if (now > rateData.resetTime) {
      emailRateLimit.delete(email);
      return false;
    }

    return rateData.count >= MAX_EMAILS_PER_HOUR;
  }

  /**
   * Update rate limit counter for email
   */
  private static updateRateLimit(email: string): void {
    const now = Date.now();
    const rateData = emailRateLimit.get(email);

    if (!rateData || now > rateData.resetTime) {
      emailRateLimit.set(email, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
    } else {
      rateData.count += 1;
    }
  }

  /**
   * Generate email verification HTML template
   */
  private static generateVerificationEmailHTML(data: EmailVerificationData): string {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${data.verificationToken}`;
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Barber Hub</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .title {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 20px;
          }
          .content {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
          .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Barber Hub</div>
            <h1 class="title">Verify Your Email Address</h1>
          </div>
          
          <div class="content">
            <p>Hi ${data.name},</p>
            
            <p>Welcome to Barber Hub! To complete your registration and start using your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
            
            <div class="warning">
              <strong>Important:</strong> This verification link will expire in 24 hours. If you don't verify your email within this time, you'll need to request a new verification email.
            </div>
            
            <p>If you didn't create an account with Barber Hub, you can safely ignore this email.</p>
          </div>
          
          <div class="footer">
            <p>This email was sent by Barber Hub. If you have any questions, please contact our support team.</p>
            <p>&copy; ${new Date().getFullYear()} Barber Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text version of verification email
   */
  private static generateVerificationEmailText(data: EmailVerificationData): string {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${data.verificationToken}`;
    
    return `
Hi ${data.name},

Welcome to Barber Hub! To complete your registration and start using your account, please verify your email address by visiting this link:

${verificationUrl}

Important: This verification link will expire in 24 hours. If you don't verify your email within this time, you'll need to request a new verification email.

If you didn't create an account with Barber Hub, you can safely ignore this email.

Best regards,
The Barber Hub Team

© ${new Date().getFullYear()} Barber Hub. All rights reserved.
    `.trim();
  }

  private static generateOtpEmailHTML(data: OtpEmailData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Verification Code - Barber Hub</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
          .container { background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
          .logo { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
          .title { font-size: 24px; color: #1f2937; margin-bottom: 20px; }
          .code { font-size: 32px; letter-spacing: 6px; font-weight: 800; color: #111827; background: #f3f4f6; padding: 12px 16px; text-align: center; border-radius: 8px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
          .warning { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Barber Hub</div>
          <h1 class="title">Your Verification Code</h1>
          <p>Hi ${data.name},</p>
          <p>Use the following One-Time Password (OTP) to verify your email and complete your registration:</p>
          <div class="code">${data.otp}</div>
          <div class="warning">
            <strong>Important:</strong> This code expires in ${data.expiresMinutes} minutes. Do not share this code with anyone.
          </div>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Barber Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private static generateOtpEmailText(data: OtpEmailData): string {
    return `Hi ${data.name},\n\nYour Barber Hub verification code is: ${data.otp}\n\nThis code expires in ${data.expiresMinutes} minutes. Do not share this code with anyone.\n\nIf you didn't request this, you can ignore this email.\n\n© ${new Date().getFullYear()} Barber Hub. All rights reserved.`;
  }

  private static generateWelcomeEmailHTML(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Barber Hub</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
          .container { background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
          .logo { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
          .title { font-size: 24px; color: #1f2937; margin-bottom: 20px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Barber Hub</div>
          <h1 class="title">Welcome to Barber Hub, ${data.name}!</h1>
          <p>We're excited to have you on board. You're all set to explore Barber Hub.</p>
          <p>If you have any questions, just reply to this email—we're here to help.</p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Barber Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private static generateWelcomeEmailText(data: WelcomeEmailData): string {
    return `Welcome to Barber Hub, ${data.name}!\n\nWe're excited to have you on board. You're all set to explore Barber Hub.\n\nIf you have any questions, just reply to this email—we're here to help.\n\n© ${new Date().getFullYear()} Barber Hub. All rights reserved.`;
  }

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(data: EmailVerificationData): Promise<{
    success: boolean;
    error?: string;
    rateLimited?: boolean;
  }> {
    try {
      // Check rate limiting
      if (this.isRateLimited(data.email)) {
        return {
          success: false,
          error: 'Too many verification emails sent. Please wait before requesting another.',
          rateLimited: true
        };
      }

      // Validate required environment variables
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable is not set');
      }

      if (!process.env.NEXTAUTH_URL) {
        throw new Error('NEXTAUTH_URL environment variable is not set');
      }

      //

      // Send email using Resend
      const result = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [data.email],
        subject: 'Verify Your Email Address - Barber Hub',
        html: this.generateVerificationEmailHTML(data),
        text: this.generateVerificationEmailText(data),
      });

      //

      // Update rate limiting
      this.updateRateLimit(data.email);

      if (result.error) {
        console.error('Resend API error:', result.error);
        return {
          success: false,
          error: 'Failed to send verification email. Please try again later.'
        };
      }

      console.log('Verification email sent successfully:', result.data?.id);
      return { success: true };

    } catch (error) {
      //
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send verification email'
      };
    }
  }

  static async sendOtpEmail(data: OtpEmailData): Promise<{ success: boolean; error?: string; rateLimited?: boolean; }> {
    try {
      if (this.isRateLimited(data.email)) {
        return { success: false, error: 'Too many emails sent. Please wait.', rateLimited: true };
      }

      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable is not set');
      }

      //

      const result = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [data.email],
        subject: 'Your Barber Hub verification code',
        html: this.generateOtpEmailHTML(data),
        text: this.generateOtpEmailText(data)
      });

      //

      this.updateRateLimit(data.email);

      if (result.error) {
        return { success: false, error: 'Failed to send OTP email' };
      }
      return { success: true };
    } catch (error) {
      //
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send OTP email' };
    }
  }

  static async sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; error?: string; }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable is not set');
      }

      //

      const result = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [data.email],
        subject: 'Welcome to Barber Hub',
        html: this.generateWelcomeEmailHTML(data),
        text: this.generateWelcomeEmailText(data)
      });

      //

      if (result.error) {
        return { success: false, error: 'Failed to send welcome email' };
      }
      return { success: true };
    } catch (error) {
      //
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send welcome email' };
    }
  }

  /**
   * Get rate limit status for an email
   */
  static getRateLimitStatus(email: string): {
    isLimited: boolean;
    remainingTime?: number;
    attemptsUsed?: number;
    maxAttempts: number;
  } {
    const now = Date.now();
    const rateData = emailRateLimit.get(email);

    if (!rateData || now > rateData.resetTime) {
      return {
        isLimited: false,
        maxAttempts: MAX_EMAILS_PER_HOUR
      };
    }

    return {
      isLimited: rateData.count >= MAX_EMAILS_PER_HOUR,
      remainingTime: rateData.resetTime - now,
      attemptsUsed: rateData.count,
      maxAttempts: MAX_EMAILS_PER_HOUR
    };
  }

  /**
   * Clear rate limit for an email (useful for testing or admin override)
   */
  static clearRateLimit(email: string): void {
    emailRateLimit.delete(email);
  }

  /**
   * Send password reset OTP email
   */
  static async sendPasswordResetOTP(data: { email: string; name: string; otp: string }): Promise<{ success: boolean; error?: string; rateLimited?: boolean; }> {
    try {
      if (this.isRateLimited(data.email)) {
        return { success: false, error: 'Too many emails sent. Please wait.', rateLimited: true };
      }

      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable is not set');
      }

      const result = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [data.email],
        subject: 'Password Reset Code - Barber Hub',
        html: this.generatePasswordResetOTPHTML(data),
        text: this.generatePasswordResetOTPText(data)
      });

      this.updateRateLimit(data.email);

      if (result.error) {
        return { success: false, error: 'Failed to send password reset email' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send password reset email' };
    }
  }

  /**
   * Send email verification OTP
   */
  static async sendVerificationOTP(data: { email: string; name: string; otp: string }): Promise<{ success: boolean; error?: string; rateLimited?: boolean; }> {
    try {
      if (this.isRateLimited(data.email)) {
        return { success: false, error: 'Too many emails sent. Please wait.', rateLimited: true };
      }

      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable is not set');
      }

      const result = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [data.email],
        subject: 'Email Verification Code - Barber Hub',
        html: this.generateVerificationOTPHTML(data),
        text: this.generateVerificationOTPText(data)
      });

      this.updateRateLimit(data.email);

      if (result.error) {
        return { success: false, error: 'Failed to send verification email' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send verification email' };
    }
  }

  /**
   * Generate password reset OTP HTML template
   */
  private static generatePasswordResetOTPHTML(data: { email: string; name: string; otp: string }): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Barber Hub</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-bottom: 10px;
          }
          .otp-code {
            background-color: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
            font-family: 'Courier New', monospace;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #000;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #6c757d;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Barber Hub</div>
            <h1>Password Reset Request</h1>
          </div>
          
          <p>Hello ${data.name},</p>
          
          <p>We received a request to reset your password for your Barber Hub account. Use the verification code below to complete the process:</p>
          
          <div class="otp-code">${data.otp}</div>
          
          <div class="warning">
            <strong>Important:</strong> This code will expire in 10 minutes. If you didn't request this password reset, please ignore this email.
          </div>
          
          <p>If you have any questions or need assistance, please contact our support team.</p>
          
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2024 Barber Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate password reset OTP text template
   */
  private static generatePasswordResetOTPText(data: { email: string; name: string; otp: string }): string {
    return `
Password Reset Request - Barber Hub

Hello ${data.name},

We received a request to reset your password for your Barber Hub account. Use the verification code below to complete the process:

${data.otp}

Important: This code will expire in 10 minutes. If you didn't request this password reset, please ignore this email.

If you have any questions or need assistance, please contact our support team.

This is an automated message, please do not reply to this email.

© 2024 Barber Hub. All rights reserved.
    `;
  }

  /**
   * Generate email verification OTP HTML template
   */
  private static generateVerificationOTPHTML(data: { email: string; name: string; otp: string }): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Barber Hub</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-bottom: 10px;
          }
          .otp-code {
            background-color: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
            font-family: 'Courier New', monospace;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #000;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #6c757d;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Barber Hub</div>
            <h1>Email Verification</h1>
          </div>
          
          <p>Hello ${data.name},</p>
          
          <p>Please verify your email address for your Barber Hub account. Use the verification code below:</p>
          
          <div class="otp-code">${data.otp}</div>
          
          <div class="warning">
            <strong>Important:</strong> This code will expire in 10 minutes. If you didn't create this account, please ignore this email.
          </div>
          
          <p>Once verified, you'll have full access to your account.</p>
          
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2024 Barber Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate email verification OTP text template
   */
  private static generateVerificationOTPText(data: { email: string; name: string; otp: string }): string {
    return `
Email Verification - Barber Hub

Hello ${data.name},

Please verify your email address for your Barber Hub account. Use the verification code below:

${data.otp}

Important: This code will expire in 10 minutes. If you didn't create this account, please ignore this email.

Once verified, you'll have full access to your account.

This is an automated message, please do not reply to this email.

© 2024 Barber Hub. All rights reserved.
    `;
  }
}