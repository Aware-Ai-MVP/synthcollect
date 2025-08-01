/**
 * NextAuth v5 route handler with proper exports
 * @filepath src/app/api/auth/[...nextauth]/route.ts
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/config';

const handler = NextAuth(authOptions);

// NextAuth v5 requires explicit method exports
export const GET = handler;
export const POST = handler;