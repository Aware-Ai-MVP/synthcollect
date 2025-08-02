/**
 * Single session API endpoints with PATCH support
 * @filepath src/app/api/sessions/[sessionId]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { storage } from '@/lib/storage/json-storage';
import { ApiResponse } from '@/lib/types';
import { SessionSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

// GET /api/sessions/[sessionId] - Get single session
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
    const sessionData = await storage.getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found',
      }, { status: 404 });
    }
    
    // Check ownership
    if (sessionData.created_by !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden',
      }, { status: 403 });
    }
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: sessionData,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch session',
    }, { status: 500 });
  }
}

// PATCH /api/sessions/[sessionId] - Update session
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const { sessionId } = await params;
    const sessionData = await storage.getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found',
      }, { status: 404 });
    }
    
    // Check ownership
    if (sessionData.created_by !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden',
      }, { status: 403 });
    }
    
    // Parse and validate update data
    const body = await request.json();
    const validated = SessionSchema.partial().parse(body);
    
    // Update session
    const updatedSession = await storage.updateSession(sessionId, validated);
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedSession,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid input data',
      }, { status: 400 });
    }
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update session',
    }, { status: 500 });
  }
}

// DELETE /api/sessions/[sessionId] - Delete session with optional cascade
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const { sessionId } = await params;
    const { deleteImages } = await request.json().catch(() => ({ deleteImages: false }));
    
    const sessionData = await storage.getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found',
      }, { status: 404 });
    }
    
    // Check ownership
    if (sessionData.created_by !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden',
      }, { status: 403 });
    }
    
    // Check if session has images
    const images = await storage.listImages(sessionId);
    if (images.length > 0 && !deleteImages) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session contains images',
        data: { imageCount: images.length },
      }, { status: 400 });
    }
    
    // Delete all images if requested
    if (deleteImages && images.length > 0) {
      await storage.deleteAllSessionImages(sessionId);
    }
    
    // Delete session
    await storage.deleteSession(sessionId);
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete session',
    }, { status: 500 });
  }
}