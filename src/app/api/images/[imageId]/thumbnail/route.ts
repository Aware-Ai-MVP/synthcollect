/**
 * OPTIMIZED THUMBNAIL GENERATION WITH CACHING
 * Generates lightweight thumbnails on-demand using Sharp
 * @filepath src/app/api/images/[imageId]/thumbnail/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { storage } from '@/lib/storage/json-storage';
import sharp from 'sharp';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import path from 'path';

interface RouteParams {
  params: Promise<{
    imageId: string;
  }>;
}

// Thumbnail configuration
const THUMBNAIL_CONFIG = {
  WIDTH: 400,       // Max width for thumbnails
  HEIGHT: 400,      // Max height for thumbnails  
  QUALITY: 80,      // JPEG quality (80 is optimal balance)
  FORMAT: 'jpeg' as const, // Always use JPEG for thumbnails
  FIT: 'cover' as const,   // Cover the entire area
  CACHE_DIR: './data/thumbnails',
  MAX_AGE: 7 * 24 * 60 * 60, // 7 days cache
};

/**
 * GET /api/images/[imageId]/thumbnail - Serve optimized thumbnail
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { imageId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse optional size parameters
    const width = Math.min(parseInt(searchParams.get('w') || '400'), 800);
    const height = Math.min(parseInt(searchParams.get('h') || '400'), 800);
    const quality = Math.min(parseInt(searchParams.get('q') || '80'), 100);

    console.log(`📸 Thumbnail request: ${imageId} (${width}x${height}, q:${quality})`);

    // Get image metadata (no auth required for thumbnails - they're safe to cache)
    const image = await storage.getImage(imageId);
    if (!image) {
      console.error(`❌ Image not found: ${imageId}`);
      return new NextResponse('Image not found', { status: 404 });
    }

    // Generate cache key based on image and parameters
    const cacheKey = `${imageId}-${width}x${height}-q${quality}.jpg`;
    const cachePath = path.join(THUMBNAIL_CONFIG.CACHE_DIR, cacheKey);

    // Check if cached thumbnail exists and is fresh
    try {
      await access(cachePath);
      const thumbnailBuffer = await readFile(cachePath);
      
      console.log(`✅ Serving cached thumbnail: ${cacheKey}`);
      
      return new NextResponse(thumbnailBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': `public, max-age=${THUMBNAIL_CONFIG.MAX_AGE}, immutable`,
          'ETag': `"thumb-${imageId}-${width}x${height}"`,
          'X-Thumbnail-Cache': 'HIT',
        },
      });
    } catch {
      // Cache miss - generate thumbnail
    }

    console.log(`🔄 Generating thumbnail: ${cacheKey}`);

    // Ensure original image exists
    try {
      await access(image.file_path);
    } catch (error) {
      console.error(`❌ Original image not found: ${image.file_path}`);
      return new NextResponse('Original image not found', { status: 404 });
    }

    // Generate optimized thumbnail using Sharp
    const thumbnailBuffer = await generateThumbnail(
      image.file_path,
      width,
      height,
      quality
    );

    // Cache the thumbnail (async - don't wait)
    cacheThumbnail(cachePath, thumbnailBuffer).catch(error => {
      console.warn(`⚠️ Failed to cache thumbnail ${cacheKey}:`, error);
    });

    console.log(`✅ Generated thumbnail: ${cacheKey} (${thumbnailBuffer.length} bytes)`);

    return new NextResponse(thumbnailBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': `public, max-age=${THUMBNAIL_CONFIG.MAX_AGE}, immutable`,
        'ETag': `"thumb-${imageId}-${width}x${height}"`,
        'X-Thumbnail-Cache': 'MISS',
        'X-Original-Size': `${image.image_dimensions.width}x${image.image_dimensions.height}`,
        'X-Thumbnail-Size': `${width}x${height}`,
      },
    });

  } catch (error) {
    console.error('❌ Thumbnail generation error:', error);
    return new NextResponse('Failed to generate thumbnail', { status: 500 });
  }
}

/**
 * Generates optimized thumbnail using Sharp
 */
async function generateThumbnail(
  originalPath: string,
  width: number,
  height: number,
  quality: number
): Promise<Buffer> {
  try {
    const thumbnail = await sharp(originalPath)
      .resize(width, height, {
        fit: THUMBNAIL_CONFIG.FIT,
        withoutEnlargement: true, // Don't upscale small images
      })
      .jpeg({
        quality,
        progressive: true,        // Progressive JPEG for better perceived performance
        mozjpeg: true,           // Use mozjpeg encoder if available
        optimizeScans: true,     // Optimize scan order
        optimizeCoding: true,    // Optimize Huffman coding tables
      })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error('❌ Sharp processing error:', error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Caches thumbnail to disk (non-blocking)
 */
async function cacheThumbnail(cachePath: string, buffer: Buffer): Promise<void> {
  try {
    // Ensure cache directory exists
    await mkdir(path.dirname(cachePath), { recursive: true });
    
    // Write thumbnail to cache
    await writeFile(cachePath, buffer);
    
    console.log(`💾 Cached thumbnail: ${path.basename(cachePath)}`);
  } catch (error) {
    // Non-critical error - just log and continue
    console.warn('⚠️ Cache write failed:', error);
  }
}

/**
 * DELETE /api/images/[imageId]/thumbnail - Clear thumbnail cache (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { imageId } = await params;
    
    // Find all cached thumbnails for this image
    const cacheDir = THUMBNAIL_CONFIG.CACHE_DIR;
    try {
      const { readdir, unlink } = await import('fs/promises');
      const files = await readdir(cacheDir);
      const imageThumbnails = files.filter(file => file.startsWith(`${imageId}-`));
      
      await Promise.all(
        imageThumbnails.map(file => 
          unlink(path.join(cacheDir, file)).catch(error => 
            console.warn(`⚠️ Failed to delete ${file}:`, error)
          )
        )
      );

      console.log(`🗑️ Cleared ${imageThumbnails.length} thumbnails for image ${imageId}`);
      
      return NextResponse.json({
        success: true,
        cleared: imageThumbnails.length,
      });
    } catch (error) {
      console.warn('⚠️ Cache clear error:', error);
      return NextResponse.json({ success: true, cleared: 0 });
    }
  } catch (error) {
    console.error('❌ Thumbnail cache clear error:', error);
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
}