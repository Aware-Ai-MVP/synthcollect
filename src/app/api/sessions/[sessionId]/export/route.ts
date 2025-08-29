/**
 * HIGH-PERFORMANCE STREAMING EXPORT WITH PROGRESS UPDATES
 * Optimized for hundreds of images with real-time progress feedback
 * @filepath src/app/api/sessions/[sessionId]/export/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { storage } from '@/lib/storage/json-storage';
import { ApiResponse } from '@/lib/types';
import archiver from 'archiver';
import { EXPORT_CONFIG, ExportMetrics } from '@/lib/config/export-config';
import {
  createArchiverStream,
  processImagesBatched,
  safeReadFile,
  checkMemoryUsage,
  forceGC,
  validateImageFile,
  createZipResponseHeaders,
} from '@/lib/utils/stream-helpers';
import type { ExportProgressData } from '@/lib/utils/progress-store';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

// Enable long-running API route (Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/[sessionId]/export - High-performance export with progress
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const exportStartTime = Date.now();
  console.log('🚀 Starting high-performance export with progress tracking');

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const { sessionId } = await params;
    const { mode } = await request.json();

    // Verify session ownership
    const sessionData = await storage.getSession(sessionId);
    if (!sessionData || sessionData.created_by !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found or access denied',
      }, { status: 404 });
    }

    const progressReporter = new ExportProgressReporter(sessionId, session.user.id);
    await progressReporter.updateProgress({
      status: 'starting',
      message: 'Initializing export...',
      totalImages: 0,
      processedImages: 0,
      failedImages: 0,
      percentage: 0,
    });

    console.log(`📁 Exporting session: ${sessionData.name} (${sessionId})`);

    // Get all images
    const images = await storage.listImages(sessionId);
    console.log(`🖼️  Found ${images.length} images for export`);

    if (images.length === 0) {
      await progressReporter.updateProgress({
        status: 'error',
        message: 'No images found',
        error: 'Session has no images to export',
      });
      
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session has no images to export',
      }, { status: 400 });
    }

    await progressReporter.updateProgress({
      status: 'validating',
      message: `Found ${images.length} images, validating...`,
      totalImages: images.length,
      processedImages: 0,
      failedImages: 0,
      percentage: 0,
    });

    // Handle JSON-only export (lightweight)
    if (mode === 'json') {
      return handleJsonExport(sessionData, images, progressReporter);
    }

    // Handle full ZIP export with streaming
    if (mode === 'full') {
      return handleStreamingZipExport(sessionData, images, progressReporter);
    }

    await progressReporter.updateProgress({
      status: 'error',
      message: 'Invalid export mode',
      error: 'Export mode must be "json" or "full"',
    });

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Invalid export mode. Use "json" or "full"',
    }, { status: 400 });

  } catch (error) {
    const elapsed = Date.now() - exportStartTime;
    console.error(`❌ Export failed after ${elapsed}ms:`, error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Export operation failed',
    }, { status: 500 });
  }
}

/**
 * Handles lightweight JSON-only export
 */
async function handleJsonExport(
  sessionData: any, 
  images: any[], 
  progressReporter: ExportProgressReporter
) {
  console.log('📄 Processing JSON-only export');
  
  await progressReporter.updateProgress({
    status: 'processing',
    message: 'Generating JSON export...',
    percentage: 50,
  });
  
  const exportData = {
    session: sessionData,
    images: images.map(img => ({
      ...img,
      // Use relative paths for portability
      file_path: `images/${img.filename}`,
    })),
    export_timestamp: new Date().toISOString(),
    export_version: '1.0.0',
  };

  await progressReporter.updateProgress({
    status: 'complete',
    message: 'JSON export completed successfully',
    percentage: 100,
  });

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="${sessionData.name.replace(/\s+/g, '_')}_export.json"`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Handles high-performance streaming ZIP export with progress updates
 */
async function handleStreamingZipExport(
  sessionData: any, 
  images: any[], 
  progressReporter: ExportProgressReporter
) {
  console.log(`📦 Starting streaming ZIP export for ${images.length} images`);
  
  // Initialize performance monitoring
  const metrics = new ExportMetrics(images.length);
  
  try {
    // Pre-validate all image files
    await progressReporter.updateProgress({
      status: 'validating',
      message: 'Validating image files...',
      percentage: 5,
    });

    console.log('🔍 Pre-validating image files...');
    const validationResults = await Promise.all(
      images.map(async (img) => ({
        image: img,
        validation: await validateImageFile(img.file_path),
      }))
    );

    const validImages = validationResults.filter(r => r.validation.isValid);
    const invalidImages = validationResults.filter(r => !r.validation.isValid);

    if (invalidImages.length > 0) {
      console.warn(`⚠️  Found ${invalidImages.length} invalid/missing images:`);
      invalidImages.forEach(({ image, validation }) => {
        console.warn(`  - ${image.filename}: ${validation.error}`);
      });
    }

    if (validImages.length === 0) {
      await progressReporter.updateProgress({
        status: 'error',
        message: 'No valid images found',
        error: 'All images are invalid or missing',
      });
      throw new Error('No valid images found for export');
    }

    console.log(`✅ Validated ${validImages.length}/${images.length} images`);

    await progressReporter.updateProgress({
      status: 'processing',
      message: `Processing ${validImages.length} valid images...`,
      totalImages: validImages.length,
      processedImages: 0,
      failedImages: invalidImages.length,
      percentage: 10,
    });

    // Create optimized archiver instance
    const archive = archiver('zip', EXPORT_CONFIG.ARCHIVER_OPTIONS);

    // Set up error handling for archiver
    archive.on('warning', (warning) => {
      if (warning.code !== 'ENOENT') {
        console.warn('📦 Archive warning:', warning.message);
      }
    });

    archive.on('error', (error) => {
      console.error('📦 Archive error:', error);
      throw error;
    });

    // Create streaming response
    const stream = createArchiverStream(archive);
    const filename = sessionData.name.replace(/\s+/g, '_') + '_full_export';
    const headers = createZipResponseHeaders(filename);

    // Start the streaming response immediately
    const response = new Response(stream, { headers });

    // Add metadata.json first (lightweight)
    const exportData = {
      session: sessionData,
      images: validImages.map(({ image }) => ({
        ...image,
        file_path: `images/${image.filename}`, // Relative paths
      })),
      export_timestamp: new Date().toISOString(),
      export_version: '1.0.0',
      export_stats: {
        total_images: images.length,
        valid_images: validImages.length,
        invalid_images: invalidImages.length,
      },
    };

    archive.append(JSON.stringify(exportData, null, 2), { 
      name: 'metadata.json',
    });

    console.log('📄 Added metadata.json to archive');

    // Process images in optimized batches with progress updates
    await processImagesBatched(
      validImages,
      async (batch, batchIndex) => {
        await processBatchWithProgress(
          archive, 
          batch, 
          metrics, 
          batchIndex, 
          progressReporter,
          validImages.length,
          invalidImages.length
        );
      },
      EXPORT_CONFIG.BATCH_SIZE
    );

    // Finalize archive and complete stream
    console.log('🏁 Finalizing archive...');
    
    await progressReporter.updateProgress({
      status: 'complete',
      message: 'Export completed successfully',
      percentage: 100,
    });

    await archive.finalize();

    // Log final statistics
    const stats = metrics.getStats();
    console.log(`✅ Export completed successfully:`, {
      totalFiles: stats.totalFiles,
      processed: stats.processedFiles,
      failed: stats.failedFiles,
      duration: `${(stats.elapsedMs / 1000).toFixed(1)}s`,
      averageRate: `${stats.averageRate.toFixed(1)} files/sec`,
    });

    return response;

  } catch (error) {
    console.error('❌ Streaming export failed:', error);
    
    await progressReporter.updateProgress({
      status: 'error',
      message: 'Export failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}

/**
 * Processes a batch of images with progress updates
 */
async function processBatchWithProgress(
  archive: archiver.Archiver,
  batch: Array<{ image: any; validation: any }>,
  metrics: ExportMetrics,
  batchIndex: number,
  progressReporter: ExportProgressReporter,
  totalValidImages: number,
  failedImages: number
): Promise<void> {
  const batchStart = Date.now();

  // Process files with controlled concurrency
  const processors = batch.map(async ({ image }) => {
    try {
      const buffer = await safeReadFile(image.file_path, image.filename, metrics);
      
      if (buffer) {
        archive.append(buffer, { 
          name: `images/${image.filename}`,
          date: new Date(image.upload_timestamp || Date.now()),
        });
        
        // Update progress after each successful file
        const processedSoFar = metrics.processedCount;
        const percentage = Math.min(95, 10 + (processedSoFar / totalValidImages) * 85);
        
        await progressReporter.updateProgress({
          status: 'processing',
          message: `Processing images... (${processedSoFar}/${totalValidImages})`,
          processedImages: processedSoFar,
          currentImage: image.filename,
          percentage: Math.round(percentage),
        });

        if (EXPORT_CONFIG.ENABLE_DEBUG_LOGGING) {
          console.log(`✓ Added ${image.filename} (${(buffer.length / 1024).toFixed(1)}KB)`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to process ${image.filename}:`, error);
      metrics.recordFailed();
      
      if (!EXPORT_CONFIG.CONTINUE_ON_ERROR) {
        throw error;
      }
    }
  });

  // Wait for all files in batch to complete
  await Promise.allSettled(processors);

  const batchDuration = Date.now() - batchStart;
  console.log(`✅ Batch ${batchIndex + 1} completed in ${batchDuration}ms`);

  // Memory management
  const memory = checkMemoryUsage();
  if (memory.shouldGC) {
    forceGC();
  }
}

/**
 * Helper class for publishing progress updates
 */
class ExportProgressReporter {
  private sessionId: string;
  private userId: string;

  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  async updateProgress(update: Partial<ExportProgressData>): Promise<void> {
    try {
      await fetch(`/api/sessions/${this.sessionId}/export-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
    } catch (error) {
      console.warn('⚠️ Failed to update progress:', error);
      // Don't fail the export if progress update fails
    }
  }
}