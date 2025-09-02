import { NextRequest } from 'next/server';
import connectDB from '@/lib/database';
import PendingUser from '@/app/models/PendingUser';
import User from '@/app/models/User';
import { withErrorHandling, createSuccessResponse, parseRequestBody, validateMethod, validateRequestBody } from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';
import { EmailService } from '@/lib/email-service';
import { sign } from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  const bodyError = validateRequestBody(request);
  if (bodyError) throw bodyError;

  const { email, otp } = await parseRequestBody<{ email: string; otp: string }>(request);

  await connectDB();

  const pending = await PendingUser.findOne({ email }).select('+otpHash +passwordHash');
  if (!pending) {
    return createSuccessResponse({ verified: false }, 'No pending registration found for this email', HTTP_STATUS.NOT_FOUND);
  }

  const isValid = pending.verifyOtp(otp);
  if (!isValid) {
    return createSuccessResponse({ verified: false }, 'Invalid or expired OTP', HTTP_STATUS.BAD_REQUEST);
  }

  // Create the actual user
  const user = new User({
    name: pending.name,
    email: pending.email,
    password: pending.passwordHash,
    provider: 'email',
    emailVerified: true
  });
  await user.save();

  // Delete pending registration
  await PendingUser.deleteOne({ _id: pending._id });

  // Fire and forget welcome email
  EmailService.sendWelcomeEmail({ email: user.email, name: user.name }).catch(() => {});

  // Issue a session JWT cookie so user is logged in immediately
  const jwtSecret = process.env.NEXTAUTH_SECRET as string;
  const token = sign(
    {
      sub: String(user._id),
      email: user.email,
      role: user.role,
      provider: user.provider,
      emailVerified: true
    },
    jwtSecret,
    { expiresIn: '60d' }
  );
  const response = NextResponse.json(
    {
      success: true,
      data: { verified: true, token },
      message: 'Email verified and account created successfully',
      timestamp: new Date().toISOString()
    },
    { status: HTTP_STATUS.CREATED }
  );
  response.cookies.set('next-auth.session-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 24 * 60 * 60
  });
  return response;
});


