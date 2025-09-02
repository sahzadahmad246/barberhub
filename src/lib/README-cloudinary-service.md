# Cloudinary Upload Service

This service provides comprehensive image upload functionality for the Barber Hub application, specifically designed for profile picture management with Cloudinary integration.

## Features

- ✅ Profile picture upload with automatic optimization
- ✅ File validation (type, size, format)
- ✅ Image transformation and resizing
- ✅ Old image deletion when updating
- ✅ Multiple image size generation
- ✅ Error handling and validation
- ✅ TypeScript support

## Configuration

Ensure the following environment variables are set in your `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Usage

### Basic Upload

```typescript
import { cloudinaryService } from '@/lib/cloudinary-service';

// Upload a profile picture
const result = await cloudinaryService.uploadProfilePicture(file, userId);
console.log(result.url); // Optimized image URL
```

### Update Profile Picture

```typescript
// Updates profile picture and deletes the old one
const result = await cloudinaryService.updateProfilePicture(
  newFile, 
  userId, 
  oldPublicId
);
```

### Delete Image

```typescript
// Delete an image from Cloudinary
const success = await cloudinaryService.deleteImage(publicId);
```

### Generate Optimized URLs

```typescript
// Get different sizes of the same image
const thumbnailUrl = cloudinaryService.getOptimizedProfileUrl(publicId, 'small');
const mediumUrl = cloudinaryService.getOptimizedProfileUrl(publicId, 'medium');
const largeUrl = cloudinaryService.getOptimizedProfileUrl(publicId, 'large');

// Custom transformation
const customUrl = cloudinaryService.generateTransformationUrl(publicId, {
  width: 150,
  height: 150,
  crop: 'fill',
  gravity: 'face',
  quality: 'auto',
  format: 'webp',
  radius: 'max', // Circular image
});
```

## API Route Integration

### Upload Endpoint

```typescript
// src/app/api/auth/profile/upload/route.ts
import { NextRequest } from 'next/server';
import { cloudinaryService } from '@/lib/cloudinary-service';
import { extractFileFromRequest, validateProfilePictureFile } from '@/lib/upload-utils';
import { withErrorHandling, createSuccessResponse } from '@/lib/api-middleware';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const file = await extractFileFromRequest(request);
  validateProfilePictureFile(file);
  
  const userId = 'user123'; // Get from authentication
  const result = await cloudinaryService.uploadProfilePicture(file, userId);
  
  return createSuccessResponse({
    message: 'Profile picture uploaded successfully',
    data: result,
  });
});
```

## Client-Side Usage

### React Component Example

```tsx
import { useState } from 'react';
import { validateFileOnClient } from '@/lib/example-cloudinary-usage';

function ProfilePictureUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side validation
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

      // Handle successful upload
      console.log('Upload successful:', result.data);
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
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

## File Validation

The service includes comprehensive file validation:

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

### Validation Rules
- Maximum file size: 5MB
- Valid MIME types only
- File extension validation
- Image format verification

### Custom Validation

```typescript
import { validateProfilePictureFile } from '@/lib/upload-utils';

try {
  validateProfilePictureFile(file);
  // File is valid
} catch (error) {
  // Handle validation error
  console.error(error.message);
}
```

## Image Transformations

All uploaded images are automatically optimized with:

- **Size**: 400x400 pixels
- **Crop**: Fill with face detection
- **Quality**: Auto optimization
- **Format**: WebP for better compression
- **Overwrite**: Enabled for updates

## Error Handling

The service uses centralized error handling:

```typescript
import { AuthError, AUTH_ERRORS } from '@/lib/auth-errors';

try {
  const result = await cloudinaryService.uploadProfilePicture(file, userId);
} catch (error) {
  if (error instanceof AuthError) {
    switch (error.code) {
      case AUTH_ERRORS.FILE_TOO_LARGE:
        // Handle file size error
        break;
      case AUTH_ERRORS.INVALID_FILE_TYPE:
        // Handle file type error
        break;
      case AUTH_ERRORS.UPLOAD_FAILED:
        // Handle upload failure
        break;
    }
  }
}
```

## Testing

Run the test suite:

```bash
npm test src/lib/__tests__/cloudinary-service.test.ts
```

The test suite covers:
- File validation scenarios
- Upload functionality
- Image deletion
- Error handling
- URL generation

## Security Considerations

- File type validation prevents malicious uploads
- File size limits prevent abuse
- Automatic image optimization
- Secure URL generation
- Public ID obfuscation with timestamps

## Performance Optimizations

- Automatic WebP conversion for smaller file sizes
- Multiple image sizes for different use cases
- CDN delivery through Cloudinary
- Lazy loading support
- Optimized transformations

## Troubleshooting

### Common Issues

1. **Upload fails with "Missing Cloudinary configuration"**
   - Check environment variables are set correctly
   - Verify Cloudinary credentials

2. **File validation errors**
   - Ensure file is under 5MB
   - Check file format is supported
   - Verify MIME type matches extension

3. **Image not displaying**
   - Check the returned URL is accessible
   - Verify Cloudinary account has sufficient quota
   - Ensure proper CORS configuration

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

This will log detailed information about uploads and errors to the console.