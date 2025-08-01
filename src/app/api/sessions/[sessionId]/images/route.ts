/**
 * Session images API endpoints - Fixed for Next.js 15
 * @filepath src/app/api/sessions/[sessionId]/images/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { storage } from '@/lib/storage/json-storage';
import { ApiResponse } from '@/lib/types';
import { ImageUploadSchema } from '@/lib/validations';
import { generateFileName } from '@/lib/utils';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

// GET /api/sessions/[sessionId]/images - List session images
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const { sessionId } = await params;
    
    // Verify session ownership
    const sessionData = await storage.getSession(sessionId);
    if (!sessionData || sessionData.created_by !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found or access denied',
      }, { status: 404 });
    }
    
    const images = await storage.listImages(sessionId);
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: images,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch images',
    }, { status: 500 });
  }
}

// POST /api/sessions/[sessionId]/images - Upload new image
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const { sessionId } = await params;
    
    // Verify session ownership
    const sessionData = await storage.getSession(sessionId);
    if (!sessionData || sessionData.created_by !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found or access denied',
      }, { status: 404 });
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadataStr = formData.get('metadata') as string;
    
    if (!file || !metadataStr) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing file or metadata',
      }, { status: 400 });
    }
    
    // Validate metadata
    const metadata = JSON.parse(metadataStr);
    const validated = ImageUploadSchema.parse(metadata);
    
    // Generate file name and paths
    const fileName = generateFileName(file.name);
    const sessionPath = path.join(process.cwd(), 'data', 'sessions', sessionId);
    const imagesPath = path.join(sessionPath, 'images');
    const filePath = path.join(imagesPath, fileName);
    
    // Ensure directory exists
    await mkdir(imagesPath, { recursive: true });
    
    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    
    // Get image dimensions (simplified for MVP)
    const dimensions = { width: 0, height: 0 }; // TODO: Implement actual dimension reading
    
    // Create image record
    const imageRecord = await storage.createImage({
      session_id: sessionId,
      filename: fileName,
      original_filename: file.name,
      file_path: filePath,
      file_size: file.size,
      image_dimensions: dimensions,
      prompt: validated.prompt,
      generator_used: validated.generator_used,
      generation_settings: validated.generation_settings,
      user_description: validated.user_description,
      tags: validated.tags,
      quality_rating: validated.quality_rating,
      notes: validated.notes,
      uploaded_by: session.user.id!,
    });
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: imageRecord,
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid metadata',
      }, { status: 400 });
    }
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    }, { status: 500 });
  }
}