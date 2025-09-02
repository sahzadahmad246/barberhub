# Implementation Plan

- [ ] 1. Install required dependencies and setup project configuration
  - Install NextAuth.js, bcryptjs, jsonwebtoken, resend, cloudinary, and their TypeScript types
  - Configure environment variables in .env.local
  - Update next.config.ts for image domains and API configurations
  - _Requirements: 9.3, 9.4_

- [x] 2. Create User model and database utilities
  - Implement User schema with Mongoose including all required fields and validations
  - Create database connection utility with proper error handling
  - Add indexes for email, emailVerificationToken, googleId, and salonId fields
  - _Requirements: 2.2, 2.4, 2.5, 3.3, 3.5, 8.1, 8.2, 8.3_

- [x] 3. Implement centralized error handling system
  - Create AuthError class and error constants
  - Implement API response interfaces (ErrorResponse, SuccessResponse)
  - Create error handling middleware for API routes
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 4. Create authentication service layer


  - Implement password hashing utilities using bcrypt
  - Create JWT token generation and validation functions
  - Implement email verification token generation
  - Create authentication service with register, login, and verify methods
  - _Requirements: 2.1, 2.3, 4.1, 4.2, 5.1, 5.2_

- [x] 5. Implement email service integration





  - Create email service using Resend API
  - Implement email verification template and sending functionality
  - Add rate limiting for email verification requests
  - _Requirements: 2.3, 5.1, 5.3_

- [x] 6. Create Cloudinary upload service





  - Implement Cloudinary configuration and connection
  - Create profile picture upload functionality with validation
  - Implement image deletion when updating profile pictures
  - Add file type and size validation
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Build authentication API routes





  - Create POST /api/auth/register route with validation and user creation
  - Create POST /api/auth/login route with credential validation
  - Create GET /api/auth/verify-email route for email verification
  - Create POST /api/auth/logout route for session cleanup
  - _Requirements: 2.1, 2.2, 2.6, 4.1, 4.2, 4.4, 5.2_

- [x] 8. Implement Google OAuth integration





  - Configure Google OAuth provider with NextAuth.js
  - Create Google OAuth callback handling
  - Implement user creation/update for Google authentication
  - Set email verification to true by default for Google users
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 9. Create profile management API routes






  - Create GET /api/auth/profile route to fetch user profile data
  - Create PUT /api/auth/profile route for profile updates
  - Create POST /api/auth/profile/upload route for profile picture upload
  - Implement proper authentication middleware for protected routes
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

- [x] 10. Build navigation component with authentication state





  - Create responsive navigation bar component with Barber Hub branding
  - Add navigation items for Home, Pricing, and Contact
  - Implement conditional rendering for login button vs user profile
  - Create user dropdown with profile picture, name, email, and logout
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 11. Create registration page with dual authentication options



  - Build registration form with name, email, and password fields
  - Add form validation with proper error handling
  - Implement "Continue with Google" button and OAuth flow
  - Add success messaging and redirect logic after registration
  - _Requirements: 2.1, 2.6, 3.1_

- [x] 12. Create login page with authentication options






  - Build login form with email and password fields
  - Add form validation and error display
  - Implement "Continue with Google" button for OAuth login
  - Add email verification prompt for unverified users
  - Handle successful login with redirect to dashboard/profile
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 13. Build email verification page and flow
  - Create email verification page that handles token validation
  - Implement success and error states for verification
  - Add resend verification email functionality
  - Handle expired token scenarios with new email request
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 14. Create user profile page





  - Build profile page displaying user information (name, email, profile picture)
  - Show email verification status with appropriate indicators
  - Display user role and salon association if applicable
  - Implement profile picture upload with preview functionality
  - Add form for updating user information
  - _Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 15. Implement authentication context and session management





  - Create React context for authentication state management
  - Implement session persistence and restoration on app load
  - Add authentication guards for protected routes
  - Handle token refresh and automatic logout on expiration
  - _Requirements: 9.5_

- [x] 16. Add comprehensive error handling and validation





  - Implement client-side form validation with proper error messages
  - Add server-side validation for all API endpoints
  - Create user-friendly error messages for common scenarios
  - Implement proper TypeScript types throughout the application
  - _Requirements: 2.6, 4.3, 6.4, 9.1, 9.2_

- [x] 17. Create authentication middleware and route protection





  - Implement middleware to protect authenticated routes
  - Add role-based access control foundation
  - Create higher-order components for route protection
  - Implement automatic redirects for unauthenticated users
  - _Requirements: 8.4, 8.5_

- [ ] 18. Write comprehensive tests for authentication system
  - Create unit tests for User model validation and methods
  - Write tests for authentication service functions
  - Implement API route testing for all authentication endpoints
  - Create component tests for authentication forms and navigation
  - Add integration tests for complete authentication flows
  - _Requirements: 9.1, 9.2, 9.3, 9.4_