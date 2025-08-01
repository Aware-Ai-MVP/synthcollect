/**
 * Utility functions for SynthCollect
 * @filepath src/lib/utils/index.ts
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function generateFileName(originalName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = originalName.split('.').pop();
  return `img_${timestamp}.${ext}`;
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
}
