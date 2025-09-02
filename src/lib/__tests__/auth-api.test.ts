import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { GET as verifyEmailGET } from '@/app/api/auth/verify-email/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import connectDB from '@/lib/database';
import User from '@/app/models/User';

// Mock the email service to prevent actual emails during tests
vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendVerificationEmail: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('Authentication API Routes', () => {
  beforeEach(async () => {
    await connectDB();
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const requestBody = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('test@example.com');
      expect(data.data.user.name).toBe('Test User');
      expect(data.data.token).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const requestBody = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'TestPassword123!'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Invalid email format');
    });

    it('should reject registration with weak password', async () => {
      const requestBody = {
        name: 'Test User',
        email: 'test2@example.com',
        password: '123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Password must be at least 8 characters');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const user = new User({
        name: 'Login Test User',
        email: 'logintest@example.com',
        password: 'TestPassword123!',
        provider: 'email',
        emailVerified: true
      });
      await user.save();
    });

    it('should login with valid credentials', async () => {
      const requestBody = {
        email: 'logintest@example.com',
        password: 'TestPassword123!'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('logintest@example.com');
      expect(data.data.token).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const requestBody = {
        email: 'logintest@example.com',
        password: 'WrongPassword123!'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('should reject verification without token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'GET'
      });

      const response = await verifyEmailGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Verification token is required');
    });

    it('should reject verification with invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email?token=invalid-token', {
        method: 'GET'
      });

      const response = await verifyEmailGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Invalid or expired verification token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST'
      });

      const response = await logoutPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.loggedOut).toBe(true);
    });

    it('should reject non-POST methods', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'GET'
      });

      const response = await logoutPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Method GET not allowed');
    });
  });
});