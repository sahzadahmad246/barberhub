import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PaymentService } from '@/lib/payment-service';
import {
  withErrorHandling,
  createSuccessResponse,
  parseRequestBody,
  validateMethod,
  validateRequestBody
} from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';
// import crypto from 'crypto';

/**
 * POST /api/payments/verify
 * Verify Razorpay payment and activate subscription
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Validate request body content type
  const bodyError = validateRequestBody(request);
  if (bodyError) throw bodyError;

  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Parse request body - support both order and subscription verification
  const body = await parseRequestBody<{
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    razorpay_subscription_id?: string;
  }>(request);

  // Handle subscription verification
  if (body.razorpay_subscription_id) {
    // For subscriptions, we don't need to verify signature here as webhooks handle it
    const result = await PaymentService.activateSubscriptionBySubscriptionId(
      session.user.id,
      body.razorpay_subscription_id
    );
    
    return createSuccessResponse(
      result,
      'Subscription activated successfully',
      HTTP_STATUS.OK
    );
  }

  // Handle order verification (legacy support)
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    throw new Error('Payment verification data is required');
  }

  // Verify payment signature
  const isSignatureValid = PaymentService.verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isSignatureValid) {
    throw new Error('Invalid payment signature');
  }

  // Activate subscription
  const result = await PaymentService.activateSubscription(
    session.user.id,
    razorpay_order_id,
    razorpay_payment_id
  );

  return createSuccessResponse(
    result,
    'Payment verified and subscription activated successfully',
    HTTP_STATUS.OK
  );
});
