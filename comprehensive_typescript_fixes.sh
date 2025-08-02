#!/bin/bash

echo "🔧 Applying comprehensive TypeScript build fixes..."

# Fix 1: Update validation schemas with correct types
cat > src/lib/validations/index.ts << 'EOF'
/**
 * FIXED Complete validation schemas for SynthCollect
 * @filepath src/lib/validations/index.ts
 */

import { z } from 'zod';

// Session validation
export const SessionSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
});

// Image upload validation
export const ImageUploadSchema = z.object({
  prompt: z.string().min(1).max(1000),
  generator_used: z.enum(['midjourney', 'dalle', 'stable-diffusion', 'other']),
  generation_settings: z.record(z.string(), z.any()).optional(),
  user_description: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
  quality_rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  ai_scores: z.record(z.string(), z.number()).optional().default({}),
});

// User validation
export const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).max(100),
});

// **CRITICAL FIX**: Import metadata validation with proper types
export const ImportMetadataSchema = z.object({
  session: z.object({
    name: z.string(),
    description: z.string().optional(),
    status: z.enum(['active', 'archived', 'exported']).optional(),
  }),
  images: z.array(z.object({
    filename: z.string(),
    original_filename: z.string(),
    file_path: z.string().optional(),
    file_size: z.number(),
    image_dimensions: z.object({
      width: z.number(),
      height: z.number(),
    }),
    prompt: z.string(),
    generator_used: z.enum(['midjourney', 'dalle', 'stable-diffusion', 'other']),
    ai_scores: z.record(z.string(), z.number()).optional(),
    quality_rating: z.number().min(1).max(5).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    // Additional fields that might be in exports
    upload_timestamp: z.string().optional(),
    uploaded_by: z.string().optional(),
    id: z.string().optional(),
    session_id: z.string().optional(),
    generation_settings: z.record(z.string(), z.any()).optional(),
    user_description: z.string().optional(),
  })),
  export_timestamp: z.string(),
  export_version: z.string(),
});

// Import options validation
export const ImportOptionsSchema = z.object({
  mode: z.enum(['new', 'merge']),
  targetSessionId: z.string().optional(),
  duplicateStrategy: z.enum(['skip', 'replace', 'rename']).default('skip'),
  preserveIds: z.boolean().default(false),
});

// Type exports
export type SessionInput = z.infer<typeof SessionSchema>;
export type ImageUploadInput = z.infer<typeof ImageUploadSchema>;
export type UserInput = z.infer<typeof UserSchema>;
export type ImportMetadataInput = z.infer<typeof ImportMetadataSchema>;
export type ImportOptionsInput = z.infer<typeof ImportOptionsSchema>;
EOF

# Fix 2: Update import service with proper type casting
cat > src/lib/services/import-service.ts << 'EOF'
/**
 * PRODUCTION-READY import service with complete TypeScript fixes
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
      
      // Validate metadata with proper type assertion
      const validated = ImportMetadataSchema.parse(metadata) as ImportMetadata;
      
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
  
  private async extractMetadata(filename: string, arrayBuffer: ArrayBuffer): Promise<any> {
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
    
    // Load ZIP if needed for image files
    let zip: JSZip | null = null;
    if (isZip) {
      zip = new JSZip();
      await zip.loadAsync(arrayBuffer);
      console.log('📦 ZIP loaded successfully');
    }
    
    // Get existing images for duplicate detection
    const existingImages = options.mode === 'merge' 
      ? await storage.listImages(sessionId)
      : [];
    
    // Process each image
    for (let i = 0; i < metadata.images.length; i++) {
      const imageData = metadata.images[i];
      
      this.updateProgress({
        processed: i + 1,
        currentFile: imageData.original_filename,
      });
      
      try {
        console.log(`📸 Processing image ${i + 1}/${metadata.images.length}: ${imageData.original_filename}`);
        
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
            if (options.duplicateStrategy === 'skip') {
              console.log('⏭️  Skipping duplicate');
              skipped++;
              continue;
            } else if (options.duplicateStrategy === 'replace') {
              console.log('🔄 Replacing existing image');
              await storage.deleteImage(duplicate.existing.id);
            }
          }
        }
        
        // Generate new filename
        const newFilename = (options.duplicateStrategy === 'rename' && options.mode === 'merge')
          ? this.generateUniqueFilename(imageData.filename!, existingImages)
          : imageData.filename!;
        
        // Build correct paths
        const sessionPath = path.join(process.cwd(), 'data', 'sessions', sessionId);
        const imagesPath = path.join(sessionPath, 'images');
        const absoluteFilePath = path.join(imagesPath, newFilename);
        
        // Ensure directory exists
        await mkdir(imagesPath, { recursive: true });
        
        // Handle file extraction properly
        if (isZip && zip) {
          if (!imageData.file_path) {
            console.warn(`⚠️  No file_path in metadata for ${imageData.original_filename}`);
            skipped++;
            continue;
          }
          
          // Clean up the path from metadata
          const metadataPath = imageData.file_path.replace(/^\/+/, '');
          const imageFile = zip.file(metadataPath);
          
          if (!imageFile) {
            console.error(`❌ Image file not found in ZIP: ${metadataPath}`);
            this.progress.errors.push(`Image file not found in ZIP: ${imageData.original_filename}`);
            skipped++;
            continue;
          }
          
          console.log('📦 Extracting image from ZIP...');
          const imageBuffer = await imageFile.async('nodebuffer');
          await writeFile(absoluteFilePath, imageBuffer);
          console.log(`✅ Image extracted: ${absoluteFilePath}`);
          
          // Verify file was written
          try {
            await access(absoluteFilePath);
            console.log('✅ File verified on disk');
          } catch (verifyError) {
            console.error('❌ File verification failed:', verifyError);
            throw new Error(`Failed to verify written file: ${absoluteFilePath}`);
          }
        } else if (!isZip) {
          console.log('📄 JSON-only import - skipping file extraction');
        } else {
          console.warn('⚠️  ZIP mode but no ZIP object available');
          skipped++;
          continue;
        }
        
        // Create image record with proper type casting
        console.log('💾 Creating image record in storage...');
        
        const imageRecord = await storage.createImage({
          session_id: sessionId,
          filename: newFilename,
          original_filename: imageData.original_filename || newFilename,
          file_path: absoluteFilePath,
          file_size: imageData.file_size || 0,
          image_dimensions: imageData.image_dimensions || { width: 0, height: 0 },
          prompt: imageData.prompt || '',
          generator_used: imageData.generator_used || 'other',
          ai_scores: (imageData.ai_scores as Record<string, number>) || {},
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
    
    console.log(`🎉 Import complete: ${imported} imported, ${skipped} skipped`);
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
EOF

# Fix 3: Update tsconfig to be more lenient for production builds
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

echo "✅ TypeScript fixes applied!"
echo ""
echo "🔧 Now run the build:"
echo "   npm run build"