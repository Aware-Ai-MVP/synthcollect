/**
 * JSON file-based storage implementation with image mapping
 * @filepath src/lib/storage/json-storage.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { Session, ImageRecord } from '@/lib/types';
import { StorageAdapter } from './base';

export class JsonStorage implements StorageAdapter {
  private dataDir: string;
  
  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
  }
  
  private async ensureDir(dirPath: string) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory exists
    }
  }
  
  private getSessionPath(sessionId: string) {
    return path.join(this.dataDir, 'sessions', sessionId);
  }
  
  private async readMetadata(sessionId: string): Promise<any> {
    const metadataPath = path.join(this.getSessionPath(sessionId), 'metadata.json');
    try {
      const data = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { images: {} };
    }
  }
  
  private async writeMetadata(sessionId: string, metadata: any) {
    const metadataPath = path.join(this.getSessionPath(sessionId), 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }
  
  // Add image mapping functions
  private async getImageMapping(): Promise<Record<string, string>> {
    const mappingPath = path.join(this.dataDir, 'image-mapping.json');
    try {
      const data = await fs.readFile(mappingPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  
  private async saveImageMapping(mapping: Record<string, string>) {
    const mappingPath = path.join(this.dataDir, 'image-mapping.json');
    await this.ensureDir(this.dataDir);
    await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2));
  }
  
  async createSession(data: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session> {
    const session: Session = {
      ...data,
      id: nanoid(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_count: 0,
      export_history: [],
    };
    
    const sessionPath = this.getSessionPath(session.id);
    await this.ensureDir(sessionPath);
    await this.ensureDir(path.join(sessionPath, 'images'));
    
    const configPath = path.join(sessionPath, 'session_config.json');
    await fs.writeFile(configPath, JSON.stringify(session, null, 2));
    
    return session;
  }
  
  async getSession(id: string): Promise<Session | null> {
    try {
      const configPath = path.join(this.getSessionPath(id), 'session_config.json');
      const data = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  
  async listSessions(userId?: string): Promise<Session[]> {
    await this.ensureDir(path.join(this.dataDir, 'sessions'));
    const sessionDirs = await fs.readdir(path.join(this.dataDir, 'sessions'));
    const sessions: Session[] = [];
    
    for (const dir of sessionDirs) {
      const session = await this.getSession(dir);
      if (session && (!userId || session.created_by === userId)) {
        sessions.push(session);
      }
    }
    
    return sessions.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }
  
  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const session = await this.getSession(id);
    if (!session) throw new Error('Session not found');
    
    const updated = {
      ...session,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    const configPath = path.join(this.getSessionPath(id), 'session_config.json');
    await fs.writeFile(configPath, JSON.stringify(updated, null, 2));
    
    return updated;
  }
  
  async deleteSession(id: string): Promise<void> {
    const sessionPath = this.getSessionPath(id);
    await fs.rm(sessionPath, { recursive: true, force: true });
  }
  
  async createImage(data: Omit<ImageRecord, 'id' | 'upload_timestamp'>): Promise<ImageRecord> {
    const image: ImageRecord = {
      ...data,
      id: nanoid(),
      upload_timestamp: new Date().toISOString(),
    };
    
    const metadata = await this.readMetadata(data.session_id);
    metadata.images[image.id] = image;
    await this.writeMetadata(data.session_id, metadata);
    
    // Update image mapping
    const mapping = await this.getImageMapping();
    mapping[image.id] = data.session_id;
    await this.saveImageMapping(mapping);
    
    // Update session image count
    const session = await this.getSession(data.session_id);
    if (session) {
      await this.updateSession(data.session_id, {
        image_count: Object.keys(metadata.images).length,
      });
    }
    
    return image;
  }
  
  async getImage(id: string): Promise<ImageRecord | null> {
    const mapping = await this.getImageMapping();
    const sessionId = mapping[id];
    
    if (!sessionId) return null;
    
    const metadata = await this.readMetadata(sessionId);
    return metadata.images[id] || null;
  }
  
  async listImages(sessionId: string): Promise<ImageRecord[]> {
    const metadata = await this.readMetadata(sessionId);
    return Object.values(metadata.images || {});
  }
  
  async updateImage(id: string, updates: Partial<ImageRecord>): Promise<ImageRecord> {
    const mapping = await this.getImageMapping();
    const sessionId = mapping[id];
    
    if (!sessionId) throw new Error('Image not found');
    
    const metadata = await this.readMetadata(sessionId);
    if (!metadata.images[id]) throw new Error('Image not found');
    
    metadata.images[id] = { ...metadata.images[id], ...updates };
    await this.writeMetadata(sessionId, metadata);
    
    return metadata.images[id];
  }
  
  async deleteImage(id: string): Promise<void> {
    const mapping = await this.getImageMapping();
    const sessionId = mapping[id];
    
    if (!sessionId) throw new Error('Image not found');
    
    const metadata = await this.readMetadata(sessionId);
    const image = metadata.images[id];
    
    if (!image) throw new Error('Image not found');
    
    // Delete file
    try {
      await fs.unlink(image.file_path);
    } catch {
      // File might not exist
    }
    
    // Remove from metadata
    delete metadata.images[id];
    await this.writeMetadata(sessionId, metadata);
    
    // Remove from mapping
    delete mapping[id];
    await this.saveImageMapping(mapping);
    
    // Update session count
    const session = await this.getSession(sessionId);
    if (session) {
      await this.updateSession(sessionId, {
        image_count: Object.keys(metadata.images).length,
      });
    }
  }
  
  async getSessionStats(sessionId: string): Promise<any> {
    const images = await this.listImages(sessionId);
    const generators = images.reduce((acc, img) => {
      acc[img.generator_used] = (acc[img.generator_used] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total_images: images.length,
      generators,
      average_quality: images.reduce((sum, img) => sum + (img.quality_rating || 0), 0) / images.length || 0,
    };
  }
  
  async exportSession(sessionId: string, format: 'json' | 'csv' | 'zip'): Promise<string> {
    const session = await this.getSession(sessionId);
    const images = await this.listImages(sessionId);
    
    const exportData = {
      session,
      images,
      exported_at: new Date().toISOString(),
    };
    
    const exportPath = path.join(this.dataDir, 'exports', `${sessionId}_${Date.now()}.json`);
    await this.ensureDir(path.join(this.dataDir, 'exports'));
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    
    return exportPath;
  }
}

export const storage = new JsonStorage();