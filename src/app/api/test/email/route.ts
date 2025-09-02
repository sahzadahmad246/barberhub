import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test endpoint not available in production' },
        { status: 403 }
      );
    }

    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Generate a test verification token
    const testToken = 'test-' + Math.random().toString(36).substring(2, 15);

    // Test the email service
    const result = await EmailService.sendVerificationEmail({
      email,
      name,
      verificationToken: testToken
    });

    // Get rate limit status
    const rateLimitStatus = EmailService.getRateLimitStatus(email);

    return NextResponse.json({
      emailResult: result,
      rateLimitStatus,
      testToken,
      message: result.success 
        ? 'Test email sent successfully!' 
        : 'Failed to send test email'
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: 'Email service test endpoint',
    usage: 'POST with { email, name } to test email sending',
    environment: {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nodeEnv: process.env.NODE_ENV
    }
  });
}