/**
 * Client-side session provider wrapper
 * @filepath src/components/providers/session-provider.tsx
 */

'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}