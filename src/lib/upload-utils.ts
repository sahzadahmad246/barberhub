import { NextRequest } from 'next/server';
import { AuthError, AUTH_ERRORS } from './auth-errors';

/**
 * Extracts file from FormData in API routes
 */
export async function extractFileFromRequest(request: NextRequest): Promise<File> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new AuthError(
        'No file provided',
        400,
        AUTH_ERRORS.VALIDATION_ERROR
      );
    }
    
    return file;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    
    throw new AuthError(
      'Invalid request format. Expected multipart/form-data with file field.',
      400,
      AUTH_ERRORS.VALIDATION_ERROR
    );
  }
}

/**
 * Validates file size and type for profile pictures
 */
export function validateProfilePictureFile(file: File): void {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  // Check file size
  if (file.size > MAX_SIZE) {
    throw new AuthError(
      'File size too large. Maximum allowed size is 5MB',
      400,
      AUTH_ERRORS.FILE_TOO_LARGE
    );
  }
  
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AuthError(
      'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      400,
      AUTH_ERRORS.INVALID_FILE_TYPE
    );
  }
  
  // Additional validation for file name extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ['.jpg', '.jpeg', '.png', '.webp'].some(ext => 
    fileName.endsWith(ext)
  );
  
  if (!hasValidExtension) {
    throw new AuthError(
      'Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are allowed',
      400,
      AUTH_ERRORS.INVALID_FILE_TYPE
    );
  }
}

/**
 * Creates a safe filename for uploads
 */
export function createSafeFilename(originalName: string, userId: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  
  return `${userId}_${timestamp}_${randomString}.${extension}`;
}

/**
 * Converts file to buffer for processing
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Gets file metadata
 */
export function getFileMetadata(file: File) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Checks if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Gets image dimensions (for client-side use)
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}