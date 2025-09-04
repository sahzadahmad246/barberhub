import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import Salon from '@/app/models/Salon';
import {
  withErrorHandling,
  createSuccessResponse,
  validateMethod
} from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * GET /api/salon/dashboard
 * Get salon dashboard data for the authenticated user
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

  try {
    await connectDB();

    // Find salon owned by the user
    const salon = await Salon.findOne({ ownerId: session.user.id });

    if (!salon) {
      throw new Error('Salon not found');
    }

    return createSuccessResponse(
      {
        salon: {
          id: salon._id,
          name: salon.name,
          slug: salon.slug,
          address: salon.address,
          contact: salon.contact,
          isVerified: salon.isVerified,
          isActive: salon.isActive,
          stats: salon.stats
        }
      },
      'Salon dashboard data retrieved successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error('Error fetching salon dashboard:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch salon dashboard');
  }
});
