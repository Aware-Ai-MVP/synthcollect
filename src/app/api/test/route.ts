/**
 * Test API route for storage verification
 * @filepath src/app/api/test/route.ts
 */

import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage/json-storage';

export async function GET() {
  try {
    // Test creating a session
    const session = await storage.createSession({
      name: 'Test Session',
      description: 'Testing storage implementation',
      created_by: 'test-user',
      status: 'active',
    });
    
    return NextResponse.json({
      success: true,
      message: 'Storage working correctly',
      session,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}