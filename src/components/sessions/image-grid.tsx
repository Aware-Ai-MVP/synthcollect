/**
 * Image grid with complete dark mode support
 * @filepath src/components/sessions/image-grid.tsx
 */

import { useState } from 'react';
import { ImageRecord } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';
import { Star, MoreVertical, Edit, Trash, Eye } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { toast } from 'sonner';
import { ImageEditDialog } from './image-edit-dialog';

interface ImageGridProps {
  images: ImageRecord[];
}

export function ImageGrid({ images }: ImageGridProps) {
  const refreshSession = useSessionStore(state => state.refreshCurrentSession);
  const [editingImage, setEditingImage] = useState<ImageRecord | null>(null);
  
  const handleDelete = async (image: ImageRecord) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
      
      toast.success('Image deleted successfully');
      await refreshSession();
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };
  
  if (images.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No images uploaded yet</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-shadow group dark:bg-gray-800 dark:border-gray-700">
            <div className="aspect-square relative bg-gray-100 dark:bg-gray-900">
              <img
                src={`/api/images/${image.id}`}
                alt={image.original_filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {image.quality_rating && (
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full flex items-center gap-1 text-sm">
                  <Star className="h-3 w-3 fill-current" />
                  {image.quality_rating}
                </div>
              )}
              
              {/* Action Menu */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                    <DropdownMenuItem 
                      onClick={() => window.open(`/api/images/${image.id}`, '_blank')}
                      className="cursor-pointer dark:hover:bg-gray-700"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Size
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setEditingImage(image)}
                      className="cursor-pointer dark:hover:bg-gray-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(image)}
                      className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer dark:hover:bg-gray-700"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <CardContent className="p-4 space-y-2 dark:bg-gray-800">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">
                  {image.generator_used}
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatBytes(image.file_size)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {image.image_dimensions.width}×{image.image_dimensions.height}
                </span>
              </div>
              
              <p className="text-sm line-clamp-2 dark:text-gray-300">{image.prompt}</p>
              
              {/* AI Scores Preview */}
              {image.ai_scores && Object.keys(image.ai_scores).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(image.ai_scores).slice(0, 2).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-400">
                      {key.split('_')[0]}: {value.toFixed(1)}
                    </Badge>
                  ))}
                  {Object.keys(image.ai_scores).length > 2 && (
                    <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-400">
                      +{Object.keys(image.ai_scores).length - 2}
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Uploaded {format(new Date(image.upload_timestamp), 'MMM d, h:mm a')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {editingImage && (
        <ImageEditDialog
          image={editingImage}
          open={!!editingImage}
          onOpenChange={(open) => !open && setEditingImage(null)}
          onSave={async () => {
            await refreshSession();
            setEditingImage(null);
          }}
        />
      )}
    </>
  );
}