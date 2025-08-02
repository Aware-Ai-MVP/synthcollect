/**
 * Import system types and interfaces
 * @filepath src/lib/types/import.ts
 */

import { Session, ImageRecord } from './index';

export interface ImportMetadata {
  session: Partial<Session>;
  images: Partial<ImageRecord>[];
  export_timestamp: string;
  export_version: string;
}

export interface ImportOptions {
  mode: 'new' | 'merge';
  targetSessionId?: string;
  duplicateStrategy: 'skip' | 'replace' | 'rename';
  preserveIds: boolean;
}

export interface ImportProgress {
  status: 'validating' | 'importing' | 'processing' | 'complete' | 'error';
  total: number;
  processed: number;
  skipped: number;
  errors: string[];
  currentFile?: string;
}

export interface ImportResult {
  success: boolean;
  sessionId: string;
  imported: number;
  skipped: number;
  errors: string[];
}

export interface DuplicateImage {
  existing: ImageRecord;
  importing: Partial<ImageRecord>;
  reason: 'same_hash' | 'same_name' | 'same_prompt';
}