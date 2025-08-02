/**
 * Health check API endpoint for monitoring
 * @filepath src/app/api/health/route.ts
 */

import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage/json-storage';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check application health
    const healthChecks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      checks: {
        storage: false,
        filesystem: false,
        sessions: 0
      }
    };

    // Test storage access
    try {
      const sessions = await storage.listSessions();
      healthChecks.checks.storage = true;
      healthChecks.checks.sessions = sessions.length;
    } catch (error) {
      healthChecks.status = 'degraded';
      healthChecks.checks.storage = false;
    }

    // Test filesystem access
    try {
      const dataDir = path.join(process.cwd(), 'data');
      await fs.access(dataDir);
      healthChecks.checks.filesystem = true;
    } catch (error) {
      healthChecks.status = 'degraded';
      healthChecks.checks.filesystem = false;
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;
    healthChecks.responseTime = `${responseTime}ms`;

    // Determine overall status
    if (!healthChecks.checks.storage || !healthChecks.checks.filesystem) {
      healthChecks.status = 'unhealthy';
      return NextResponse.json(healthChecks, { status: 503 });
    }

    return NextResponse.json(healthChecks, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }
}