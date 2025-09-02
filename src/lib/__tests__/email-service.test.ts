import { EmailService } from '../email-service';

// Mock Resend for testing
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({
        data: { id: 'test-email-id' },
        error: null
      })
    }
  }))
}));

describe('EmailService', () => {
  beforeEach(() => {
    // Clear rate limiting between tests
    EmailService.clearRateLimit('test@example.com');
    
    // Set required environment variables
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    const testData = {
      email: 'test@example.com',
      name: 'Test User',
      verificationToken: 'test-token-123'
    };

    it('should send verification email successfully', async () => {
      const result = await EmailService.sendVerificationEmail(testData);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should enforce rate limiting', async () => {
      // Send maximum allowed emails
      for (let i = 0; i < 3; i++) {
        await EmailService.sendVerificationEmail(testData);
      }

      // Fourth attempt should be rate limited
      const result = await EmailService.sendVerificationEmail(testData);
      
      expect(result.success).toBe(false);
      expect(result.rateLimited).toBe(true);
      expect(result.error).toContain('Too many verification emails sent');
    });

    it('should handle missing environment variables', async () => {
      delete process.env.RESEND_API_KEY;
      
      const result = await EmailService.sendVerificationEmail(testData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('RESEND_API_KEY environment variable is not set');
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return correct rate limit status for new email', () => {
      const status = EmailService.getRateLimitStatus('new@example.com');
      
      expect(status.isLimited).toBe(false);
      expect(status.maxAttempts).toBe(3);
      expect(status.attemptsUsed).toBeUndefined();
    });

    it('should track attempts correctly', async () => {
      const email = 'tracking@example.com';
      
      // Send one email
      await EmailService.sendVerificationEmail({
        email,
        name: 'Test User',
        verificationToken: 'token'
      });

      const status = EmailService.getRateLimitStatus(email);
      
      expect(status.isLimited).toBe(false);
      expect(status.attemptsUsed).toBe(1);
      expect(status.maxAttempts).toBe(3);
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit for email', async () => {
      const email = 'clear@example.com';
      
      // Send maximum emails to trigger rate limit
      for (let i = 0; i < 3; i++) {
        await EmailService.sendVerificationEmail({
          email,
          name: 'Test User',
          verificationToken: 'token'
        });
      }

      // Verify rate limited
      let status = EmailService.getRateLimitStatus(email);
      expect(status.isLimited).toBe(true);

      // Clear rate limit
      EmailService.clearRateLimit(email);

      // Verify rate limit cleared
      status = EmailService.getRateLimitStatus(email);
      expect(status.isLimited).toBe(false);
    });
  });
});