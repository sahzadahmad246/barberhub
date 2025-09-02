import { v2 as cloudinary } from 'cloudinary';
import { AuthError, AUTH_ERRORS } from './auth-errors';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Missing Cloudinary configuration. Please check your environment variables.');
}

export interface CloudinaryResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface UploadOptions {
  folder?: string;
  transformation?: object;
  allowedFormats?: string[];
  maxFileSize?: number; // in bytes
}

class CloudinaryService {
  private readonly DEFAULT_FOLDER = 'barberhub/profile-pictures';
  private readonly ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
  private readonly PROFILE_TRANSFORMATION = {
    width: 400,
    height: 400,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'webp'
  };

  /**
   * Validates file before upload
   */
  private validateFile(file: File, options?: UploadOptions): void {
    const allowedFormats = options?.allowedFormats || this.ALLOWED_FORMATS;
    const maxSize = options?.maxFileSize || this.MAX_FILE_SIZE;

    // Check file size
    if (file.size > maxSize) {
      throw new AuthError(
        `File size too large. Maximum allowed size is ${Math.round(maxSize / (1024 * 1024))}MB`,
        400,
        AUTH_ERRORS.UPLOAD_FAILED
      );
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedFormats.includes(fileExtension)) {
      throw new AuthError(
        `Invalid file format. Allowed formats: ${allowedFormats.join(', ')}`,
        400,
        AUTH_ERRORS.UPLOAD_FAILED
      );
    }

    // Check MIME type
    const allowedMimeTypes = allowedFormats.map(format => {
      if (format === 'jpg') return 'image/jpeg';
      return `image/${format}`;
    });

    if (!allowedMimeTypes.includes(file.type)) {
      throw new AuthError(
        'Invalid file type. Please upload a valid image file.',
        400,
        AUTH_ERRORS.UPLOAD_FAILED
      );
    }
  }

  /**
   * Converts File to base64 data URL for Cloudinary upload (server-safe)
   */
  private async fileToDataUrl(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mime = file.type || 'image/png';
    return `data:${mime};base64,${base64}`;
  }

  /**
   * Uploads a profile picture to Cloudinary
   */
  async uploadProfilePicture(file: File, userId: string): Promise<CloudinaryResult> {
    try {
      // Validate the file
      this.validateFile(file);

      // Convert file to data URL
      const dataUrl = await this.fileToDataUrl(file);

      // Generate unique public ID
      const publicId = `${this.DEFAULT_FOLDER}/${userId}_${Date.now()}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataUrl, {
        public_id: publicId,
        transformation: this.PROFILE_TRANSFORMATION,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      console.error('Cloudinary upload error:', error);
      throw new AuthError(
        'Failed to upload image. Please try again.',
        500,
        AUTH_ERRORS.UPLOAD_FAILED
      );
    }
  }

  /**
   * Deletes an image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      // Don't throw error for delete failures, just log and return false
      return false;
    }
  }

  /**
   * Updates profile picture (uploads new and deletes old)
   */
  async updateProfilePicture(
    file: File, 
    userId: string, 
    oldPublicId?: string
  ): Promise<CloudinaryResult> {
    try {
      // Upload new image first
      const uploadResult = await this.uploadProfilePicture(file, userId);

      // Delete old image if it exists
      if (oldPublicId) {
        await this.deleteImage(oldPublicId);
      }

      return uploadResult;
    } catch (error) {
      // If upload fails, don't delete the old image
      throw error;
    }
  }

  /**
   * Generates a transformation URL for existing image
   */
  generateTransformationUrl(publicId: string, transformation: object): string {
    return cloudinary.url(publicId, {
      ...transformation,
      secure: true,
    });
  }

  /**
   * Gets optimized URL for profile picture display
   */
  getOptimizedProfileUrl(publicId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    const sizeMap = {
      small: { width: 100, height: 100 },
      medium: { width: 200, height: 200 },
      large: { width: 400, height: 400 },
    };

    return this.generateTransformationUrl(publicId, {
      ...sizeMap[size],
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      format: 'webp',
    });
  }
}

// Export singleton instance
export const cloudinaryService = new CloudinaryService();
export default cloudinaryService;