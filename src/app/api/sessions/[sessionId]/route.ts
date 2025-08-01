/**
 * Single session API endpoints - Fixed for Next.js 15
 * @filepath src/app/api/sessions/[sessionId]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { storage } from '@/lib/storage/json-storage';
import { ApiResponse } from '@/lib/types';

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

// DELETE /api/sessions/[sessionId] - Delete session
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