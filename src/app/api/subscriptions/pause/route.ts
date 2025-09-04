import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PaymentService } from '@/lib/payment-service';
import {
  withErrorHandling,
  createSuccessResponse,
  validateMethod
} from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * POST /api/subscriptions/pause
 * Pause user's subscription
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Pause subscription
  const result = await PaymentService.pauseSubscription(session.user.id);

  return createSuccessResponse(
    result,
    'Subscription paused successfully',
    HTTP_STATUS.OK
  );
});
