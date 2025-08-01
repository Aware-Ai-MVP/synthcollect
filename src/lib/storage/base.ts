/**
 * Base storage interface for flexibility
 * @filepath src/lib/storage/base.ts
 */

import { Session, ImageRecord } from '@/lib/types';

export interface StorageAdapter {
  // Session operations
  createSession(session: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  listSessions(userId?: string): Promise<Session[]>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session>;
  deleteSession(id: string): Promise<void>;
  
  // Image operations
  createImage(image: Omit<ImageRecord, 'id' | 'upload_timestamp'>): Promise<ImageRecord>;
  getImage(id: string): Promise<ImageRecord | null>;
  listImages(sessionId: string, params?: any): Promise<ImageRecord[]>;
  updateImage(id: string, updates: Partial<ImageRecord>): Promise<ImageRecord>;
  deleteImage(id: string): Promise<void>;
  
  // Utility operations
  getSessionStats(sessionId: string): Promise<any>;
  exportSession(sessionId: string, format: 'json' | 'csv' | 'zip'): Promise<string>;
}