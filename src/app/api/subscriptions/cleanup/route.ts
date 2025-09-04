import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import Subscription from '@/app/models/Subscription';
import {
  withErrorHandling,
  createSuccessResponse,
  validateMethod
} from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * POST /api/subscriptions/cleanup
 * Clean up invalid subscriptions for the current user
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

  await connectDB();

  // Find and delete invalid subscriptions
  const invalidSubscriptions = await Subscription.find({
    userId: session.user.id,
    $or: [
      { plan: { $exists: false } },
      { plan: null },
      { plan: '' },
      { status: { $exists: false } },
      { status: null },
      { status: '' }
    ]
  });

  if (invalidSubscriptions.length > 0) {
    await Subscription.deleteMany({
      userId: session.user.id,
      $or: [
        { plan: { $exists: false } },
        { plan: null },
        { plan: '' },
        { status: { $exists: false } },
        { status: null },
        { status: '' }
      ]
    });

    return createSuccessResponse(
      { cleaned: invalidSubscriptions.length },
      `Cleaned up ${invalidSubscriptions.length} invalid subscription(s)`,
      HTTP_STATUS.OK
    );
  }

  return createSuccessResponse(
    { cleaned: 0 },
    'No invalid subscriptions found',
    HTTP_STATUS.OK
  );
});
