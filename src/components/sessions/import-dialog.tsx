/**
 * Simplified import dialog without streaming
 * @filepath src/components/sessions/import-dialog.tsx
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSessionStore } from '@/stores/session-store';
import { ImportOptions } from '@/lib/types/import';
import { Upload, FileJson, FileArchive, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function ImportDialog({ open, onOpenChange, onImportComplete }: ImportDialogProps) {
  const { sessions, fetchSessions } = useSessionStore();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [options, setOptions] = useState<ImportOptions>({
    mode: 'new',
    duplicateStrategy: 'skip',
    preserveIds: false,
  });
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'application/zip': ['.zip'],
    },
    multiple: false,
  });
  
  const handleImport = async () => {
    if (!file) return;
    
    if (options.mode === 'merge' && !options.targetSessionId) {
      toast.error('Please select a target session for merge');
      return;
    }
    
    setImporting(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(options));
      
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }
      
      setResult(data);
      
      if (data.success) {
        toast.success(`Successfully imported ${data.imported} images`);
        await fetchSessions();
        
        if (onImportComplete) {
          onImportComplete();
        }
        
        // Reset after success
        setTimeout(() => {
          setFile(null);
          setResult(null);
          setOptions({
            mode: 'new',
            duplicateStrategy: 'skip',
            preserveIds: false,
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      toast.error(errorMessage);
      setResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setImporting(false);
    }
  };
  
  const handleClose = () => {
    if (!importing) {
      onOpenChange(false);
      // Reset state
      setFile(null);
      setResult(null);
      setOptions({
        mode: 'new',
        duplicateStrategy: 'skip',
        preserveIds: false,
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Import Data</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Import sessions and images from a previous export
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Upload */}
          {!file && !importing && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-lg font-medium dark:text-gray-200">
                {isDragActive ? 'Drop the file here' : 'Drag & drop export file here'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Accepts JSON or ZIP files from export
              </p>
            </div>
          )}
          
          {/* File Info */}
          {file && !importing && !result && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {file.name.endsWith('.json') ? (
                  <FileJson className="h-8 w-8 text-blue-500" />
                ) : (
                  <FileArchive className="h-8 w-8 text-green-500" />
                )}
                <div>
                  <p className="font-medium dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
              >
                Remove
              </Button>
            </div>
          )}
          
          {/* Import Options */}
          {file && !importing && !result && (
            <div className="space-y-4">
              <div>
                <Label className="dark:text-gray-200 mb-3 block">Import Mode</Label>
                <RadioGroup
                  value={options.mode}
                  onValueChange={(value) => setOptions({ ...options, mode: value as 'new' | 'merge' })}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="font-normal cursor-pointer dark:text-gray-300">
                      Create new session
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge" className="font-normal cursor-pointer dark:text-gray-300">
                      Merge into existing session
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {options.mode === 'merge' && (
                <>
                  <div>
                    <Label htmlFor="target" className="dark:text-gray-200">Target Session</Label>
                    <Select
                      value={options.targetSessionId}
                      onValueChange={(value) => setOptions({ ...options, targetSessionId: value })}
                    >
                      <SelectTrigger id="target" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder="Select a session" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                        {sessions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.name} ({session.image_count} images)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="duplicates" className="dark:text-gray-200">Duplicate Handling</Label>
                    <Select
                      value={options.duplicateStrategy}
                      onValueChange={(value) => setOptions({ ...options, duplicateStrategy: value as any })}
                    >
                      <SelectTrigger id="duplicates" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                        <SelectItem value="skip">Skip duplicates</SelectItem>
                        <SelectItem value="replace">Replace existing</SelectItem>
                        <SelectItem value="rename">Import with new name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Importing State */}
          {importing && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-lg dark:text-gray-300">Importing...</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                This may take a moment for large files
              </p>
            </div>
          )}
          
          {/* Result */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.success ? (
                  <div>
                    <p>Successfully imported {result.imported} images.</p>
                    {result.skipped > 0 && <p className="mt-1">{result.skipped} images were skipped.</p>}
                  </div>
                ) : (
                  <div>
                    <p>{result.error || 'Import failed'}</p>
                    {result.errors && result.errors.length > 0 && (
                      <ul className="mt-2 text-sm list-disc list-inside">
                        {result.errors.slice(0, 3).map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                        {result.errors.length > 3 && (
                          <li>... and {result.errors.length - 3} more errors</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={importing}
          >
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || importing}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}