import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email-service';
import User from '@/app/models/User';
import connectDB from '@/lib/database';
import { AuthError, AUTH_ERRORS } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Email is required',
            code: 'MISSING_EMAIL'
          } 
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user by email
    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'User not found',
            code: AUTH_ERRORS.USER_NOT_FOUND
          } 
        },
        { status: 404 }
      );
    }

    // Check if user is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Email is already verified',
            code: 'EMAIL_ALREADY_VERIFIED'
          } 
        },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimitStatus = EmailService.getRateLimitStatus(email);
    if (rateLimitStatus.isLimited) {
      const remainingMinutes = Math.ceil((rateLimitStatus.remainingTime || 0) / (1000 * 60));
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: `Too many verification emails sent. Please wait ${remainingMinutes} minutes before requesting another.`,
            code: AUTH_ERRORS.RATE_LIMIT_EXCEEDED
          },
          rateLimited: true,
          remainingTime: rateLimitStatus.remainingTime
        },
        { status: 429 }
      );
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    const emailResult = await EmailService.sendVerificationEmail({
      email: user.email,
      name: user.name,
      verificationToken
    });

    if (!emailResult.success) {
      if (emailResult.rateLimited) {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              message: emailResult.error,
              code: AUTH_ERRORS.RATE_LIMIT_EXCEEDED
            },
            rateLimited: true
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: emailResult.error || 'Failed to send verification email',
            code: 'EMAIL_SEND_FAILED'
          } 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
      data: {
        email: user.email,
        rateLimitStatus: EmailService.getRateLimitStatus(email)
      }
    });

  } catch (error) {
    console.error('Send verification email error:', error);
    
    if (error instanceof AuthError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: error.message,
            code: error.code
          } 
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        } 
      },
      { status: 500 }
    );
  }
}