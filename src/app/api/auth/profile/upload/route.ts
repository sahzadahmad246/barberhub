import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { cloudinaryService } from '@/lib/cloudinary-service';
import {  
  createSuccessResponse, 
  withErrorHandling,
  validateMethod
} from '@/lib/api-middleware';
import { AuthError, HTTP_STATUS } from '@/lib/errors';
import { validateFileUpload } from '@/lib/validation';

/**
 * POST /api/auth/profile/upload
 * Upload and update user profile picture
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthError(
      'Authentication required',
      HTTP_STATUS.UNAUTHORIZED,
      'UNAUTHORIZED'
    );
  }

  // Parse form data
  const formData = await request.formData();
  const file = formData.get('profilePicture') as File;

  if (!file) {
    throw new AuthError(
      'Profile picture file is required',
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR',
      'profilePicture'
    );
  }

  // Validate file using comprehensive validation
  validateFileUpload(file, 5); // 5MB limit

  // Get current user to check for existing profile picture
  const User = (await import('@/app/models/User')).default;
  const currentUser = await User.findById(session.user.id);

  if (!currentUser) {
    // If not found in User collection, check PendingUser collection
    const { default: PendingUser } = await import('@/app/models/PendingUser');
    const pendingUser = await PendingUser.findById(session.user.id);
    
    if (!pendingUser) {
      throw new AuthError(
        'User not found',
        HTTP_STATUS.NOT_FOUND,
        'USER_NOT_FOUND'
      );
    }
    
    // For pending users, we can't upload profile pictures yet
    // They need to verify their email first
    throw new AuthError(
      'Please verify your email address before uploading a profile picture',
      HTTP_STATUS.FORBIDDEN,
      'EMAIL_NOT_VERIFIED'
    );
  }

  // Upload to Cloudinary
  const uploadResult = await cloudinaryService.uploadProfilePicture(file, session.user.id);

  // Delete old profile picture if it exists and is from Cloudinary
  if (currentUser.profilePicture?.publicId) {
    try {
      await cloudinaryService.deleteImage(currentUser.profilePicture.publicId);
    } catch (deleteError) {
      console.warn('Failed to delete old profile picture:', deleteError);
      // Continue with update even if deletion fails
    }
  }

  // Update user profile picture
  const updatedUser = await User.findByIdAndUpdate(
    session.user.id,
    {
      profilePicture: {
        url: uploadResult.url,
        publicId: uploadResult.publicId
      },
      updatedAt: new Date()
    },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw new AuthError(
      'Failed to update user profile',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'UPDATE_FAILED'
    );
  }

  return createSuccessResponse(
    {
      profilePicture: updatedUser.profilePicture
    },
    'Profile picture updated successfully'
  );
});

/**
 * DELETE /api/auth/profile/upload
 * Remove user profile picture
 */
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['DELETE'])(request);
  if (methodError) throw methodError;

  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthError(
      'Authentication required',
      HTTP_STATUS.UNAUTHORIZED,
      'UNAUTHORIZED'
    );
  }

  // Get current user
  const User = (await import('@/app/models/User')).default;
  const currentUser = await User.findById(session.user.id);

  if (!currentUser) {
    throw new AuthError(
      'User not found',
      HTTP_STATUS.NOT_FOUND,
      'USER_NOT_FOUND'
    );
  }

  if (!currentUser.profilePicture) {
    throw new AuthError(
      'No profile picture to remove',
      HTTP_STATUS.BAD_REQUEST,
      'NO_PROFILE_PICTURE'
    );
  }

  // Delete from Cloudinary if it exists
  if (currentUser.profilePicture.publicId) {
    try {
      await cloudinaryService.deleteImage(currentUser.profilePicture.publicId);
    } catch (deleteError) {
      console.warn('Failed to delete profile picture from Cloudinary:', deleteError);
      // Continue with update even if deletion fails
    }
  }

  // Remove profile picture from user
  const updatedUser = await User.findByIdAndUpdate(
    session.user.id,
    {
      $unset: { profilePicture: 1 },
      updatedAt: new Date()
    },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw new AuthError(
      'Failed to update user profile',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'UPDATE_FAILED'
    );
  }

  return createSuccessResponse(
    { profilePicture: null },
    'Profile picture removed successfully'
  );
});

