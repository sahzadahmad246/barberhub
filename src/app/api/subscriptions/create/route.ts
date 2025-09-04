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

/**
 * POST /api/subscriptions/create
 * Create a Razorpay order for subscription payment
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

  // Parse request body
  const { plan, billingCycle } = await parseRequestBody<{ 
    plan: 'pro' | 'pro_plus'; 
    billingCycle: 'monthly' | 'yearly' 
  }>(request);

  if (!plan || !billingCycle) {
    throw new Error('Plan and billing cycle are required');
  }

  if (!['pro', 'pro_plus'].includes(plan)) {
    throw new Error('Invalid plan');
  }

  if (!['monthly', 'yearly'].includes(billingCycle)) {
    throw new Error('Invalid billing cycle');
  }

  // Create Razorpay order for subscription payment
  const result = await PaymentService.createSubscription(session.user.id, plan, billingCycle);

  return createSuccessResponse(
    result,
    'Payment order created successfully',
    HTTP_STATUS.CREATED
  );
});
