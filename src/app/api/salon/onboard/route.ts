import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import Salon from '@/app/models/Salon';
import Subscription from '@/app/models/Subscription';
import {
  withErrorHandling,
  createSuccessResponse,
  parseRequestBody,
  validateMethod,
  validateRequestBody
} from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * POST /api/salon/onboard
 * Create a new salon for the authenticated user
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
  const salonData = await parseRequestBody<{
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    };
    contact: {
      phone: string;
      email: string;
      whatsapp?: string;
    };
    businessHours: {
      [key: string]: {
        open: string;
        close: string;
        isOpen: boolean;
      };
    };
    description?: string;
    amenities?: string[];
  }>(request);

  // Validate required fields
  if (!salonData.name || !salonData.address.street || !salonData.address.city || 
      !salonData.address.state || !salonData.address.pincode || !salonData.contact.phone) {
    throw new Error('Missing required fields');
  }

  try {
    await connectDB();

    // Check if user already has a salon
    const existingSalon = await Salon.findOne({ ownerId: session.user.id });
    if (existingSalon) {
      throw new Error('User already has a salon');
    }

    // Get user's active subscription (include authenticated status)
    const subscription = await Subscription.findOne({ 
      userId: session.user.id, 
      status: { $in: ['active', 'authenticated', 'created'] }
    });

    // Debug: Log all subscriptions for this user
    const allSubscriptions = await Subscription.find({ userId: session.user.id });
    console.log('All subscriptions for user:', session.user.id, allSubscriptions);

    if (!subscription) {
      // Try to sync with Razorpay if we have a subscription ID
      const anySubscription = await Subscription.findOne({ userId: session.user.id });
      if (anySubscription && anySubscription.razorpaySubscriptionId) {
        try {
          const { PaymentService } = await import('@/lib/payment-service');
          await PaymentService.syncSubscriptionWithRazorpay(anySubscription);
          
          // Try again after sync
          const syncedSubscription = await Subscription.findOne({ 
            userId: session.user.id, 
            status: { $in: ['active', 'authenticated', 'created'] }
          });
          
          if (syncedSubscription) {
            console.log('Found subscription after sync:', syncedSubscription);
            return createSuccessResponse(
              { message: 'Subscription synced, please try again' },
              'Subscription synced successfully',
              HTTP_STATUS.OK
            );
          }
        } catch (syncError) {
          console.error('Error syncing subscription:', syncError);
        }
      }
      
      throw new Error('No active subscription found. Please ensure your payment was successful.');
    }

    // Generate slug from salon name
    const slug = salonData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Create salon
    const salon = new Salon({
      ownerId: session.user.id,
      name: salonData.name,
      slug: slug,
      address: salonData.address,
      contact: salonData.contact,
      businessHours: salonData.businessHours,
      description: salonData.description || '',
      amenities: salonData.amenities || [],
      isVerified: false,
      isActive: true,
      subscriptionId: String(subscription._id),
      settings: {
        allowOnlineBooking: true,
        allowQueueJoining: true,
        requireCustomerInfo: true,
        maxQueueSize: 50,
        autoAcceptBookings: false,
        sendNotifications: true
      },
      stats: {
        totalCustomers: 0,
        totalBookings: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0
      }
    });

    await salon.save();

    return createSuccessResponse(
      {
        salon: {
          id: salon._id,
          name: salon.name,
          slug: salon.slug,
          address: salon.address,
          contact: salon.contact,
          isVerified: salon.isVerified,
          isActive: salon.isActive
        }
      },
      'Salon created successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    console.error('Error creating salon:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create salon');
  }
});
