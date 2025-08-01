/**
 * Session card with dark mode support
 * @filepath src/components/sessions/session-card.tsx
 */

import { Session } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Image, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    exported: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  };
  
  return (
    <Card className="hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg dark:text-white">{session.name}</CardTitle>
            <CardDescription className="mt-1 dark:text-gray-400">
              {session.description || 'No description'}
            </CardDescription>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[session.status]}`}>
            {session.status}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span>{session.image_count} images</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Created {format(new Date(session.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <div className="mt-4">
          <Link href={`/sessions/${session.id}`}>
            <Button className="w-full" variant="outline">
              Open Session
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}