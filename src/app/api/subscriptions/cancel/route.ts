import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
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
 * POST /api/subscriptions/cancel
 * Cancel user's subscription
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

  // Parse request body (optional)
  let cancelAtCycleEnd = false;
  try {
    const bodyError = validateRequestBody(request);
    if (!bodyError) {
      const body = await parseRequestBody<{ cancelAtCycleEnd?: boolean }>(request);
      cancelAtCycleEnd = body.cancelAtCycleEnd || false;
    }
  } catch {
    // If no body or invalid JSON, use default value
    cancelAtCycleEnd = false;
  }

  // Cancel subscription
  const result = await PaymentService.cancelSubscription(session.user.id, cancelAtCycleEnd || false);

  return createSuccessResponse(
    result,
    result.message,
    HTTP_STATUS.OK
  );
});
