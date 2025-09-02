# Email Service Documentation

## Overview

The Email Service provides email verification functionality for the Barber Hub authentication system. It integrates with Resend API to send professional email verification emails with built-in rate limiting.

## Features

- ✅ **Email Verification**: Send HTML and plain text verification emails
- ✅ **Rate Limiting**: Prevent spam with configurable rate limits (3 emails per hour per email address)
- ✅ **Professional Templates**: Responsive HTML email templates with Barber Hub branding
- ✅ **Error Handling**: Comprehensive error handling with specific error codes
- ✅ **Environment Configuration**: Configurable via environment variables

## Configuration

### Environment Variables

```bash
# Required
RESEND_API_KEY=your-resend-api-key
NEXTAUTH_URL=http://localhost:3000

# Optional (defaults shown)
# Rate limiting is handled in-memory (use Redis in production)
```

### Rate Limiting Configuration

- **Window**: 1 hour (3,600,000 ms)
- **Max Emails**: 3 per email address per window
- **Storage**: In-memory Map (consider Redis for production)

## Usage

### Basic Email Sending

```typescript
import { EmailService } from '@/lib/email-service';

const result = await EmailService.sendVerificationEmail({
  email: 'user@example.com',
  name: 'John Doe',
  verificationToken: 'secure-token-123'
});

if (result.success) {
  console.log('Email sent successfully!');
} else {
  console.error('Failed to send email:', result.error);
  if (result.rateLimited) {
    console.log('Rate limited - too many emails sent');
  }
}
```

### Check Rate Limit Status

```typescript
const status = EmailService.getRateLimitStatus('user@example.com');

console.log({
  isLimited: status.isLimited,
  attemptsUsed: status.attemptsUsed,
  maxAttempts: status.maxAttempts,
  remainingTime: status.remainingTime // ms until reset
});
```

### Clear Rate Limit (Admin/Testing)

```typescript
EmailService.clearRateLimit('user@example.com');
```

## API Integration

### Send Verification Email Endpoint

```
POST /api/auth/send-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": {
    "email": "user@example.com",
    "rateLimitStatus": {
      "isLimited": false,
      "attemptsUsed": 1,
      "maxAttempts": 3
    }
  }
}
```

**Response (Rate Limited):**
```json
{
  "success": false,
  "error": {
    "message": "Too many verification emails sent. Please wait 45 minutes before requesting another.",
    "code": "RATE_LIMIT_EXCEEDED"
  },
  "rateLimited": true,
  "remainingTime": 2700000
}
```

## Email Template

The service generates professional HTML emails with:

- **Responsive Design**: Works on desktop and mobile
- **Barber Hub Branding**: Consistent with application design
- **Clear Call-to-Action**: Prominent verification button
- **Security Information**: Token expiration and security warnings
- **Fallback Text**: Plain text version for all email clients

### Template Features

- Verification link with token
- 24-hour expiration notice
- Security warnings
- Professional styling
- Fallback plain text version

## Error Handling

### Error Types

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `RATE_LIMIT_EXCEEDED` | Too many emails sent | 429 |
| `USER_NOT_FOUND` | Email address not found | 404 |
| `EMAIL_ALREADY_VERIFIED` | Email already verified | 400 |
| `EMAIL_SEND_FAILED` | Resend API error | 500 |
| `MISSING_EMAIL` | Email parameter missing | 400 |

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
  };
  rateLimited?: boolean;
  remainingTime?: number; // For rate limit errors
}
```

## Testing

### Development Test Endpoint

```
POST /api/test/email
Content-Type: application/json

{
  "email": "test@example.com",
  "name": "Test User"
}
```

### Manual Testing

```typescript
import { testEmailService } from '@/lib/test-email-service';

// Run comprehensive tests
await testEmailService();
```

## Production Considerations

### Rate Limiting Storage

For production, consider using Redis instead of in-memory storage:

```typescript
// Example Redis integration
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Store rate limit data in Redis with TTL
await redis.setex(`rate_limit:${email}`, 3600, JSON.stringify(rateData));
```

### Monitoring

- Monitor email delivery rates
- Track rate limiting events
- Log failed email attempts
- Monitor Resend API usage

### Security

- Validate email addresses
- Sanitize user input
- Use secure tokens
- Implement proper CORS
- Rate limit API endpoints

## Integration with Auth System

The email service integrates seamlessly with the authentication system:

1. **Registration**: Automatically sends verification email
2. **Resend**: Manual verification email requests
3. **Verification**: Token validation and user update

```typescript
// In AuthService.register()
const verificationToken = user.generateEmailVerificationToken();
await user.save();

const emailResult = await EmailService.sendVerificationEmail({
  email: user.email,
  name: user.name,
  verificationToken
});
```

## Troubleshooting

### Common Issues

1. **"RESEND_API_KEY environment variable is not set"**
   - Ensure `.env.local` has the correct Resend API key

2. **"Failed to send verification email"**
   - Check Resend API status
   - Verify API key permissions
   - Check email address format

3. **Rate limiting too aggressive**
   - Adjust `MAX_EMAILS_PER_HOUR` constant
   - Clear rate limits for testing: `EmailService.clearRateLimit(email)`

4. **Emails not received**
   - Check spam folder
   - Verify sender domain configuration in Resend
   - Test with different email providers

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=email-service
```