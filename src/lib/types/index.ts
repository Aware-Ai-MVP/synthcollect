/**
 * Core TypeScript interfaces for SynthCollect
 * @filepath src/lib/types/index.ts
 */

import { z } from 'zod';

// Session types
export interface Session {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  image_count: number;
  status: 'active' | 'archived' | 'exported';
  export_history: ExportRecord[];
}

export interface ExportRecord {
  id: string;
  exported_at: string;
  exported_by: string;
  format: 'json' | 'csv' | 'zip';
  file_path: string;
  image_count: number;
}

// Image types
export interface ImageRecord {
  id: string;
  session_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  thumbnail_path?: string;
  file_size: number;
  image_dimensions: { width: number; height: number };
  
  // Generation metadata
  prompt: string;
  generator_used: 'midjourney' | 'dalle' | 'stable-diffusion' | 'other';
  generation_settings?: Record<string, any>;
  user_description?: string;
  
  // Dynamic AI scores (loaded from config)
  ai_scores?: Record<string, number>;
  
  // Metadata
  upload_timestamp: string;
  uploaded_by: string;
  tags: string[];
  quality_rating?: number; // 1-5
  notes?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}