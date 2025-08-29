/**
 * Export system configuration for performance optimization
 * @filepath src/lib/config/export-config.ts
 */

export interface ExportConfig {
  // Archiver settings
  COMPRESSION_LEVEL: number;
  ARCHIVER_OPTIONS: {
    zlib: { level: number; chunkSize: number };
    statConcurrency: number;
  };
  
  // Performance settings
  BATCH_SIZE: number;
  MAX_CONCURRENT_FILES: number;
  STREAM_CHUNK_SIZE: number;
  
  // Memory and timeout settings
  TIMEOUT_MS: number;
  MEMORY_LIMIT_MB: number;
  GC_FREQUENCY: number;
  
  // Error handling
  MAX_RETRY_ATTEMPTS: number;
  CONTINUE_ON_ERROR: boolean;
  
  // Logging
  LOG_PROGRESS_INTERVAL: number;
  ENABLE_DEBUG_LOGGING: boolean;
}

export const EXPORT_CONFIG: ExportConfig = {
  // Fast compression (3) vs maximum compression (9)
  // Level 3 provides good compression with 5-10x faster speed
  COMPRESSION_LEVEL: 3,
  
  ARCHIVER_OPTIONS: {
    zlib: { 
      level: 3,  // Fast compression
      chunkSize: 32 * 1024, // 32KB chunks for better streaming
    },
    statConcurrency: 8, // Concurrent file stat operations
  },
  
  // Process images in batches to manage memory
  BATCH_SIZE: 10, // Process 10 images at a time
  MAX_CONCURRENT_FILES: 5, // Maximum concurrent file reads
  STREAM_CHUNK_SIZE: 64 * 1024, // 64KB streaming chunks
  
  // 5 minutes timeout for large exports
  TIMEOUT_MS: 5 * 60 * 1000,
  
  // Memory management
  MEMORY_LIMIT_MB: 512, // Trigger GC at 512MB
  GC_FREQUENCY: 50, // Force GC every 50 processed images
  
  // Error handling
  MAX_RETRY_ATTEMPTS: 3,
  CONTINUE_ON_ERROR: true, // Don't fail entire export for single file
  
  // Progress logging
  LOG_PROGRESS_INTERVAL: 25, // Log progress every 25 images
  ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === 'development',
};

// Helper functions for performance monitoring
export class ExportMetrics {
  private startTime: number;
  private processedFiles: number = 0;
  private failedFiles: number = 0;
  private totalFiles: number = 0;
  private lastGC: number = 0;

  constructor(totalFiles: number) {
    this.startTime = Date.now();
    this.totalFiles = totalFiles;
  }

  recordProcessed() {
    this.processedFiles++;
    
    // Force garbage collection periodically
    if (this.processedFiles - this.lastGC >= EXPORT_CONFIG.GC_FREQUENCY) {
      if (global.gc && typeof global.gc === 'function') {
        global.gc();
        this.lastGC = this.processedFiles;
      }
    }
    
    // Log progress at intervals
    if (this.processedFiles % EXPORT_CONFIG.LOG_PROGRESS_INTERVAL === 0) {
      this.logProgress();
    }
  }

  recordFailed() {
    this.failedFiles++;
  }

  // PUBLIC GETTERS FOR ACCESSING METRICS
  get processedCount(): number {
    return this.processedFiles;
  }

  get failedCount(): number {
    return this.failedFiles;
  }

  get totalCount(): number {
    return this.totalFiles;
  }

  private logProgress() {
    const elapsed = Date.now() - this.startTime;
    const rate = this.processedFiles / (elapsed / 1000);
    const eta = (this.totalFiles - this.processedFiles) / rate;
    
    console.log(`📊 Export Progress: ${this.processedFiles}/${this.totalFiles} ` +
      `(${Math.round(this.processedFiles/this.totalFiles*100)}%) ` +
      `Rate: ${rate.toFixed(1)}/s ETA: ${Math.round(eta)}s`);
  }

  getStats() {
    const elapsed = Date.now() - this.startTime;
    return {
      totalFiles: this.totalFiles,
      processedFiles: this.processedFiles,
      failedFiles: this.failedFiles,
      elapsedMs: elapsed,
      averageRate: this.processedFiles / (elapsed / 1000),
    };
  }
}