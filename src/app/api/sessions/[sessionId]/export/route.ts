/**
 * HIGH-PERFORMANCE STREAMING EXPORT ENDPOINT
 * Optimized for hundreds of images with memory efficiency and error resilience
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
  withTimeout,
  validateImageFile,
  createZipResponseHeaders,
} from '@/lib/utils/stream-helpers';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

// Enable long-running API route (Next.js 15)
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/[sessionId]/export - High-performance export with streaming
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const exportStartTime = Date.now();
  console.log('🚀 Starting high-performance export operation');

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

    console.log(`📁 Exporting session: ${sessionData.name} (${sessionId})`);

    // Get all images
    const images = await storage.listImages(sessionId);
    console.log(`🖼️  Found ${images.length} images for export`);

    if (images.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session has no images to export',
      }, { status: 400 });
    }

    // Handle JSON-only export (lightweight)
    if (mode === 'json') {
      return handleJsonExport(sessionData, images);
    }

    // Handle full ZIP export with streaming
    if (mode === 'full') {
      return handleStreamingZipExport(sessionData, images);
    }

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
async function handleJsonExport(sessionData: any, images: any[]) {
  console.log('📄 Processing JSON-only export');
  
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

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="${sessionData.name.replace(/\s+/g, '_')}_export.json"`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Handles high-performance streaming ZIP export
 */
async function handleStreamingZipExport(sessionData: any, images: any[]) {
  console.log(`📦 Starting streaming ZIP export for ${images.length} images`);
  
  // Initialize performance monitoring
  const metrics = new ExportMetrics(images.length);
  
  try {
    // Pre-validate all image files
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
      throw new Error('No valid images found for export');
    }

    console.log(`✅ Validated ${validImages.length}/${images.length} images`);

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

    // Process images in optimized batches
    await processImagesBatched(
      validImages,
      async (batch, batchIndex) => {
        await processBatch(archive, batch, metrics, batchIndex);
      },
      EXPORT_CONFIG.BATCH_SIZE
    );

    // Finalize archive and complete stream
    console.log('🏁 Finalizing archive...');
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
    throw error;
  }
}

/**
 * Processes a batch of images with concurrent file operations
 */
async function processBatch(
  archive: archiver.Archiver,
  batch: Array<{ image: any; validation: any }>,
  metrics: ExportMetrics,
  batchIndex: number
): Promise<void> {
  const batchStart = Date.now();

  // Process files with controlled concurrency
  const concurrentProcessors = [];
  const semaphore = new Array(EXPORT_CONFIG.MAX_CONCURRENT_FILES).fill(null);

  for (const { image } of batch) {
    const processorPromise = processImageFile(archive, image, metrics);
    concurrentProcessors.push(processorPromise);

    // Control concurrency by waiting for available slots
    if (concurrentProcessors.length >= EXPORT_CONFIG.MAX_CONCURRENT_FILES) {
      await Promise.race(concurrentProcessors);
      // Remove completed promises
      const completedIndices: number[] = [];
      for (let i = 0; i < concurrentProcessors.length; i++) {
        const promise = concurrentProcessors[i];
        if (await isPromiseResolved(promise)) {
          completedIndices.unshift(i);
        }
      }
      completedIndices.forEach(i => concurrentProcessors.splice(i, 1));
    }
  }

  // Wait for remaining processors to complete
  await Promise.allSettled(concurrentProcessors);

  const batchDuration = Date.now() - batchStart;
  console.log(`✅ Batch ${batchIndex + 1} completed in ${batchDuration}ms`);

  // Memory management
  const memory = checkMemoryUsage();
  if (memory.shouldGC) {
    forceGC();
  }
}

/**
 * Processes a single image file with error isolation
 */
async function processImageFile(
  archive: archiver.Archiver,
  image: any,
  metrics: ExportMetrics
): Promise<void> {
  try {
    const buffer = await safeReadFile(image.file_path, image.filename, metrics);
    
    if (buffer) {
      archive.append(buffer, { 
        name: `images/${image.filename}`,
        // Set file modification time from metadata
        date: new Date(image.upload_timestamp || Date.now()),
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
}

/**
 * Helper to check if a promise has resolved (for concurrency control)
 */
async function isPromiseResolved(promise: Promise<any>): Promise<boolean> {
  const timeout = Promise.race([
    promise.then(() => true, () => true),
    new Promise(resolve => setTimeout(() => resolve(false), 0))
  ]);
  
  return timeout as Promise<boolean>;
}