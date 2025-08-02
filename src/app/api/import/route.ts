/**
 * Fixed import API endpoint
 * @filepath src/app/api/import/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { ImportService } from '@/lib/services/import-service';
import { ImportOptionsSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const optionsStr = formData.get('options') as string;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided',
      }, { status: 400 });
    }
    
    // Validate file type
    const validTypes = ['application/json', 'application/zip', 'application/x-zip-compressed'];
    const isValidType = validTypes.includes(file.type) || 
                       file.name.endsWith('.json') || 
                       file.name.endsWith('.zip');
    
    if (!isValidType) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Please upload a JSON or ZIP file.',
      }, { status: 400 });
    }
    
    // Validate options
    const options = ImportOptionsSchema.parse(JSON.parse(optionsStr));
    
    // Run import synchronously for now (can be made async with job queue later)
    const importService = new ImportService();
    const result = await importService.importData(file, options, session.user.id!);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Import API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}