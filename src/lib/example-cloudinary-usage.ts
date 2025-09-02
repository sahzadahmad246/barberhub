/**
 * Example usage of Cloudinary service in API routes
 * This file demonstrates how to integrate the Cloudinary service with Next.js API routes
 */

import { NextRequest, } from 'next/server';
import { cloudinaryService } from './cloudinary-service';
import { extractFileFromRequest, validateProfilePictureFile } from './upload-utils';
import { createErrorResponse, createSuccessResponse, withErrorHandling } from './api-middleware';

/**
 * Example API route handler for profile picture upload
 * This would typically be placed in: src/app/api/auth/profile/upload/route.ts
 */
export const handleProfilePictureUpload = withErrorHandling(async (request: NextRequest) => {
  // Extract file from request
  const file = await extractFileFromRequest(request);
  
  // Validate file
  validateProfilePictureFile(file);
  
  // Get user ID (this would typically come from authentication middleware)
  const userId = 'user123'; // Replace with actual user ID from session/token
  
  // Upload to Cloudinary
  const result = await cloudinaryService.uploadProfilePicture(file, userId);
  
  return createSuccessResponse({
    message: 'Profile picture uploaded successfully',
    data: {
      url: result.url,
      publicId: result.publicId,
      dimensions: {
        width: result.width,
        height: result.height,
      },
      format: result.format,
      size: result.bytes,
    },
  });
});

/**
 * Example API route handler for profile picture update
 * This would handle both upload of new image and deletion of old one
 */
export const handleProfilePictureUpdate = withErrorHandling(async (request: NextRequest) => {
  // Extract file from request
  const file = await extractFileFromRequest(request);
  
  // Validate file
  validateProfilePictureFile(file);
  
  // Get user ID and old public ID (from database or request)
  const userId = 'user123'; // Replace with actual user ID
  const oldPublicId = 'barberhub/profile-pictures/user123_old'; // Replace with actual old public ID
  
  // Update profile picture (uploads new and deletes old)
  const result = await cloudinaryService.updateProfilePicture(file, userId, oldPublicId);
  
  return createSuccessResponse({
    message: 'Profile picture updated successfully',
    data: {
      url: result.url,
      publicId: result.publicId,
      dimensions: {
        width: result.width,
        height: result.height,
      },
      format: result.format,
      size: result.bytes,
    },
  });
});

/**
 * Example API route handler for profile picture deletion
 */
export const handleProfilePictureDeletion = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const publicId = searchParams.get('publicId');
  
  if (!publicId) {
    return createErrorResponse('Public ID is required', 400);
  }
  
  // Delete from Cloudinary
  const success = await cloudinaryService.deleteImage(publicId);
  
  if (!success) {
    return createErrorResponse('Failed to delete image', 500);
  }
  
  return createSuccessResponse({
    message: 'Profile picture deleted successfully',
  });
});

/**
 * Example of generating optimized URLs for different use cases
 */
export function getOptimizedImageUrls(publicId: string) {
  return {
    thumbnail: cloudinaryService.getOptimizedProfileUrl(publicId, 'small'),
    medium: cloudinaryService.getOptimizedProfileUrl(publicId, 'medium'),
    large: cloudinaryService.getOptimizedProfileUrl(publicId, 'large'),
    custom: cloudinaryService.generateTransformationUrl(publicId, {
      width: 150,
      height: 150,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      format: 'webp',
      radius: 'max', // Makes it circular
    }),
  };
}

/**
 * Example client-side usage for file validation before upload
 */
export function validateFileOnClient(file: File): { isValid: boolean; error?: string } {
  try {
    validateProfilePictureFile(file);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid file',
    };
  }
}

/**
 * Example of how to handle file upload in a React component
 */
export const exampleClientUpload = `
// Example React component usage
import { useState } from 'react';

function ProfilePictureUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file on client side first
    const validation = validateFileOnClient(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/auth/profile/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      console.log('Upload successful:', result.data);
      // Update UI with new profile picture
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
`;