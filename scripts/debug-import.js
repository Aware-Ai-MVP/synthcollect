/**
 * Debug script to test import functionality and diagnose issues
 * @filepath scripts/debug-import.js
 */

const fs = require('fs').promises;
const path = require('path');
const JSZip = require('jszip');

async function debugImport() {
  console.log('🔧 Starting import debug process...\n');
  
  const projectRoot = process.cwd();
  const dataDir = path.join(projectRoot, 'data');
  const sessionsDir = path.join(dataDir, 'sessions');
  
  console.log('📁 Project root:', projectRoot);
  console.log('📁 Data directory:', dataDir);
  
  try {
    // 1. Check for exported files first
    const exportsDir = path.join(dataDir, 'exports');
    let zipFile = null;
    
    try {
      const exportFiles = await fs.readdir(exportsDir);
      const zipFiles = exportFiles.filter(f => f.endsWith('.zip'));
      
      if (zipFiles.length > 0) {
        zipFile = path.join(exportsDir, zipFiles[zipFiles.length - 1]); // Get latest
        console.log('🔍 Found export ZIP:', zipFile);
      }
    } catch {
      console.log('ℹ️  No exports directory found');
    }
    
    // 2. If no ZIP file found, look for uploaded files or ask user
    if (!zipFile) {
      console.log('❓ No ZIP file found. Please specify the path to your export ZIP file:');
      console.log('   Example: /path/to/your/export.zip');
      return;
    }
    
    // 3. Load and analyze ZIP file
    console.log('\n📦 Analyzing ZIP file...');
    const zipBuffer = await fs.readFile(zipFile);
    const zip = new JSZip();
    await zip.loadAsync(zipBuffer);
    
    const files = Object.keys(zip.files);
    console.log('📂 Files in ZIP:', files);
    
    // 4. Check for metadata.json
    const metadataFile = zip.file('metadata.json');
    if (!metadataFile) {
      console.error('❌ No metadata.json found in ZIP');
      return;
    }
    
    const metadataText = await metadataFile.async('text');
    const metadata = JSON.parse(metadataText);
    
    console.log('\n📋 Metadata analysis:');
    console.log('   Session name:', metadata.session?.name);
    console.log('   Images count:', metadata.images?.length || 0);
    console.log('   Export version:', metadata.export_version);
    
    // 5. Check image files in ZIP
    console.log('\n🖼️  Image files analysis:');
    const imageFiles = files.filter(f => 
      f.startsWith('images/') && 
      (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp'))
    );
    console.log('   Image files in ZIP:', imageFiles.length);
    console.log('   Image paths:', imageFiles.slice(0, 5)); // Show first 5
    
    // 6. Check metadata image records
    if (metadata.images && metadata.images.length > 0) {
      console.log('\n📝 Metadata image records:');
      for (let i = 0; i < Math.min(3, metadata.images.length); i++) {
        const img = metadata.images[i];
        console.log(`   Image ${i + 1}:`);
        console.log(`     filename: ${img.filename}`);
        console.log(`     original_filename: ${img.original_filename}`);
        console.log(`     file_path: ${img.file_path}`);
        
        // Check if the file exists in ZIP
        const relativePath = img.file_path?.replace(/^\/+/, '');
        const fileInZip = zip.file(relativePath);
        console.log(`     exists_in_zip: ${!!fileInZip}`);
      }
    }
    
    // 7. Simulate the import process
    console.log('\n🔄 Simulating import process...');
    const testSessionId = 'test-debug-session';
    const testSessionPath = path.join(sessionsDir, testSessionId);
    const testImagesPath = path.join(testSessionPath, 'images');
    
    console.log('📁 Test session path:', testSessionPath);
    
    // Create test directories
    await fs.mkdir(testImagesPath, { recursive: true });
    console.log('✅ Test directories created');
    
    // Try to extract first image
    if (metadata.images && metadata.images.length > 0) {
      const firstImage = metadata.images[0];
      const relativePath = firstImage.file_path?.replace(/^\/+/, '');
      const imageFile = zip.file(relativePath);
      
      if (imageFile) {
        console.log(`\n🎯 Testing extraction of: ${firstImage.filename}`);
        const imageBuffer = await imageFile.async('nodebuffer');
        const testFilePath = path.join(testImagesPath, firstImage.filename);
        
        await fs.writeFile(testFilePath, imageBuffer);
        console.log('✅ Test image extracted to:', testFilePath);
        
        // Verify file exists
        try {
          const stats = await fs.stat(testFilePath);
          console.log('✅ File verified - size:', stats.size, 'bytes');
        } catch (error) {
          console.error('❌ File verification failed:', error.message);
        }
        
        // Clean up test files
        await fs.rm(testSessionPath, { recursive: true, force: true });
        console.log('🧹 Test files cleaned up');
      } else {
        console.error('❌ Could not find image file in ZIP:', relativePath);
      }
    }
    
    // 8. Check current imported sessions for issues
    console.log('\n🔍 Checking existing imported sessions...');
    
    try {
      const sessions = await fs.readdir(sessionsDir);
      
      for (const sessionId of sessions) {
        const configPath = path.join(sessionsDir, sessionId, 'session_config.json');
        try {
          const configContent = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(configContent);
          
          if (config.name && config.name.includes('(Imported)')) {
            console.log(`\n📁 Imported session: ${sessionId}`);
            console.log(`   Name: ${config.name}`);
            
            const metadataPath = path.join(sessionsDir, sessionId, 'metadata.json');
            const imagesDir = path.join(sessionsDir, sessionId, 'images');
            
            try {
              const metadataContent = await fs.readFile(metadataPath, 'utf-8');
              const sessionMetadata = JSON.parse(metadataContent);
              const imageCount = Object.keys(sessionMetadata.images || {}).length;
              
              console.log(`   Images in metadata: ${imageCount}`);
              
              // Check images directory
              try {
                const imageFiles = await fs.readdir(imagesDir);
                console.log(`   Files in images dir: ${imageFiles.length}`);
                
                if (imageFiles.length !== imageCount) {
                  console.log(`   ⚠️  Mismatch: ${imageCount} in metadata vs ${imageFiles.length} on disk`);
                }
              } catch {
                console.log('   ❌ Images directory not found or empty');
              }
            } catch {
              console.log('   ❌ Could not read metadata');
            }
          }
        } catch {
          // Not a valid session
        }
      }
    } catch {
      console.log('   No sessions found');
    }
    
    console.log('\n🎉 Debug analysis complete!');
    
  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  debugImport().catch(console.error);
}

module.exports = { debugImport };