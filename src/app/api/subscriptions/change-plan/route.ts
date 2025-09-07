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
 * POST /api/subscriptions/change-plan
 * Change subscription plan (upgrade/downgrade)
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

  // Check if user has an active subscription (not cancelled)
  const subscriptionStatus = await PaymentService.getSubscriptionStatus(session.user.id);
  
  if (!subscriptionStatus.hasSubscription) {
    throw new Error('No active subscription found');
  }
  
  if (subscriptionStatus.subscription?.status === 'cancelled') {
    throw new Error('Cannot change plan for cancelled subscription. Please start a new subscription.');
  }
  
  if (!subscriptionStatus.subscription || !['active', 'authenticated', 'created'].includes(subscriptionStatus.subscription.status)) {
    throw new Error('Subscription must be active to change plan');
  }

  // Change subscription plan
  const result = await PaymentService.changeSubscriptionPlan(session.user.id, plan, billingCycle);

  return createSuccessResponse(
    result,
    'Subscription plan changed successfully',
    HTTP_STATUS.OK
  );
});
