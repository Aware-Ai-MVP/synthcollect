/**
 * Fixed validation schemas with proper optional handling
 * @filepath src/lib/validations/index.ts
 */

import { z } from 'zod';

export const SessionSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
});

export const ImageUploadSchema = z.object({
  prompt: z.string().min(1).max(1000), // Reduced minimum to 1
  generator_used: z.enum(['midjourney', 'dalle', 'stable-diffusion', 'other']),
  generation_settings: z.record(z.any()).optional(),
  user_description: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
  quality_rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  ai_scores: z.record(z.number()).optional().default({}), // Default to empty object
});

export const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).max(100),
});

export type SessionInput = z.infer<typeof SessionSchema>;
export type ImageUploadInput = z.infer<typeof ImageUploadSchema>;
export type UserInput = z.infer<typeof UserSchema>;