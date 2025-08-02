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
