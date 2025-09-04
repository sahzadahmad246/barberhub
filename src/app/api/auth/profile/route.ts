import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/auth-service';
import {  
  createSuccessResponse, 
  withErrorHandling,
  parseRequestBody,
  validateMethod,
  validateRequestBody
} from '@/lib/api-middleware';
import { AuthError } from '@/lib/errors';
import { validateProfileUpdateForm, validateAndSanitize } from '@/lib/validation';

/**
 * GET /api/auth/profile
 * Fetch user profile data
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['GET'])(request);
  if (methodError) throw methodError;
  // Check authentication
  const session = await getServerSession(authOptions) as { user?: { id?: string } } | null;
  
  if (!session?.user?.id) {
    throw new AuthError(
      'Authentication required',
      401,
      'UNAUTHORIZED'
    );
  }

  // Fetch user profile - check both User and PendingUser collections
  let profileData;
  
  try {
    // First try to find in User collection
    const user = await getUserById(session.user.id);
    
    // User exists in User collection
    profileData = {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      emailVerified: user.emailVerified,
      role: user.role,
      salonId: user.salonId,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch {
    // If not found in User collection, check PendingUser collection
    const { default: PendingUser } = await import('@/app/models/PendingUser');
    const pendingUser = await PendingUser.findById(session.user.id);
    
    if (!pendingUser) {
      throw new AuthError(
        'User not found',
        404,
        'USER_NOT_FOUND'
      );
    }
    
    // Create profile data for pending users
    profileData = {
      id: pendingUser._id,
      name: pendingUser.name,
      email: pendingUser.email,
      profilePicture: undefined,
      emailVerified: false,
      role: 'user',
      salonId: undefined,
      provider: 'email',
      createdAt: pendingUser.createdAt,
      updatedAt: pendingUser.updatedAt
    };
  }

  return createSuccessResponse(
    profileData,
    'Profile retrieved successfully'
  );
});

/**
 * PUT /api/auth/profile
 * Update user profile data
 */
export const PUT = withErrorHandling(async (request: NextRequest) => {
  // Validate request method and content type
  const methodError = validateMethod(['PUT'])(request);
  if (methodError) throw methodError;
  
  const bodyError = validateRequestBody(request);
  if (bodyError) throw bodyError;
  // Check authentication
  const session = await getServerSession(authOptions) as { user?: { id?: string } } | null;
  
  if (!session?.user?.id) {
    throw new AuthError(
      'Authentication required',
      401,
      'UNAUTHORIZED'
    );
  }

  // Parse, validate, and sanitize request body
  const rawBody = await parseRequestBody<{
    name?: string;
    email?: string;
  }>(request);

  const body = validateAndSanitize(rawBody, validateProfileUpdateForm);

  // Update user profile
  const updatedUser = await updateUserProfile(session.user.id, {
    ...(body.name && { name: body.name }),
    ...(body.email && { email: body.email.toLowerCase() })
  });

  if (!updatedUser) {
    throw new AuthError(
      'User not found',
      404,
      'USER_NOT_FOUND'
    );
  }

  // Return updated profile data
  const profileData = {
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    profilePicture: updatedUser.profilePicture,
    emailVerified: updatedUser.emailVerified,
    role: updatedUser.role,
    salonId: updatedUser.salonId,
    provider: updatedUser.provider,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt
  };

  return createSuccessResponse(
    profileData,
    'Profile updated successfully'
  );
});

// Helper function to update user profile
async function updateUserProfile(userId: string, updates: { name?: string; email?: string }) {
  const User = (await import('@/app/models/User')).default;
  
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...updates,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    return updatedUser;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new AuthError(
        'An account with this email address already exists',
        409,
        'DUPLICATE_RESOURCE',
        'email'
      );
    }
    throw error;
  }
}