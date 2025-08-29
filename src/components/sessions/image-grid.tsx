/**
 * OPTIMIZED IMAGE GRID WITH THUMBNAIL LOADING
 * Uses lightweight thumbnails for fast loading and better performance
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
import { Star, MoreVertical, Edit, Trash, Eye, ImageIcon, Loader2 } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { toast } from 'sonner';
import { ImageEditDialog } from './image-edit-dialog';

interface ImageGridProps {
  images: ImageRecord[];
}

// Optimized Image Component with thumbnail loading
function OptimizedImage({ 
  image, 
  className = "" 
}: { 
  image: ImageRecord; 
  className?: string;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showFullSize, setShowFullSize] = useState(false);

  // Use thumbnail API for grid display, full image for modal
  const thumbnailUrl = `/api/images/${image.id}/thumbnail?w=400&h=400&q=80`;
  const fullImageUrl = `/api/images/${image.id}`;

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    console.error(`Failed to load thumbnail for image: ${image.id}`);
  };

  const handleImageClick = () => {
    // Open full-size image in new tab for better UX
    window.open(fullImageUrl, '_blank');
  };

  return (
    <div 
      className={`aspect-square relative bg-gray-100 dark:bg-gray-900 overflow-hidden ${className}`}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <ImageIcon className="h-8 w-8 mb-2" />
          <span className="text-xs text-center px-2">
            Failed to load image
          </span>
        </div>
      )}

      {/* Optimized Thumbnail Image */}
      <img
        src={thumbnailUrl}
        alt={image.original_filename}
        className={`w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200 ${
          isLoading || hasError ? 'opacity-0' : 'opacity-100'
        }`}
        loading="lazy" // Native lazy loading
        decoding="async" // Async decoding for better performance
        onLoad={handleImageLoad}
        onError={handleImageError}
        onClick={handleImageClick}
        title="Click to view full size"
      />

      {/* Quality Rating Overlay */}
      {image.quality_rating && (
        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full flex items-center gap-1 text-sm">
          <Star className="h-3 w-3 fill-current" />
          {image.quality_rating}
        </div>
      )}

      {/* Image Dimensions Badge */}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
        {image.image_dimensions.width}×{image.image_dimensions.height}
      </div>
    </div>
  );
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
      
      // Clear thumbnail cache for deleted image
      try {
        await fetch(`/api/images/${image.id}/thumbnail`, { method: 'DELETE' });
      } catch (error) {
        console.warn('Failed to clear thumbnail cache:', error);
      }
      
      await refreshSession();
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  // Performance: Show loading state for large grids
  if (images.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No images uploaded yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Images will appear here as thumbnails for faster loading
        </p>
      </div>
    );
  }
  
  return (
    <>
      {/* Performance Info for Large Grids */}
      {images.length > 100 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <p className="text-blue-700 dark:text-blue-400 text-sm">
            📸 <strong>Performance Mode:</strong> Showing optimized thumbnails for faster loading ({images.length} images)
          </p>
        </div>
      )}

      {/* Responsive Grid with Performance Optimizations */}
      <div 
        className="grid gap-4 transition-all duration-300"
        style={{
          // Dynamic grid columns based on screen size and image count
          gridTemplateColumns: `repeat(auto-fill, minmax(${
            images.length > 50 ? '280px' : '320px'
          }, 1fr))`,
        }}
      >
        {images.map((image) => (
          <Card 
            key={image.id} 
            className="overflow-hidden hover:shadow-lg transition-shadow group dark:bg-gray-800 dark:border-gray-700 will-change-transform"
          >
            {/* Optimized Image with Thumbnail Loading */}
            <OptimizedImage image={image} />

            {/* Action Menu Overlay */}
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
            
            {/* Compact Metadata Card */}
            <CardContent className="p-3 space-y-2 dark:bg-gray-800">
              {/* Header with Generator and File Size */}
              <div className="flex items-center justify-between text-xs">
                <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">
                  {image.generator_used}
                </Badge>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatBytes(image.file_size)}
                </span>
              </div>
              
              {/* Truncated Prompt */}
              <p 
                className="text-sm line-clamp-2 dark:text-gray-300 leading-tight"
                title={image.prompt} // Show full prompt on hover
              >
                {image.prompt}
              </p>
              
              {/* AI Scores Preview (Compact) */}
              {image.ai_scores && Object.keys(image.ai_scores).length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(image.ai_scores).slice(0, 3).map(([key, value]) => (
                    <Badge 
                      key={key} 
                      variant="outline" 
                      className="text-xs px-1.5 py-0.5 dark:border-gray-600 dark:text-gray-400"
                    >
                      {key.split('_')[0]}: {value.toFixed(1)}
                    </Badge>
                  ))}
                  {Object.keys(image.ai_scores).length > 3 && (
                    <Badge 
                      variant="outline" 
                      className="text-xs px-1.5 py-0.5 dark:border-gray-600 dark:text-gray-400"
                    >
                      +{Object.keys(image.ai_scores).length - 3}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Upload Date */}
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                {format(new Date(image.upload_timestamp), 'MMM d, h:mm a')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Footer for Large Collections */}
      {images.length > 50 && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            🚀 Loaded {images.length} optimized thumbnails • Click any image to view full resolution
          </p>
        </div>
      )}
      
      {/* Edit Dialog */}
      {editingImage && (
        <ImageEditDialog
          image={editingImage}
          open={!!editingImage}
          onOpenChange={(open) => !open && setEditingImage(null)}
          onSave={async () => {
            // Clear thumbnail cache for edited image
            try {
              await fetch(`/api/images/${editingImage.id}/thumbnail`, { method: 'DELETE' });
            } catch (error) {
              console.warn('Failed to clear thumbnail cache:', error);
            }
            
            await refreshSession();
            setEditingImage(null);
          }}
        />
      )}
    </>
  );
}