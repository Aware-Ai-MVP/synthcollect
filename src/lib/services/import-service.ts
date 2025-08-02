/**
 * COMPLETELY FIXED import service with proper file extraction and path handling
 * @filepath src/lib/services/import-service.ts
 */

import { storage } from '@/lib/storage/json-storage';
import { ImportMetadata, ImportOptions, ImportProgress, ImportResult, DuplicateImage } from '@/lib/types/import';
import { ImageRecord } from '@/lib/types';
import { ImportMetadataSchema } from '@/lib/validations';
import { nanoid } from 'nanoid';
import path from 'path';
import { writeFile, mkdir, access } from 'fs/promises';
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
    
    console.log(`🔄 Processing ${metadata.images.length} images for session ${sessionId}`);
    console.log(`📁 Import mode: ${options.mode}, ZIP: ${isZip}`);
    
    // Load ZIP if needed for image files
    let zip: JSZip | null = null;
    if (isZip) {
      zip = new JSZip();
      await zip.loadAsync(arrayBuffer);
      console.log('📦 ZIP loaded successfully');
      
      // List all files in ZIP for debugging
      const zipFiles = Object.keys(zip.files);
      console.log('📂 Files in ZIP:', zipFiles);
    }
    
    // Get existing images for duplicate detection
    const existingImages = options.mode === 'merge' 
      ? await storage.listImages(sessionId)
      : [];
    
    console.log(`🔍 Found ${existingImages.length} existing images for duplicate detection`);
    
    // Process each image
    for (let i = 0; i < metadata.images.length; i++) {
      const imageData = metadata.images[i];
      
      this.updateProgress({
        processed: i + 1,
        currentFile: imageData.original_filename,
      });
      
      try {
        console.log(`\n📸 Processing image ${i + 1}/${metadata.images.length}: ${imageData.original_filename}`);
        
        // Skip if no required data
        if (!imageData.filename || !imageData.original_filename) {
          console.warn('⚠️  Skipping image with missing filename data');
          skipped++;
          continue;
        }
        
        // Check for duplicates if merging
        if (options.mode === 'merge') {
          const duplicate = await this.checkDuplicate(imageData, existingImages);
          
          if (duplicate) {
            console.log(`🔄 Found duplicate: ${duplicate.reason}`);
            if (options.duplicateStrategy === 'skip') {
              console.log('⏭️  Skipping duplicate');
              skipped++;
              continue;
            } else if (options.duplicateStrategy === 'replace') {
              console.log('🔄 Replacing existing image');
              await storage.deleteImage(duplicate.existing.id);
            }
            // For 'rename' strategy, we'll add a suffix to the filename
          }
        }
        
        // Generate new filename
        const newFilename = (options.duplicateStrategy === 'rename' && options.mode === 'merge')
          ? this.generateUniqueFilename(imageData.filename!, existingImages)
          : imageData.filename!;
        
        console.log(`📝 Using filename: ${newFilename}`);
        
        // **CRITICAL FIX**: Build correct paths
        const sessionPath = path.join(process.cwd(), 'data', 'sessions', sessionId);
        const imagesPath = path.join(sessionPath, 'images');
        const absoluteFilePath = path.join(imagesPath, newFilename);
        
        console.log(`📁 Target directory: ${imagesPath}`);
        console.log(`📄 Target file path: ${absoluteFilePath}`);
        
        // Ensure directory exists
        await mkdir(imagesPath, { recursive: true });
        console.log('✅ Directory created/verified');
        
        // **CRITICAL FIX**: Handle file extraction properly
        if (isZip && zip) {
          // Handle ZIP import - extract image file
          if (!imageData.file_path) {
            console.warn(`⚠️  No file_path in metadata for ${imageData.original_filename}`);
            skipped++;
            continue;
          }
          
          // Clean up the path from metadata (remove leading slashes)
          const metadataPath = imageData.file_path.replace(/^\/+/, '');
          console.log(`🔍 Looking for image in ZIP at: "${metadataPath}"`);
          
          // Try to find the file in ZIP
          const imageFile = zip.file(metadataPath);
          
          if (!imageFile) {
            console.error(`❌ Image file not found in ZIP: ${metadataPath}`);
            console.log('📂 Available files in ZIP:', Object.keys(zip.files));
            this.progress.errors.push(`Image file not found in ZIP: ${imageData.original_filename} (path: ${metadataPath})`);
            skipped++;
            continue;
          }
          
          console.log('📦 Extracting image from ZIP...');
          const imageBuffer = await imageFile.async('nodebuffer');
          await writeFile(absoluteFilePath, imageBuffer);
          console.log(`✅ Image extracted and written to: ${absoluteFilePath}`);
          
          // Verify file was written
          try {
            await access(absoluteFilePath);
            console.log('✅ File verified on disk');
          } catch (verifyError) {
            console.error('❌ File verification failed:', verifyError);
            throw new Error(`Failed to verify written file: ${absoluteFilePath}`);
          }
          
        } else if (!isZip) {
          // JSON-only import - no image files to extract
          console.log('📄 JSON-only import - skipping file extraction');
        } else {
          console.warn('⚠️  ZIP mode but no ZIP object available');
          skipped++;
          continue;
        }
        
        // **CRITICAL FIX**: Create image record with correct data
        console.log('💾 Creating image record in storage...');
        
        const imageRecord = await storage.createImage({
          session_id: sessionId,
          filename: newFilename,
          original_filename: imageData.original_filename || newFilename,
          file_path: absoluteFilePath, // Storage will convert to relative
          file_size: imageData.file_size || 0,
          image_dimensions: imageData.image_dimensions || { width: 0, height: 0 },
          prompt: imageData.prompt || '',
          generator_used: imageData.generator_used || 'other',
          ai_scores: imageData.ai_scores || {},
          quality_rating: imageData.quality_rating,
          tags: imageData.tags || [],
          notes: imageData.notes || '',
          uploaded_by: userId,
        });
        
        console.log(`✅ Image record created with ID: ${imageRecord.id}`);
        imported++;
        
      } catch (error) {
        console.error('❌ Error importing image:', error);
        this.progress.errors.push(
          `Failed to import ${imageData.original_filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        skipped++;
      }
    }
    
    console.log(`\n🎉 Import complete: ${imported} imported, ${skipped} skipped`);
    
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
    
    // Check by original filename
    const sameOriginal = existing.find(e => e.original_filename === importing.original_filename);
    if (sameOriginal) {
      return {
        existing: sameOriginal,
        importing,
        reason: 'same_name',
      };
    }
    
    // Check by prompt (exact match)
    const samePrompt = existing.find(e => 
      e.prompt === importing.prompt && 
      e.generator_used === importing.generator_used &&
      e.prompt && importing.prompt // Both must have prompts
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
      newFilename = `${name}_${counter}${ext}`;
      counter++;
    }
    
    return newFilename;
  }
}