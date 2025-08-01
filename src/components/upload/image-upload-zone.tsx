/**
 * Fixed upload zone with proper Select handling
 * @filepath src/components/upload/image-upload-zone.tsx
 */

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { AIScoringFields } from '@/components/shared/ai-scoring-fields';
import { toast } from 'sonner';
import { formatBytes } from '@/lib/utils';

interface ImageUploadZoneProps {
  sessionId: string;
}

interface UploadFile {
  file: File;
  preview: string;
  metadata: {
    prompt: string;
    generator_used: string;
    user_description?: string;
    tags: string[];
    quality_rating?: number;
    notes?: string;
    ai_scores: Record<string, number>;
  };
  manualFields: string[];
}

export function ImageUploadZone({ sessionId }: ImageUploadZoneProps) {
  const refreshSession = useSessionStore(state => state.refreshCurrentSession);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      metadata: {
        prompt: '',
        generator_used: 'midjourney' as const,
        tags: [],
        ai_scores: {},
        quality_rating: undefined, // Explicitly undefined for unrated
      },
      manualFields: [],
    }));
    
    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });
  
  const removeFile = (index: number) => {
    setUploadFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };
  
  const updateMetadata = (index: number, field: string, value: any) => {
    setUploadFiles(prev => {
      const newFiles = [...prev];
      newFiles[index].metadata = {
        ...newFiles[index].metadata,
        [field]: value,
      };
      return newFiles;
    });
  };
  
  const updateAIScores = useCallback((index: number, scores: Record<string, number>, manualFields: string[]) => {
    setUploadFiles(prev => {
      const newFiles = [...prev];
      newFiles[index].metadata.ai_scores = scores;
      newFiles[index].manualFields = manualFields;
      return newFiles;
    });
  }, []);
  
  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    
    // Validate all files have prompts
    const invalidFiles = uploadFiles.filter(f => !f.metadata.prompt.trim());
    if (invalidFiles.length > 0) {
      toast.error('All images must have prompts');
      return;
    }
    
    setUploading(true);
    let successCount = 0;
    
    for (const uploadFile of uploadFiles) {
      try {
        // Clean up metadata before sending
        const cleanMetadata = {
          ...uploadFile.metadata,
          quality_rating: uploadFile.metadata.quality_rating || undefined,
        };
        
        const formData = new FormData();
        formData.append('file', uploadFile.file);
        formData.append('metadata', JSON.stringify(cleanMetadata));
        
        const response = await fetch(`/api/sessions/${sessionId}/images`, {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (data.success) {
          successCount++;
        } else {
          toast.error(`Failed to upload ${uploadFile.file.name}: ${data.error}`);
        }
      } catch (error) {
        toast.error(`Failed to upload ${uploadFile.file.name}`);
      }
    }
    
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} image${successCount > 1 ? 's' : ''}`);
      setUploadFiles([]);
      await refreshSession();
    }
    
    setUploading(false);
  };
  
  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-8">
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
              {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              or click to select files (JPG, PNG, WebP up to 10MB)
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Upload Queue */}
      {uploadFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold dark:text-white">
              Upload Queue ({uploadFiles.length} image{uploadFiles.length > 1 ? 's' : ''})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="cursor-pointer"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
              {showAdvanced ? 'Hide' : 'Show'} AI Scoring
            </Button>
          </div>
          
          {uploadFiles.map((uploadFile, index) => (
            <Card key={index} className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Preview */}
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <img
                      src={uploadFile.preview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 cursor-pointer transition-colors"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Metadata Form */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{uploadFile.file.name}</span>
                      <span>{formatBytes(uploadFile.file.size)}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label htmlFor={`prompt-${index}`} className="dark:text-gray-200">
                          AI Prompt <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id={`prompt-${index}`}
                          value={uploadFile.metadata.prompt}
                          onChange={(e) => updateMetadata(index, 'prompt', e.target.value)}
                          placeholder="Enter the prompt used to generate this image..."
                          rows={2}
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder:text-gray-400"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`generator-${index}`} className="dark:text-gray-200">
                          AI Generator
                        </Label>
                        <Select
                          value={uploadFile.metadata.generator_used}
                          onValueChange={(value) => updateMetadata(index, 'generator_used', value)}
                        >
                          <SelectTrigger id={`generator-${index}`} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                            <SelectItem value="midjourney">Midjourney</SelectItem>
                            <SelectItem value="dalle">DALL-E</SelectItem>
                            <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor={`quality-${index}`} className="dark:text-gray-200">
                          Quality Rating <span className="text-xs text-gray-500">(Optional)</span>
                        </Label>
                        <Select
                          value={uploadFile.metadata.quality_rating?.toString() || 'unrated'}
                          onValueChange={(value) => updateMetadata(index, 'quality_rating', value === 'unrated' ? undefined : parseInt(value))}
                        >
                          <SelectTrigger id={`quality-${index}`} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer">
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                            <SelectItem value="unrated">Not rated</SelectItem>
                            <SelectItem value="5">5 - Excellent</SelectItem>
                            <SelectItem value="4">4 - Good</SelectItem>
                            <SelectItem value="3">3 - Average</SelectItem>
                            <SelectItem value="2">2 - Below Average</SelectItem>
                            <SelectItem value="1">1 - Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* AI Scoring Fields */}
                    {showAdvanced && (
                      <div className="mt-4">
                        <AIScoringFields
                          mode="upload"
                          initialScores={{}}
                          onChange={(scores, manualFields) => updateAIScores(index, scores, manualFields)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setUploadFiles([])}
              disabled={uploading}
              className="cursor-pointer"
            >
              Clear All
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || uploadFiles.length === 0}
              className="cursor-pointer"
            >
              {uploading ? 'Uploading...' : `Upload ${uploadFiles.length} Image${uploadFiles.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}