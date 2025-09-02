import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'user' | 'staff' | 'owner' | 'admin';
      emailVerified: boolean;
      provider: 'email' | 'google';
      salonId?: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: 'user' | 'staff' | 'owner' | 'admin';
    emailVerified?: boolean;
    provider?: 'email' | 'google';
    salonId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    provider?: 'email' | 'google';
    googleId?: string;
    role?: 'user' | 'staff' | 'owner' | 'admin';
    emailVerified?: boolean;
    salonId?: string;
  }
}