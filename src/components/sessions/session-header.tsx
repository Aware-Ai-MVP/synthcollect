/**
 * Session header with complete dark mode support
 * @filepath src/components/sessions/session-header.tsx
 */

import { useState } from 'react';
import { Session } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Download, Archive, FileJson, FolderArchive } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SessionHeaderProps {
  session: Session;
}

export function SessionHeader({ session }: SessionHeaderProps) {
  const [exporting, setExporting] = useState(false);
  
  const handleExport = async (mode: 'json' | 'full') => {
    setExporting(true);
    
    try {
      const response = await fetch(`/api/sessions/${session.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const contentType = response.headers.get('content-type');
      const isZip = contentType?.includes('application/zip');
      const filename = session.name.replace(/\s+/g, '_') + 
        (mode === 'json' ? '_export.json' : '_full_export.zip');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported as ${mode === 'json' ? 'JSON' : 'ZIP'}`);
    } catch (error) {
      toast.error('Export failed');
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sessions
              </Button>
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Created {format(new Date(session.created_at), 'MMM d, yyyy')}
            </span>
          </div>
          
          <h1 className="text-2xl font-bold dark:text-white">{session.name}</h1>
          {session.description && (
            <p className="text-gray-600 dark:text-gray-300 mt-2">{session.description}</p>
          )}
          
          <div className="flex items-center gap-4 mt-4">
            <div className="text-sm dark:text-gray-300">
              <span className="font-medium">{session.image_count}</span> images
            </div>
            <div className="text-sm dark:text-gray-300">
              Status: <span className="font-medium capitalize">{session.status}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting} className="cursor-pointer">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
              <DropdownMenuItem 
                onClick={() => handleExport('json')}
                className="cursor-pointer dark:hover:bg-gray-700"
              >
                <FileJson className="h-4 w-4 mr-2" />
                JSON Only
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">Metadata only</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExport('full')}
                className="cursor-pointer dark:hover:bg-gray-700"
              >
                <FolderArchive className="h-4 w-4 mr-2" />
                Full Export
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">ZIP with images</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" size="sm" disabled className="cursor-not-allowed">
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        </div>
      </div>
    </div>
  );
}