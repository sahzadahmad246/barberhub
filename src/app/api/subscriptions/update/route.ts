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
 * PATCH /api/subscriptions/update
 * Update subscription (plan, quantity, etc.)
 */
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['PATCH'])(request);
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
  const updateData = await parseRequestBody<{
    plan_id?: string;
    quantity?: number;
    remaining_count?: number;
    schedule_change_at?: 'now' | 'cycle_end';
    customer_notify?: boolean;
  }>(request);

  // Update subscription
  const result = await PaymentService.updateSubscription(session.user.id, updateData);

  return createSuccessResponse(
    result,
    result.message,
    HTTP_STATUS.OK
  );
});
