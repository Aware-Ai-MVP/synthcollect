/**
 * Sessions API endpoints - List and Create
 * @filepath src/app/api/sessions/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { storage } from '@/lib/storage/json-storage';
import { SessionSchema } from '@/lib/validations';
import { ApiResponse } from '@/lib/types';

// GET /api/sessions - List all sessions for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const sessions = await storage.listSessions(session.user.id);
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: sessions,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sessions',
    }, { status: 500 });
  }
}

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const body = await request.json();
    const validated = SessionSchema.parse(body);
    
    const newSession = await storage.createSession({
      ...validated,
      created_by: session.user.id!,
      status: 'active',
      // ADD THE MISSING PROPERTIES HERE
      image_count: 0,
      export_history: [],
    });
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: newSession,
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
      error: error instanceof Error ? error.message : 'Failed to create session',
    }, { status: 500 });
  }
}