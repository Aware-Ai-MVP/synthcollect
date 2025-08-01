/**
 * Fixed image management endpoints with proper exports
 * @filepath src/app/api/images/[imageId]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { storage } from '@/lib/storage/json-storage';
import { readFile } from 'fs/promises';
import path from 'path';

interface RouteParams {
  params: Promise<{
    imageId: string;
  }>;
}

// GET /api/images/[imageId] - Serve image file
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { imageId } = await params;
    
    // Get image metadata
    const image = await storage.getImage(imageId);
    if (!image) {
      return new NextResponse('Image not found', { status: 404 });
    }
    
    // Read file
    const fileBuffer = await readFile(image.file_path);
    
    // Determine content type
    const ext = path.extname(image.filename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    }[ext] || 'image/jpeg';
    
    // Return image with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Image not found', { status: 404 });
  }
}

// PATCH /api/images/[imageId] - Update image metadata
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const { imageId } = await params;
    const updates = await request.json();
    
    // Get image to verify ownership
    const image = await storage.getImage(imageId);
    if (!image) {
      return NextResponse.json({
        success: false,
        error: 'Image not found',
      }, { status: 404 });
    }
    
    // Verify session ownership
    const sessionData = await storage.getSession(image.session_id);
    if (!sessionData || sessionData.created_by !== session.user.id) {
      return NextResponse.json({
        success: false,
        error: 'Access denied',
      }, { status: 403 });
    }
    
    // Update image
    const updatedImage = await storage.updateImage(imageId, updates);
    
    return NextResponse.json({
      success: true,
      data: updatedImage,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update image',
    }, { status: 500 });
  }
}

// DELETE /api/images/[imageId] - Delete image
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const { imageId } = await params;
    
    // Get image to verify ownership
    const image = await storage.getImage(imageId);
    if (!image) {
      return NextResponse.json({
        success: false,
        error: 'Image not found',
      }, { status: 404 });
    }
    
    // Verify session ownership
    const sessionData = await storage.getSession(image.session_id);
    if (!sessionData || sessionData.created_by !== session.user.id) {
      return NextResponse.json({
        success: false,
        error: 'Access denied',
      }, { status: 403 });
    }
    
    // Delete image
    await storage.deleteImage(imageId);
    
    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image',
    }, { status: 500 });
  }
}

// POST /api/images/[imageId] - Replace image file
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const { imageId } = await params;
    
    // Get existing image
    const existingImage = await storage.getImage(imageId);
    if (!existingImage) {
      return NextResponse.json({
        success: false,
        error: 'Image not found',
      }, { status: 404 });
    }
    
    // Verify ownership
    const sessionData = await storage.getSession(existingImage.session_id);
    if (!sessionData || sessionData.created_by !== session.user.id) {
      return NextResponse.json({
        success: false,
        error: 'Access denied',
      }, { status: 403 });
    }
    
    // Parse new file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided',
      }, { status: 400 });
    }
    
    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Extract new dimensions
    let dimensions = { width: 0, height: 0 };
    try {
      const sharp = require('sharp');
      const imageMetadata = await sharp(buffer).metadata();
      dimensions = {
        width: imageMetadata.width || 0,
        height: imageMetadata.height || 0,
      };
    } catch (error) {
      console.error('Failed to extract dimensions:', error);
    }
    
    // Save new file (overwrite existing)
    const { writeFile } = await import('fs/promises');
    await writeFile(existingImage.file_path, buffer);
    
    // Update metadata
    const updatedImage = await storage.updateImage(imageId, {
      file_size: file.size,
      image_dimensions: dimensions,
      original_filename: file.name,
    });
    
    return NextResponse.json({
      success: true,
      data: updatedImage,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to replace image',
    }, { status: 500 });
  }
}