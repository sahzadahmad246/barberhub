import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PaymentService } from '@/lib/payment-service';
import connectDB from '@/lib/database';
import Subscription from '@/app/models/Subscription';
import {
  withErrorHandling,
  createSuccessResponse,
  validateMethod
} from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * POST /api/subscriptions/sync
 * Manually sync subscription status with Razorpay
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

  try {
    await connectDB();

    // Find user's subscription
    const subscription = await Subscription.findOne({ 
      userId: session.user.id,
      razorpaySubscriptionId: { $exists: true }
    });

    if (!subscription) {
      throw new Error('No Razorpay subscription found');
    }

    // Sync with Razorpay
    await PaymentService.syncSubscriptionWithRazorpay(subscription);

    // Get updated subscription
    const updatedSubscription = await Subscription.findById(subscription._id);

    if (!updatedSubscription) {
      throw new Error('Subscription not found after sync');
    }

    return createSuccessResponse(
      {
        subscription: {
          id: updatedSubscription._id,
          status: updatedSubscription.status,
          plan: updatedSubscription.plan,
          razorpaySubscriptionId: updatedSubscription.razorpaySubscriptionId
        }
      },
      'Subscription synced successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error('Error syncing subscription:', error);
    throw new Error('Failed to sync subscription');
  }
});
