/**
 * REAL-TIME EXPORT PROGRESS DIALOG
 * Shows live progress updates using Server-Sent Events
 * @filepath src/components/sessions/export-progress-dialog.tsx
 */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Download,
  X,
  Clock,
  ImageIcon,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ExportProgressData } from '@/lib/utils/progress-store';

interface ExportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  exportMode: 'json' | 'full';
  sessionName: string;
}

export function ExportProgressDialog({
  open,
  onOpenChange,
  sessionId,
  exportMode,
  sessionName,
}: ExportProgressDialogProps) {
  const [progress, setProgress] = useState<ExportProgressData | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Start export and SSE connection
  useEffect(() => {
    if (!open || !sessionId) return;

    console.log(`🚀 Starting export progress tracking for ${sessionId}`);
    
    // Reset state
    setProgress(null);
    setIsComplete(false);
    setDownloadUrl(null);
    
    // Start export operation
    startExport();
    
    // Start SSE connection for progress updates
    startProgressTracking();

    return () => {
      cleanupConnections();
    };
  }, [open, sessionId, exportMode]);

  const startExport = async () => {
    try {
      abortControllerRef.current = new AbortController();
      
      console.log(`📦 Initiating ${exportMode} export`);
      
      const response = await fetch(`/api/sessions/${sessionId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: exportMode }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      console.log('✅ Export completed successfully');
      
      // Create download URL
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setIsComplete(true);

      // Auto-download for better UX
      const filename = sessionName.replace(/\s+/g, '_') + 
        (exportMode === 'json' ? '_export.json' : '_full_export.zip');
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success(`Export completed! Downloaded ${filename}`);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 Export cancelled by user');
        toast.info('Export cancelled');
        return;
      }

      console.error('❌ Export failed:', error);
      setProgress(prev => prev ? {
        ...prev,
        status: 'error',
        error: error.message,
        message: 'Export failed',
      } : null);

      toast.error('Export failed: ' + error.message);
    }
  };

  const startProgressTracking = () => {
    const eventSource = new EventSource(`/api/sessions/${sessionId}/export-progress`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('📡 SSE connection established');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('📡 SSE connected for session:', data.sessionId);
          return;
        }

        if (data.type === 'progress') {
          console.log(`📊 Progress update: ${data.percentage}%`);
          setProgress(data);
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse SSE data:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      eventSource.close();
    };
  };

  const cleanupConnections = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
  };

  const handleCancel = () => {
    cleanupConnections();
    onOpenChange(false);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const getStatusIcon = () => {
    if (!progress) return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    
    switch (progress.status) {
      case 'starting':
      case 'validating':
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  const getStatusMessage = (): string => {
    if (!progress) return 'Initializing export...';
    return progress.message || 'Processing...';
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-md dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            {exportMode === 'json' ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
            Exporting {sessionName}
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            {exportMode === 'json' ? 'Metadata only' : 'Full ZIP with images'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Header */}
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="font-medium dark:text-white">
                {getStatusMessage()}
              </p>
              {progress?.currentImage && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {progress.currentImage}
                </p>
              )}
            </div>
            <Badge variant={progress?.status === 'error' ? 'destructive' : 'secondary'}>
              {progress?.status || 'starting'}
            </Badge>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="space-y-2">
              <Progress 
                value={progress.percentage} 
                className="h-2"
              />
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {progress.processedImages} / {progress.totalImages} images
                  {progress.failedImages > 0 && (
                    <span className="text-orange-500 ml-2">
                      ({progress.failedImages} failed)
                    </span>
                  )}
                </span>
                <span>{progress.percentage}%</span>
              </div>
            </div>
          )}

          {/* Time Estimate */}
          {progress?.estimatedTimeRemaining && progress.status === 'processing' && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>~{formatTime(progress.estimatedTimeRemaining)} remaining</span>
            </div>
          )}

          {/* Error Message */}
          {progress?.status === 'error' && progress.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-400 text-sm font-medium">
                Export Failed
              </p>
              <p className="text-red-600 dark:text-red-500 text-sm mt-1">
                {progress.error}
              </p>
            </div>
          )}

          {/* Success Message */}
          {isComplete && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                Export Completed Successfully!
              </p>
              <p className="text-green-600 dark:text-green-500 text-sm mt-1">
                Your file has been automatically downloaded.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          {!isComplete && progress?.status !== 'error' && (
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          
          {isComplete && downloadUrl && (
            <Button asChild>
              <a href={downloadUrl} download>
                <Download className="h-4 w-4 mr-2" />
                Download Again
              </a>
            </Button>
          )}
          
          {(isComplete || progress?.status === 'error') && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}