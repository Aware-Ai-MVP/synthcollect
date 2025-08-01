/**
 * Enhanced export endpoint with JSON and ZIP modes
 * @filepath src/app/api/sessions/[sessionId]/export/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { storage } from '@/lib/storage/json-storage';
import { ApiResponse } from '@/lib/types';
import { readFile } from 'fs/promises';
import archiver from 'archiver';
import { Readable } from 'stream';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

// POST /api/sessions/[sessionId]/export - Export with mode selection
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
    const { mode } = await request.json();
    
    // Verify session ownership
    const sessionData = await storage.getSession(sessionId);
    if (!sessionData || sessionData.created_by !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found or access denied',
      }, { status: 404 });
    }
    
    // Get all images
    const images = await storage.listImages(sessionId);
    
    if (mode === 'json') {
      // JSON only export
      const exportData = {
        session: sessionData,
        images,
        export_timestamp: new Date().toISOString(),
        export_version: '1.0.0',
      };
      
      return NextResponse.json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="${sessionData.name.replace(/\s+/g, '_')}_export.json"`,
        },
      });
    } else if (mode === 'full') {
      // Full export with images
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });
      
      const chunks: Uint8Array[] = [];
      
      archive.on('data', (chunk) => chunks.push(chunk));
      
      // Create metadata with relative paths
      const exportData = {
        session: sessionData,
        images: images.map(img => ({
          ...img,
          file_path: `images/${img.filename}`, // Relative path
        })),
        export_timestamp: new Date().toISOString(),
        export_version: '1.0.0',
      };
      
      // Add metadata.json
      archive.append(JSON.stringify(exportData, null, 2), { 
        name: 'metadata.json' 
      });
      
      // Add all images
      for (const image of images) {
        try {
          const imageBuffer = await readFile(image.file_path);
          archive.append(imageBuffer, { 
            name: `images/${image.filename}` 
          });
        } catch (error) {
          console.error(`Failed to add image ${image.filename}:`, error);
        }
      }
      
      await archive.finalize();
      
      const buffer = Buffer.concat(chunks);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${sessionData.name.replace(/\s+/g, '_')}_full_export.zip"`,
        },
      });
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid export mode',
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export session',
    }, { status: 500 });
  }
}