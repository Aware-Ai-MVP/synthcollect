/**
 * PROGRESS STORE UTILITY
 * Manages export progress state separately from route handlers
 * @filepath src/lib/utils/progress-store.ts
 */

export interface ExportProgressData {
  sessionId: string;
  status: 'starting' | 'validating' | 'processing' | 'complete' | 'error';
  totalImages: number;
  processedImages: number;
  failedImages: number;
  currentImage?: string;
  percentage: number;
  estimatedTimeRemaining?: number;
  startTime: number;
  message: string;
  error?: string;
}

// Global progress tracking store (in production, use Redis/database)
export const progressStore = new Map<string, ExportProgressData>();

export class ProgressStoreManager {
  static updateProgress(
    sessionId: string, 
    userId: string, 
    update: Partial<ExportProgressData>
  ): ExportProgressData {
    const progressKey = `${sessionId}-${userId}`;
    const existing = progressStore.get(progressKey);
    
    // Calculate percentage and ETA
    const percentage = update.totalImages 
      ? Math.round((update.processedImages || 0) / update.totalImages * 100)
      : 0;
    
    let estimatedTimeRemaining: number | undefined;
    if (existing && update.processedImages && update.totalImages) {
      const elapsed = Date.now() - existing.startTime;
      const rate = update.processedImages / (elapsed / 1000);
      const remaining = update.totalImages - update.processedImages;
      estimatedTimeRemaining = remaining / rate;
    }

    const updatedProgress: ExportProgressData = {
      sessionId,
      startTime: existing?.startTime || Date.now(),
      ...existing,
      ...update,
      percentage,
      estimatedTimeRemaining,
    } as ExportProgressData;

    progressStore.set(progressKey, updatedProgress);
    
    console.log(`📊 Progress updated for ${sessionId}: ${percentage}%`);
    return updatedProgress;
  }

  static getProgress(sessionId: string, userId: string): ExportProgressData | null {
    const progressKey = `${sessionId}-${userId}`;
    return progressStore.get(progressKey) || null;
  }

  static deleteProgress(sessionId: string, userId: string): boolean {
    const progressKey = `${sessionId}-${userId}`;
    return progressStore.delete(progressKey);
  }

  static cleanup(): void {
    // Clean up old progress entries (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [key, progress] of progressStore.entries()) {
      if (progress.startTime < oneHourAgo || 
          progress.status === 'complete' || 
          progress.status === 'error') {
        progressStore.delete(key);
      }
    }
  }
}