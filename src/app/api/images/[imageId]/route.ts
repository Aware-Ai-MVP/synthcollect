/**
 * Enhanced image management endpoints with better error handling and diagnostics
 * @filepath src/app/api/images/[imageId]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { storage } from '@/lib/storage/json-storage';
import { readFile, access } from 'fs/promises';
import path from 'path';

interface RouteParams {
  params: Promise<{
    imageId: string;
  }>;
}

// GET /api/images/[imageId] - Serve image file with enhanced error handling
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { imageId } = await params;
    
    // Get image metadata
    const image = await storage.getImage(imageId);
    if (!image) {
      console.error(`Image metadata not found for ID: ${imageId}`);
      return new NextResponse('Image not found', { status: 404 });
    }
    
    console.log(`Serving image ${imageId}:`, {
      filename: image.filename,
      file_path: image.file_path,
      session_id: image.session_id
    });
    
    // Enhanced file path resolution
    let filePath = image.file_path;
    let fileBuffer: Buffer;
    
    try {
      // First try: Use the path as stored
      await access(filePath);
      fileBuffer = await readFile(filePath);
      console.log(`✅ File found at stored path: ${filePath}`);
    } catch (primaryError) {
      console.warn(`❌ File not found at stored path: ${filePath}`);
      
      // Second try: Construct expected path based on session structure
      const expectedPath = path.join(
        process.cwd(), 
        'data', 
        'sessions', 
        image.session_id, 
        'images', 
        image.filename
      );
      
      try {
        await access(expectedPath);
        fileBuffer = await readFile(expectedPath);
        console.log(`✅ File found at expected path: ${expectedPath}`);
        
        // Update the stored path to prevent future issues
        await storage.updateImage(imageId, { file_path: expectedPath });
        console.log(`🔧 Updated stored path for image ${imageId}`);
        
      } catch (secondaryError) {
        console.warn(`❌ File not found at expected path: ${expectedPath}`);
        
        // Third try: Search for the file in common locations
        const searchPaths = [
          // Legacy direct session path
          path.join(process.cwd(), 'data', 'sessions', image.session_id, image.filename),
          // Root data path
          path.join(process.cwd(), 'data', image.filename),
          // Alternative relative interpretations
          path.join(process.cwd(), image.file_path.replace(/^\/+/, '')),
        ];
        
        let found = false;
        for (const searchPath of searchPaths) {
          try {
            await access(searchPath);
            fileBuffer = await readFile(searchPath);
            console.log(`✅ File found at search path: ${searchPath}`);
            
            // Update the stored path
            await storage.updateImage(imageId, { file_path: searchPath });
            console.log(`🔧 Updated stored path for image ${imageId} to ${searchPath}`);
            found = true;
            break;
          } catch {
            // Continue searching
          }
        }
        
        if (!found) {
          console.error(`❌ Image file completely missing for ${imageId}:`, {
            stored_path: image.file_path,
            expected_path: expectedPath,
            searched_paths: searchPaths,
            filename: image.filename,
            session_id: image.session_id
          });
          
          return new NextResponse(
            `Image file not found. Searched locations:\n- ${image.file_path}\n- ${expectedPath}\n- ${searchPaths.join('\n- ')}`, 
            { status: 404 }
          );
        }
      }
    }
    
    // Determine content type
    const ext = path.extname(image.filename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    }[ext] || 'image/jpeg';
    
    // Return image with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse(
      `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      { status: 500 }
    );
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