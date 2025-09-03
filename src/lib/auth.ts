import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from './database';
import User from '@/app/models/User';
import { AuthService } from './auth-service';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        //
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          const result = await AuthService.login({
            email: credentials.email.toLowerCase(),
            password: credentials.password
          });

          //

          if (result.success && result.user) {
            // Return user object that will be stored in the JWT
            return {
              id: String(result.user._id),
              email: result.user.email,
              name: result.user.name,
              image: result.user.profilePicture?.url || null,
              role: result.user.role,
              emailVerified: result.user.emailVerified,
              provider: result.user.provider,
              salonId: result.user.salonId?.toString()
            };
          }

          return null;
        } catch (error) {
          // Pass specific error messages to the client
          const message = (error as { message?: string })?.message || '';
          
          if (message.includes('not verified') || message.includes('verify your email')) {
            throw new Error('EMAIL_NOT_VERIFIED');
          } else if (message.includes('Invalid email or password') || message.includes('Incorrect email or password')) {
            throw new Error('INVALID_CREDENTIALS');
          } else if (message.includes('not found')) {
            throw new Error('USER_NOT_FOUND');
          } else if (message.includes('Google sign-in')) {
            throw new Error('USE_GOOGLE_SIGNIN');
          }
          
          throw new Error('Authentication failed');
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          await connectDB();
          
          // Check if user already exists with this email
          const existingUser = await User.findOne({ email: user.email });
          
          if (existingUser) {
            // Link Google to existing email account without changing provider
            if (!existingUser.googleId) {
              existingUser.googleId = account.providerAccountId;
              existingUser.emailVerified = true;
              
              // If user has password, update provider to 'both'
              if (existingUser.password) {
                existingUser.provider = 'both';
              }
            }
            // Update Google user's profile picture if changed
            if (user.image && existingUser.profilePicture?.url !== user.image) {
              existingUser.profilePicture = {
                url: user.image,
                publicId: ''
              };
            }
            await existingUser.save();
          } else {
            // Create new user for Google authentication
            const newUser = new User({
              name: user.name || profile?.name || 'Google User',
              email: user.email,
              provider: 'google',
              googleId: account.providerAccountId,
              emailVerified: true, // Google users are automatically verified
              role: 'user',
              profilePicture: user.image ? {
                url: user.image,
                publicId: '' // Google images don't have Cloudinary public IDs
              } : undefined
            });
            
            await newUser.save();
            try {
              const { EmailService } = await import('./email-service');
              await EmailService.sendWelcomeEmail({ email: newUser.email, name: newUser.name });
            } catch  {}
          }
          
          return true;
        } catch (error) {
          console.error('Error during Google sign-in:', error);
          return false;
        }
      }
      
      return true;
    },
    
    async session({ session, }) {
      if (session.user?.email) {
        try {
          await connectDB();
          const user = await User.findOne({ email: session.user.email });
          
          if (user) {
            session.user.id = String(user._id);
            session.user.role = user.role;
            session.user.emailVerified = user.emailVerified;
            session.user.provider = user.provider;
            session.user.salonId = user.salonId?.toString();
            
            // Update session with latest profile picture
            if (user.profilePicture?.url) {
              session.user.image = user.profilePicture.url;
            }
          }
        } catch (error) {
          console.error('Error fetching user in session callback:', error);
        }
      }
      
      return session;
    },
    
    async jwt({ token, user, account,  }) {
      // Initial sign in
      if (account?.provider === 'google' && user) {
        token.provider = 'google';
        token.googleId = account.providerAccountId;
        token.emailVerified = true; // Google users are always verified
      }
      
      // Return previous token if the access token has not expired yet
      return token;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 24 * 60 * 60, // 60 days (approx 2 months)
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
};