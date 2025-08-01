/**
 * Fixed edit dialog with proper Select handling
 * @filepath src/components/sessions/image-edit-dialog.tsx
 */

import { useState, useRef, useCallback } from 'react';
import { ImageRecord } from '@/lib/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIScoringFields } from '@/components/shared/ai-scoring-fields';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface ImageEditDialogProps {
  image: ImageRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function ImageEditDialog({ image, open, onOpenChange, onSave }: ImageEditDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    prompt: image.prompt,
    generator_used: image.generator_used,
    quality_rating: image.quality_rating,
    notes: image.notes || '',
    ai_scores: {},
  });
  
  const [manualFields, setManualFields] = useState<string[]>([]);
  
  const handleAIScoresChange = useCallback((scores: Record<string, number>, fields: string[]) => {
    setFormData(prev => ({ ...prev, ai_scores: scores }));
    setManualFields(fields);
  }, []);
  
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Clean up data before sending
      const dataToSend = {
        ...formData,
        quality_rating: formData.quality_rating || undefined,
      };
      
      const response = await fetch(`/api/images/${image.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update image');
      }
      
      toast.success('Image updated successfully');
      onSave();
    } catch (error) {
      toast.error('Failed to update image');
    } finally {
      setSaving(false);
    }
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Upload replacement
    setReplacing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/images/${image.id}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to replace image');
      }
      
      toast.success('Image replaced successfully');
      // Force reload the image
      const imgElements = document.querySelectorAll(`img[src*="${image.id}"]`);
      imgElements.forEach((img) => {
        (img as HTMLImageElement).src = `/api/images/${image.id}?t=${Date.now()}`;
      });
    } catch (error) {
      toast.error('Failed to replace image');
      setPreviewUrl(null);
    } finally {
      setReplacing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Edit Image Details</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Update the metadata for this image
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Image Preview with Replace Option */}
          <div className="space-y-2">
            <div className="flex justify-center relative group">
              <img
                src={previewUrl || `/api/images/${image.id}?t=${Date.now()}`}
                alt={image.original_filename}
                className="max-w-[300px] max-h-[300px] object-contain rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={replacing}
                  className="cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Replace Image
                </Button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {replacing && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Uploading replacement...
              </p>
            )}
          </div>
          
          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="prompt" className="dark:text-gray-200">AI Prompt</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                rows={3}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="generator" className="dark:text-gray-200">AI Generator</Label>
                <Select
                  value={formData.generator_used}
                  onValueChange={(value) => setFormData({ ...formData, generator_used: value as any })}
                >
                  <SelectTrigger id="generator" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer">
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
                <Label htmlFor="quality" className="dark:text-gray-200">Quality Rating</Label>
                <Select
                  value={formData.quality_rating?.toString() || 'unrated'}
                  onValueChange={(value) => setFormData({ ...formData, quality_rating: value === 'unrated' ? undefined : parseInt(value) })}
                >
                  <SelectTrigger id="quality" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer">
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
            
            <div>
              <Label htmlFor="notes" className="dark:text-gray-200">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes..."
                rows={2}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder:text-gray-400"
              />
            </div>
            
            {/* AI Scoring Fields */}
            <AIScoringFields
              mode="edit"
              initialScores={image.ai_scores || {}}
              onChange={handleAIScoresChange}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || replacing}
            className="cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}