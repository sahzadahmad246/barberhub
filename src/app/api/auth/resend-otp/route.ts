import { NextRequest } from 'next/server';
import connectDB from '@/lib/database';
import PendingUser from '@/app/models/PendingUser';
import { withErrorHandling, createSuccessResponse, parseRequestBody, validateMethod, validateRequestBody } from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';
import { EmailService } from '@/lib/email-service';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  const bodyError = validateRequestBody(request);
  if (bodyError) throw bodyError;

  const { email, name } = await parseRequestBody<{ email: string; name?: string }>(request);

  await connectDB();

  const pending = await PendingUser.findOne({ email }).select('+otpHash');
  if (!pending) {
    return createSuccessResponse({ sent: false }, 'No pending registration found for this email', HTTP_STATUS.NOT_FOUND);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const OTP_TTL_MINUTES = 10;
  pending.setOtp(otp, OTP_TTL_MINUTES * 60 * 1000);
  await pending.save();

  await EmailService.sendOtpEmail({ email, name: name || pending.name, otp, expiresMinutes: OTP_TTL_MINUTES });

  return createSuccessResponse({ sent: true }, 'A new OTP has been sent to your email.', HTTP_STATUS.OK);
});


