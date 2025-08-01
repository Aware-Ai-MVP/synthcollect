/**
 * NextAuth v5 configuration - simplified for compatibility
 * @filepath src/lib/auth/config.ts
 */

import type { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// User store interface
interface StoredUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

// Simple in-memory store for MVP
const users = new Map<string, StoredUser>();

// Initialize test user with hashed password
users.set('test@example.com', {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  password: bcrypt.hashSync('testpass123', 10),
});

export const authOptions: NextAuthOptions = {
  // Configure providers
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'test@example.com' 
        },
        password: { 
          label: 'Password', 
          type: 'password',
          placeholder: '••••••••'
        },
      },
      async authorize(credentials): Promise<User | null> {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }
          
          const user = users.get(credentials.email);
          if (!user) {
            return null;
          }
          
          const isValidPassword = await bcrypt.compare(
            credentials.password, 
            user.password
          );
          
          if (!isValidPassword) {
            return null;
          }
          
          // Return user without password
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  
  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // JWT configuration
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Pages
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // Redirect errors to signin
  },
  
  // Callbacks
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  
  // Security
  secret: process.env.NEXTAUTH_SECRET,
  
  // Debug in development
  debug: false, // Set to true for debugging
};

// Helper functions remain the same
export async function registerUser(
  email: string, 
  password: string, 
  name: string
): Promise<Omit<StoredUser, 'password'>> {
  if (users.has(email)) {
    throw new Error('User already exists');
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = `user_${Date.now()}`;
  
  const newUser: StoredUser = {
    id,
    email,
    name,
    password: hashedPassword,
  };
  
  users.set(email, newUser);
  
  // Return without password
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

export function getUserByEmail(email: string): StoredUser | undefined {
  return users.get(email);
}

export function getAllUsers(): Array<Omit<StoredUser, 'password'>> {
  return Array.from(users.values()).map(({ password, ...user }) => user);
}