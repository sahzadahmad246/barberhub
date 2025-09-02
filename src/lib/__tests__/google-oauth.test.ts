import { AuthService } from '../auth-service';
import User from '@/app/models/User';
import connectDB from '../database';
import type { GoogleAuthData } from '@/types/auth';

// Mock the database connection
jest.mock('../database');
jest.mock('@/app/models/User');

describe('Google OAuth Integration', () => {
  const mockGoogleData: GoogleAuthData = {
    googleId: 'google123',
    name: 'John Doe',
    email: 'john.doe@gmail.com',
    profilePicture: 'https://lh3.googleusercontent.com/a/profile.jpg',
    provider: 'google'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('googleAuth', () => {
    it('should create new user for Google authentication', async () => {
      // Mock database connection
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      // Mock User.findOne to return null (user doesn't exist)
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock User constructor and save
      const mockUser = {
        _id: 'user123',
        name: mockGoogleData.name,
        email: mockGoogleData.email,
        provider: 'google',
        googleId: mockGoogleData.googleId,
        emailVerified: true,
        role: 'user',
        profilePicture: {
          url: mockGoogleData.profilePicture,
          publicId: ''
        },
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          name: mockGoogleData.name,
          email: mockGoogleData.email,
          provider: 'google',
          googleId: mockGoogleData.googleId,
          emailVerified: true,
          role: 'user'
        })
      };
      
      (User as unknown as jest.Mock).mockImplementation(() => mockUser);

      const result = await AuthService.googleAuth(mockGoogleData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.message).toBe('Google authentication successful');
      
      // Verify user was created with correct data
      expect(User).toHaveBeenCalledWith({
        name: mockGoogleData.name,
        email: mockGoogleData.email,
        provider: 'google',
        googleId: mockGoogleData.googleId,
        emailVerified: true,
        role: 'user',
        profilePicture: {
          url: mockGoogleData.profilePicture,
          publicId: ''
        }
      });
      
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should update existing email user to Google provider', async () => {
      // Mock database connection
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      // Mock existing user with email provider
      const existingUser = {
        _id: 'user123',
        name: 'John Doe',
        email: mockGoogleData.email,
        provider: 'email',
        emailVerified: false,
        role: 'user',
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          name: 'John Doe',
          email: mockGoogleData.email,
          provider: 'google',
          googleId: mockGoogleData.googleId,
          emailVerified: true,
          role: 'user'
        })
      };
      
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      const result = await AuthService.googleAuth(mockGoogleData);

      expect(result.success).toBe(true);
      expect(existingUser.provider).toBe('google');
      expect(existingUser.googleId).toBe(mockGoogleData.googleId);
      expect(existingUser.emailVerified).toBe(true);
      expect(existingUser.profilePicture).toEqual({
        url: mockGoogleData.profilePicture,
        publicId: ''
      });
      expect(existingUser.save).toHaveBeenCalled();
    });

    it('should handle existing Google user', async () => {
      // Mock database connection
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      // Mock existing Google user
      const existingGoogleUser = {
        _id: 'user123',
        name: mockGoogleData.name,
        email: mockGoogleData.email,
        provider: 'google',
        googleId: mockGoogleData.googleId,
        emailVerified: true,
        role: 'user',
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          name: mockGoogleData.name,
          email: mockGoogleData.email,
          provider: 'google',
          googleId: mockGoogleData.googleId,
          emailVerified: true,
          role: 'user'
        })
      };
      
      (User.findOne as jest.Mock).mockResolvedValue(existingGoogleUser);

      const result = await AuthService.googleAuth(mockGoogleData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      
      // Should not call save since user already has Google provider
      expect(existingGoogleUser.save).not.toHaveBeenCalled();
    });

    it('should set email verification to true for Google users', async () => {
      // Mock database connection
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      // Mock User.findOne to return null (new user)
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock User constructor
      const mockUser = {
        _id: 'user123',
        emailVerified: true, // This should be set to true
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          emailVerified: true
        })
      };
      
      (User as unknown as jest.Mock).mockImplementation(() => mockUser);

      await AuthService.googleAuth(mockGoogleData);

      // Verify that emailVerified is set to true in the constructor call
      expect(User).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerified: true
        })
      );
    });
  });

  describe('findOrCreateGoogleUser', () => {
    const googleUserData = {
      googleId: 'google123',
      name: 'John Doe',
      email: 'john.doe@gmail.com',
      profilePicture: 'https://lh3.googleusercontent.com/a/profile.jpg'
    };

    it('should create new user when none exists', async () => {
      // Mock database connection
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      // Mock User.findOne to return null for both queries
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock User constructor and save
      const mockUser = {
        save: jest.fn().mockResolvedValue(undefined)
      };
      
      (User as unknown as jest.Mock).mockImplementation(() => mockUser);

      const result = await AuthService.findOrCreateGoogleUser(googleUserData);

      expect(result).toBe(mockUser);
      expect(User).toHaveBeenCalledWith({
        name: googleUserData.name,
        email: googleUserData.email,
        provider: 'google',
        googleId: googleUserData.googleId,
        emailVerified: true,
        role: 'user',
        profilePicture: {
          url: googleUserData.profilePicture,
          publicId: ''
        }
      });
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should return existing Google user', async () => {
      // Mock database connection
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      // Mock existing Google user
      const existingUser = {
        _id: 'user123',
        googleId: googleUserData.googleId,
        provider: 'google'
      };
      
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      const result = await AuthService.findOrCreateGoogleUser(googleUserData);

      expect(result).toBe(existingUser);
      expect(User.findOne).toHaveBeenCalledWith({ googleId: googleUserData.googleId });
    });
  });
});