/**
 * Enhanced session card with edit/delete actions
 * @filepath src/components/sessions/session-card.tsx
 */

import { useState } from 'react';
import { Session } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Image, ArrowRight, MoreVertical, Edit, Trash, Archive } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { SessionEditDialog } from './session-edit-dialog';
import { useSessionStore } from '@/stores/session-store';

interface SessionCardProps {
  session: Session;
  onUpdate?: () => void;
}

export function SessionCard({ session, onUpdate }: SessionCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fetchSessions = useSessionStore(state => state.fetchSessions);
  
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    exported: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  };
  
  const handleDelete = async () => {
  setDeleting(true);
  
  try {
    // First try to delete without images
    let response = await fetch(`/api/sessions/${session.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteImages: false }),
    });
    
    const data = await response.json();
    
    // If session has images, ask user what to do
    if (!response.ok && data.error === 'Session contains images') {
      const confirmDeleteAll = confirm(
        `This session contains ${data.data.imageCount} images.\n\n` +
        `Do you want to delete the session AND all its images?\n\n` +
        `Click OK to delete everything, or Cancel to keep the session.`
      );
      
      if (!confirmDeleteAll) {
        setDeleting(false);
        return;
      }
      
      // Try again with deleteImages flag
      response = await fetch(`/api/sessions/${session.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteImages: true }),
      });
      
      const deleteData = await response.json();
      if (!response.ok) {
        throw new Error(deleteData.error || 'Failed to delete session');
      }
    } else if (!response.ok) {
      throw new Error(data.error || 'Failed to delete session');
    }
    
    toast.success('Session deleted successfully');
    
    // Refresh the sessions list
    if (onUpdate) {
      onUpdate();
    } else {
      await fetchSessions();
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to delete session');
  } finally {
    setDeleting(false);
  }
};
  
  const handleArchive = async () => {
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive session');
      }
      
      toast.success('Session archived successfully');
      
      if (onUpdate) {
        onUpdate();
      } else {
        await fetchSessions();
      }
    } catch (error) {
      toast.error('Failed to archive session');
    }
  };
  
  return (
    <>
      <Card className="hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700 group">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg dark:text-white pr-2">{session.name}</CardTitle>
              <CardDescription className="mt-1 dark:text-gray-400">
                {session.description || 'No description'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[session.status]}`}>
                {session.status}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    disabled={deleting}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                  <DropdownMenuItem 
                    onClick={() => setEditOpen(true)}
                    className="cursor-pointer dark:hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  {session.status === 'active' && (
                    <DropdownMenuItem 
                      onClick={handleArchive}
                      className="cursor-pointer dark:hover:bg-gray-700"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Session
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="dark:bg-gray-700" />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer dark:hover:bg-gray-700"
                    disabled={deleting}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Session
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
              <Button className="w-full cursor-pointer" variant="outline">
                Open Session
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      {editOpen && (
        <SessionEditDialog
          session={session}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={() => {
            if (onUpdate) {
              onUpdate();
            } else {
              fetchSessions();
            }
          }}
        />
      )}
    </>
  );
}