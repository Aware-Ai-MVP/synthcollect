/**
 * NextAuth v4 middleware - stable version
 * @filepath src/middleware.ts
 */

export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico|test).*)',
  ],
};