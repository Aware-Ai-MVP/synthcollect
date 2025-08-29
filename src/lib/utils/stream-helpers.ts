/**
 * Streaming utilities for high-performance export operations
 * @filepath src/lib/utils/stream-helpers.ts
 */

import { Readable } from 'stream';
import { readFile } from 'fs/promises';
import { EXPORT_CONFIG, ExportMetrics } from '@/lib/config/export-config';
import type archiver from 'archiver';

/**
 * Creates a ReadableStream for archiver output that can be directly returned as NextResponse
 */
export function createArchiverStream(archive: archiver.Archiver): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      // Pipe archiver output to the stream controller
      archive.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      archive.on('end', () => {
        controller.close();
      });

      archive.on('error', (error) => {
        console.error('Archive stream error:', error);
        controller.error(error);
      });

      archive.on('warning', (warning) => {
        if (warning.code !== 'ENOENT') {
          console.warn('Archive warning:', warning);
        }
      });
    },
  });
}

/**
 * Processes images in batches to manage memory usage
 */
export async function processImagesBatched<T>(
  images: T[],
  processor: (batch: T[], batchIndex: number) => Promise<void>,
  batchSize: number = EXPORT_CONFIG.BATCH_SIZE
): Promise<void> {
  const totalBatches = Math.ceil(images.length / batchSize);
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, images.length);
    const batch = images.slice(start, end);
    
    console.log(`🔄 Processing batch ${i + 1}/${totalBatches} (${batch.length} images)`);
    await processor(batch, i);
    
    // Small delay to allow event loop processing
    await new Promise(resolve => setImmediate(resolve));
  }
}

/**
 * Safely reads a file with retry logic and error isolation
 */
export async function safeReadFile(
  filePath: string,
  filename: string,
  metrics: ExportMetrics
): Promise<Buffer | null> {
  let attempts = 0;
  
  while (attempts < EXPORT_CONFIG.MAX_RETRY_ATTEMPTS) {
    try {
      const buffer = await readFile(filePath);
      metrics.recordProcessed();
      return buffer;
    } catch (error) {
      attempts++;
      console.error(`❌ Failed to read ${filename} (attempt ${attempts}):`, error);
      
      if (attempts >= EXPORT_CONFIG.MAX_RETRY_ATTEMPTS) {
        metrics.recordFailed();
        
        if (EXPORT_CONFIG.CONTINUE_ON_ERROR) {
          console.warn(`⚠️  Skipping ${filename} after ${attempts} failed attempts`);
          return null;
        } else {
          throw error;
        }
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 100));
    }
  }
  
  return null;
}

/**
 * Monitors memory usage and triggers garbage collection when needed
 */
export function checkMemoryUsage(): { 
  used: number; 
  percentage: number; 
  shouldGC: boolean 
} {
  const usage = process.memoryUsage();
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const percentage = (usedMB / totalMB) * 100;
  
  const shouldGC = usedMB > EXPORT_CONFIG.MEMORY_LIMIT_MB;
  
  if (EXPORT_CONFIG.ENABLE_DEBUG_LOGGING) {
    console.log(`🧠 Memory: ${usedMB}MB/${totalMB}MB (${percentage.toFixed(1)}%)`);
  }
  
  return { used: usedMB, percentage, shouldGC };
}

/**
 * Forces garbage collection if available and needed
 */
export function forceGC(): boolean {
  if (global.gc && typeof global.gc === 'function') {
    global.gc();
    console.log('🗑️  Forced garbage collection');
    return true;
  }
  return false;
}

/**
 * Creates a timeout promise for export operations
 */
export function createTimeoutPromise(timeoutMs: number = EXPORT_CONFIG.TIMEOUT_MS): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Export timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);
  });
}

/**
 * Wraps an async operation with timeout and error handling
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs?: number
): Promise<T> {
  return Promise.race([
    operation,
    createTimeoutPromise(timeoutMs),
  ]);
}

/**
 * Validates file existence and size before processing
 */
export async function validateImageFile(filePath: string): Promise<{
  exists: boolean;
  size: number;
  isValid: boolean;
  error?: string;
}> {
  try {
    const fs = await import('fs/promises');
    const stats = await fs.stat(filePath);
    
    return {
      exists: true,
      size: stats.size,
      isValid: stats.size > 0 && stats.size < 50 * 1024 * 1024, // 50MB max
    };
  } catch (error) {
    return {
      exists: false,
      size: 0,
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates appropriate headers for ZIP download responses
 */
export function createZipResponseHeaders(filename: string): Record<string, string> {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  return {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${sanitizedFilename}.zip"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
  };
}