/**
 * Main dashboard page with proper provider wrapping
 * @filepath src/app/page.tsx
 */

'use client';

import { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { SessionCard } from '@/components/sessions/session-card';
import { CreateSessionDialog } from '@/components/sessions/create-session-dialog';
import { useSessionStore } from '@/stores/session-store';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { sessions, loading, error, fetchSessions } = useSessionStore();
  
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold dark:text-white">Sessions</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your AI-generated image collections
            </p>
          </div>
          <CreateSessionDialog />
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No sessions yet</p>
            <CreateSessionDialog />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}