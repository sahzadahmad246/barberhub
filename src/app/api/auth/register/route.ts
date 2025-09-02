import { NextRequest } from 'next/server';
import connectDB from '@/lib/database';
import PendingUser from '@/app/models/PendingUser';
import User from '@/app/models/User';
import bcrypt from 'bcryptjs';
import { EmailService } from '@/lib/email-service';
import {
  withErrorHandling,
  createSuccessResponse,
  parseRequestBody,
  validateMethod,
  validateRequestBody
} from '@/lib/api-middleware';
import { validateRegistrationForm, validateAndSanitize } from '@/lib/validation';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Validate request body content type
  const bodyError = validateRequestBody(request);
  if (bodyError) throw bodyError;

  // Parse, validate, and sanitize request body
  const rawBody = await parseRequestBody<{
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }>(request);

  const body = validateAndSanitize(rawBody, validateRegistrationForm);

  // Normalize email
  const email = body.email.toLowerCase();

  // Ensure DB connection
  await connectDB();

  // Check existing verified user
  const existing = await User.findOne({ email });
  if (existing) {
    // If account exists with Google and no password set, suggest Google sign-in
    if (existing.provider === 'google' && !existing.password) {
      return createSuccessResponse(
        { pending: false, provider: 'google' },
        'An account exists with Google sign-in. Please continue with Google.',
        HTTP_STATUS.CONFLICT
      );
    }
    return createSuccessResponse(
      { pending: false },
      'User already exists with this email',
      HTTP_STATUS.CONFLICT
    );
  }

  // Hash password for pending storage
  const passwordHash = await bcrypt.hash(body.password, 12);

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const OTP_TTL_MINUTES = 10;

  // Upsert pending user
  const pending = await PendingUser.findOneAndUpdate(
    { email },
    { name: body.name, email, passwordHash },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).select('+otpHash');

  // Set new OTP and expiry
  pending.setOtp(otp, OTP_TTL_MINUTES * 60 * 1000);
  await pending.save();

  // Email OTP (rate-limited)
  await EmailService.sendOtpEmail({
    email,
    name: body.name,
    otp,
    expiresMinutes: OTP_TTL_MINUTES
  });

  return createSuccessResponse(
    { pending: true, email },
    'OTP sent to your email. Please verify to complete registration.',
    HTTP_STATUS.OK
  );
});