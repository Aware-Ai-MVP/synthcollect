/**
 * Script to fix file paths in imported sessions
 * @filepath scripts/fix-imported-sessions.js
 */

const fs = require('fs').promises;
const path = require('path');

async function fixImportedSessions() {
  const projectRoot = process.cwd();
  const dataDir = path.join(projectRoot, 'data');
  const sessionsDir = path.join(dataDir, 'sessions');
  
  console.log('🔧 Fixing imported session file paths...');
  console.log('Project root:', projectRoot);
  
  try {
    // Get all sessions
    const sessions = await fs.readdir(sessionsDir);
    console.log(`Found ${sessions.length} sessions to check`);
    
    for (const sessionId of sessions) {
      const sessionPath = path.join(sessionsDir, sessionId);
      const metadataPath = path.join(sessionPath, 'metadata.json');
      
      try {
        // Read session config to check if it's imported
        const configPath = path.join(sessionPath, 'session_config.json');
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        
        // Skip non-imported sessions
        if (!config.name.includes('(Imported)')) {
          console.log(`⏭️  Skipping non-imported session: ${sessionId}`);
          continue;
        }
        
        console.log(`\n🔍 Checking imported session: ${sessionId} - "${config.name}"`);
        
        // Read metadata
        const content = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(content);
        
        if (!metadata.images) {
          console.log('   No images to fix');
          continue;
        }
        
        // Fix image paths
        let updated = false;
        const fixedImages = {};
        
        for (const [imageId, image] of Object.entries(metadata.images)) {
          const originalPath = image.file_path;
          
          // Check if this is a malformed import path
          if (originalPath && (
            originalPath.startsWith('images/') || 
            originalPath.includes('/images/') && !path.isAbsolute(originalPath)
          )) {
            // This looks like an import path issue
            const expectedAbsolutePath = path.join(sessionPath, 'images', image.filename);
            const correctRelativePath = path.relative(projectRoot, expectedAbsolutePath);
            
            // Check if the file actually exists where we expect it
            try {
              await fs.access(expectedAbsolutePath);
              console.log(`   ✅ Found file at expected location: ${expectedAbsolutePath}`);
              
              // Update the path to the correct relative path
              fixedImages[imageId] = {
                ...image,
                file_path: correctRelativePath
              };
              
              console.log(`   🔧 Fixed: ${originalPath} → ${correctRelativePath}`);
              updated = true;
              
            } catch (fileError) {
              console.log(`   ❌ File not found at expected location: ${expectedAbsolutePath}`);
              
              // Try to find the file elsewhere
              const possibleLocations = [
                path.join(sessionPath, image.filename), // Direct in session folder
                path.join(projectRoot, originalPath), // As specified in metadata
                path.join(projectRoot, 'data', originalPath), // In data folder
              ];
              
              let found = false;
              for (const possiblePath of possibleLocations) {
                try {
                  await fs.access(possiblePath);
                  console.log(`   🔍 Found file at: ${possiblePath}`);
                  
                  // Move to correct location
                  await fs.mkdir(path.join(sessionPath, 'images'), { recursive: true });
                  await fs.copyFile(possiblePath, expectedAbsolutePath);
                  console.log(`   📁 Moved to: ${expectedAbsolutePath}`);
                  
                  // Update metadata
                  const correctRelativePath = path.relative(projectRoot, expectedAbsolutePath);
                  fixedImages[imageId] = {
                    ...image,
                    file_path: correctRelativePath
                  };
                  
                  console.log(`   🔧 Fixed: ${originalPath} → ${correctRelativePath}`);
                  updated = true;
                  found = true;
                  break;
                } catch {
                  // Continue searching
                }
              }
              
              if (!found) {
                console.log(`   ⚠️  Could not locate file for: ${image.filename}`);
                // Keep original metadata but mark as issue
                fixedImages[imageId] = image;
              }
            }
          } else {
            // Path looks fine, keep as is
            fixedImages[imageId] = image;
          }
        }
        
        // Save if updated
        if (updated) {
          const updatedMetadata = {
            ...metadata,
            images: fixedImages
          };
          
          await fs.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2));
          console.log(`   ✅ Updated metadata for session ${sessionId}`);
        } else {
          console.log(`   ✅ No fixes needed for session ${sessionId}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to process session ${sessionId}:`, error.message);
      }
    }
    
    console.log('\n🎉 Import path fixing complete!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the fix
fixImportedSessions().catch(console.error);