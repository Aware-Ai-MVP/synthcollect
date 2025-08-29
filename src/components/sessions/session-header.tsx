/**
 * ENHANCED SESSION HEADER WITH REAL-TIME EXPORT PROGRESS
 * Shows progress dialog during exports with live updates
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
import { ArrowLeft, Download, Archive, FileJson, FolderArchive, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ExportProgressDialog } from './export-progress-dialog';

interface SessionHeaderProps {
  session: Session;
}

export function SessionHeader({ session }: SessionHeaderProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'json' | 'full'>('json');
  const [quickExporting, setQuickExporting] = useState(false);
  
  // Handle export with progress dialog (for full exports or user preference)
  const handleExportWithProgress = async (mode: 'json' | 'full') => {
    console.log(`🚀 Starting ${mode} export with progress tracking`);
    
    setExportMode(mode);
    setExportDialogOpen(true);
    
    toast.info(`Starting ${mode === 'json' ? 'JSON' : 'full ZIP'} export...`);
  };

  // Handle quick export without progress (for JSON exports only)
  const handleQuickExport = async (mode: 'json') => {
    if (mode !== 'json') {
      // Full exports should always show progress
      return handleExportWithProgress(mode);
    }

    console.log(`⚡ Quick ${mode} export`);
    setQuickExporting(true);
    
    try {
      const response = await fetch(`/api/sessions/${session.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const filename = session.name.replace(/\s+/g, '_') + '_export.json';
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setQuickExporting(false);
    }
  };

  // Determine whether to show progress dialog based on export type and image count
  const shouldShowProgress = (mode: 'json' | 'full'): boolean => {
    // Always show progress for full exports (with images)
    if (mode === 'full') return true;
    
    // Show progress for JSON exports with many images (>50)
    if (mode === 'json' && session.image_count > 50) return true;
    
    return false;
  };

  const handleExport = (mode: 'json' | 'full') => {
    if (shouldShowProgress(mode)) {
      handleExportWithProgress(mode);
    } else {
      handleQuickExport(mode as 'json'); // Only JSON can be quick export
    }
  };
  
  return (
    <>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={quickExporting || exportDialogOpen} 
                  className="cursor-pointer"
                >
                  {quickExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
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
                  <div className="ml-auto flex flex-col items-end">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Metadata only</span>
                    {!shouldShowProgress('json') && (
                      <span className="text-xs text-green-600 dark:text-green-400">⚡ Quick</span>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleExport('full')}
                  className="cursor-pointer dark:hover:bg-gray-700"
                  disabled={session.image_count === 0}
                >
                  <FolderArchive className="h-4 w-4 mr-2" />
                  Full Export
                  <div className="ml-auto flex flex-col items-end">
                    <span className="text-xs text-gray-500 dark:text-gray-400">ZIP with images</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">📊 With Progress</span>
                  </div>
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

      {/* Export Progress Dialog */}
      <ExportProgressDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        sessionId={session.id}
        exportMode={exportMode}
        sessionName={session.name}
      />
    </>
  );
}