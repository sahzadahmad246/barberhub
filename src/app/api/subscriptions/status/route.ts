import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PaymentService } from '@/lib/payment-service';
import {
  withErrorHandling,
  createSuccessResponse,
  validateMethod
} from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * GET /api/subscriptions/status
 * Get subscription status for current user
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['GET'])(request);
  if (methodError) throw methodError;

  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Get subscription status
  const subscription = await PaymentService.getSubscriptionStatus(session.user.id);

  return createSuccessResponse(
    subscription,
    'Subscription status retrieved successfully',
    HTTP_STATUS.OK
  );
});
