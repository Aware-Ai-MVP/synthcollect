/**
 * Client-side layout wrapper to ensure providers are loaded
 * @filepath src/components/layout/client-layout.tsx
 */

'use client';

import { ReactNode } from 'react';

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return <>{children}</>;
}