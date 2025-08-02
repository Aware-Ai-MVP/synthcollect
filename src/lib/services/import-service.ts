/**
 * Fixed import service with proper file handling
 * @filepath src/lib/services/import-service.ts
 */

import { storage } from '@/lib/storage/json-storage';
import { ImportMetadata, ImportOptions, ImportProgress, ImportResult, DuplicateImage } from '@/lib/types/import';
import { ImageRecord } from '@/lib/types';
import { ImportMetadataSchema } from '@/lib/validations';
import { nanoid } from 'nanoid';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import JSZip from 'jszip';

export class ImportService {
  private progress: ImportProgress = {
    status: 'validating',
    total: 0,
    processed: 0,
    skipped: 0,
    errors: [],
  };
  
  private progressCallback?: (progress: ImportProgress) => void;
  
  constructor(onProgress?: (progress: ImportProgress) => void) {
    this.progressCallback = onProgress;
  }
  
  private updateProgress(updates: Partial<ImportProgress>) {
    this.progress = { ...this.progress, ...updates };
    this.progressCallback?.(this.progress);
  }
  
  async importData(
    file: File,
    options: ImportOptions,
    userId: string
  ): Promise<ImportResult> {
    try {
      this.updateProgress({ status: 'validating' });
      
      // Convert File to ArrayBuffer for proper handling
      const arrayBuffer = await file.arrayBuffer();
      
      // Determine file type and extract metadata
      const metadata = await this.extractMetadata(file.name, arrayBuffer);
      
      // Validate metadata
      const validated = ImportMetadataSchema.parse(metadata);
      
      this.updateProgress({
        status: 'importing',
        total: validated.images.length,
      });
      
      // Create or get target session
      let sessionId: string;
      if (options.mode === 'new') {
        sessionId = await this.createNewSession(validated, userId);
      } else {
        sessionId = options.targetSessionId!;
        // Verify session exists and user owns it
        const session = await storage.getSession(sessionId);
        if (!session || session.created_by !== userId) {
          throw new Error('Invalid target session');
        }
      }
      
      // Process images
      const result = await this.processImages(
        arrayBuffer,
        validated,
        sessionId,
        options,
        userId,
        file.name.endsWith('.zip')
      );
      
      this.updateProgress({ status: 'complete' });
      
      return {
        success: true,
        sessionId,
        imported: result.imported,
        skipped: result.skipped,
        errors: this.progress.errors,
      };
    } catch (error) {
      console.error('Import error:', error);
      this.updateProgress({
        status: 'error',
        errors: [...this.progress.errors, error instanceof Error ? error.message : 'Import failed'],
      });
      
      return {
        success: false,
        sessionId: '',
        imported: 0,
        skipped: this.progress.skipped,
        errors: this.progress.errors,
      };
    }
  }
  
  private async extractMetadata(filename: string, arrayBuffer: ArrayBuffer): Promise<ImportMetadata> {
    if (filename.endsWith('.json')) {
      // JSON file - convert ArrayBuffer to string
      const decoder = new TextDecoder();
      const text = decoder.decode(arrayBuffer);
      return JSON.parse(text);
    } else if (filename.endsWith('.zip')) {
      // ZIP file - load with JSZip
      const zip = new JSZip();
      await zip.loadAsync(arrayBuffer);
      
      const metadataFile = zip.file('metadata.json');
      if (!metadataFile) {
        throw new Error('Invalid import file: metadata.json not found in ZIP');
      }
      
      const metadataText = await metadataFile.async('text');
      return JSON.parse(metadataText);
    } else {
      throw new Error('Unsupported file type. Please upload JSON or ZIP file.');
    }
  }
  
  private async createNewSession(
    metadata: ImportMetadata,
    userId: string
  ): Promise<string> {
    const sessionName = metadata.session.name || 'Imported Session';
    const session = await storage.createSession({
      name: `${sessionName} (Imported)`,
      description: metadata.session.description || `Imported on ${new Date().toLocaleDateString()}`,
      created_by: userId,
      status: 'active',
    });
    
    return session.id;
  }
  
  private async processImages(
    arrayBuffer: ArrayBuffer,
    metadata: ImportMetadata,
    sessionId: string,
    options: ImportOptions,
    userId: string,
    isZip: boolean
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;
    
    // Load ZIP if needed for image files
    let zip: JSZip | null = null;
    if (isZip) {
      zip = new JSZip();
      await zip.loadAsync(arrayBuffer);
    }
    
    // Get existing images for duplicate detection
    const existingImages = options.mode === 'merge' 
      ? await storage.listImages(sessionId)
      : [];
    
    for (let i = 0; i < metadata.images.length; i++) {
      const imageData = metadata.images[i];
      
      this.updateProgress({
        processed: i + 1,
        currentFile: imageData.original_filename,
      });
      
      try {
        // Check for duplicates if merging
        if (options.mode === 'merge') {
          const duplicate = await this.checkDuplicate(imageData, existingImages);
          
          if (duplicate) {
            if (options.duplicateStrategy === 'skip') {
              skipped++;
              continue;
            } else if (options.duplicateStrategy === 'replace') {
              // Delete existing and continue with import
              await storage.deleteImage(duplicate.existing.id);
            }
            // For 'rename' strategy, we'll add a suffix to the filename
          }
        }
        
        // Generate new paths
        const newFilename = options.duplicateStrategy === 'rename' && options.mode === 'merge'
          ? this.generateUniqueFilename(imageData.filename, existingImages)
          : imageData.filename;
        
        const sessionPath = path.join(process.cwd(), 'data', 'sessions', sessionId);
        const imagesPath = path.join(sessionPath, 'images');
        const filePath = path.join(imagesPath, newFilename);
        
        // Ensure directory exists
        await mkdir(imagesPath, { recursive: true });
        
        // Copy image file if ZIP import
        if (zip && imageData.file_path) {
          const relativePath = imageData.file_path.replace(/^\//, ''); // Remove leading slash if present
          const imageFile = zip.file(relativePath);
          
          if (!imageFile) {
            console.error(`Image file not found in ZIP: ${relativePath}`);
            this.progress.errors.push(`Image file not found: ${imageData.original_filename}`);
            skipped++;
            continue;
          }
          
          const imageBuffer = await imageFile.async('nodebuffer');
          await writeFile(filePath, imageBuffer);
        } else if (!zip && !imageData.file_path) {
          // JSON-only import, skip image file
          console.warn(`No image file for ${imageData.original_filename} (JSON-only import)`);
        }
        
        // Create image record
        await storage.createImage({
          session_id: sessionId,
          filename: newFilename,
          original_filename: imageData.original_filename,
          file_path: filePath,
          file_size: imageData.file_size,
          image_dimensions: imageData.image_dimensions,
          prompt: imageData.prompt,
          generator_used: imageData.generator_used,
          ai_scores: imageData.ai_scores || {},
          quality_rating: imageData.quality_rating,
          tags: imageData.tags || [],
          notes: imageData.notes,
          uploaded_by: userId,
        });
        
        imported++;
      } catch (error) {
        console.error('Error importing image:', error);
        this.progress.errors.push(
          `Failed to import ${imageData.original_filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        skipped++;
      }
    }
    
    // Update progress
    this.updateProgress({
      processed: metadata.images.length,
      skipped,
    });
    
    return { imported, skipped };
  }
  
  private async checkDuplicate(
    importing: Partial<ImageRecord>,
    existing: ImageRecord[]
  ): Promise<DuplicateImage | null> {
    // Check by filename
    const sameFilename = existing.find(e => e.filename === importing.filename);
    if (sameFilename) {
      return {
        existing: sameFilename,
        importing,
        reason: 'same_name',
      };
    }
    
    // Check by prompt (exact match)
    const samePrompt = existing.find(e => 
      e.prompt === importing.prompt && 
      e.generator_used === importing.generator_used
    );
    if (samePrompt) {
      return {
        existing: samePrompt,
        importing,
        reason: 'same_prompt',
      };
    }
    
    return null;
  }
  
  private generateUniqueFilename(
    filename: string,
    existing: ImageRecord[]
  ): string {
    let newFilename = filename;
    let counter = 1;
    
    const lastDotIndex = filename.lastIndexOf('.');
    const name = lastDotIndex > -1 ? filename.substring(0, lastDotIndex) : filename;
    const ext = lastDotIndex > -1 ? filename.substring(lastDotIndex) : '';
    
    while (existing.some(e => e.filename === newFilename)) {
      newFilename = `${name}_imported_${counter}${ext}`;
      counter++;
    }
    
    return newFilename;
  }
}