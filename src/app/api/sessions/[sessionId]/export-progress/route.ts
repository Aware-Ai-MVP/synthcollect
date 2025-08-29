/**
 * SERVER-SENT EVENTS (SSE) FOR REAL-TIME EXPORT PROGRESS
 * Provides live updates during export operations (FIXED VERSION)
 * @filepath src/app/api/sessions/[sessionId]/export-progress/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { storage } from '@/lib/storage/json-storage';
import { 
  ProgressStoreManager, 
  type ExportProgressData 
} from '@/lib/utils/progress-store';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

/**
 * GET /api/sessions/[sessionId]/export-progress - Stream progress updates
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  console.log('📡 Starting SSE progress stream');

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { sessionId } = await params;

    // Verify session ownership
    const sessionData = await storage.getSession(sessionId);
    if (!sessionData || sessionData.created_by !== session.user.id) {
      return new NextResponse('Session not found', { status: 404 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        console.log(`📡 SSE stream started for session: ${sessionId}`);

        // Send initial connection event
        const initialData = JSON.stringify({
          type: 'connected',
          sessionId,
          timestamp: Date.now(),
        });
        controller.enqueue(`data: ${initialData}\n\n`);

        // Poll for progress updates
        const interval = setInterval(() => {
          const progress = ProgressStoreManager.getProgress(sessionId, session.user.id!);
          
          if (progress) {
            const eventData = JSON.stringify({
              type: 'progress',
              ...progress,
              timestamp: Date.now(),
            });
            
            controller.enqueue(`data: ${eventData}\n\n`);

            // Clean up completed/errored exports after sending final update
            if (progress.status === 'complete' || progress.status === 'error') {
              setTimeout(() => {
                ProgressStoreManager.deleteProgress(sessionId, session.user.id!);
                controller.close();
                clearInterval(interval);
              }, 2000);
            }
          }
        }, 500); // Update every 500ms

        // Clean up on connection close
        request.signal?.addEventListener('abort', () => {
          console.log(`📡 SSE stream closed for session: ${sessionId}`);
          clearInterval(interval);
          controller.close();
        });

        // Auto-cleanup after 10 minutes
        setTimeout(() => {
          clearInterval(interval);
          controller.close();
        }, 10 * 60 * 1000);
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('❌ SSE Progress stream error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * POST /api/sessions/[sessionId]/export-progress - Update progress (internal use)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    const progressData: Partial<ExportProgressData> = await request.json();
    
    // Update progress using the manager
    ProgressStoreManager.updateProgress(sessionId, session.user.id, progressData);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Progress update error:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}