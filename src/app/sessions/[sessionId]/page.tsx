/**
 * Session detail page with dark mode support
 * @filepath src/app/sessions/[sessionId]/page.tsx
 */

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ImageUploadZone } from '@/components/upload/image-upload-zone';
import { ImageGrid } from '@/components/sessions/image-grid';
import { SessionHeader } from '@/components/sessions/session-header';
import { useSessionStore } from '@/stores/session-store';
import { Loader2 } from 'lucide-react';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const { 
    currentSession, 
    currentImages, 
    loading, 
    error, 
    selectSession 
  } = useSessionStore();
  
  useEffect(() => {
    selectSession(sessionId);
  }, [sessionId, selectSession]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }
  
  if (error || !currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error || 'Session not found'}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <SessionHeader session={currentSession} />
        
        <div className="mt-8 space-y-8">
          <ImageUploadZone sessionId={sessionId} />
          
          <div>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              Images ({currentImages.length})
            </h2>
            <ImageGrid images={currentImages} />
          </div>
        </div>
      </main>
    </div>
  );
}