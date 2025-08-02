/**
 * Script to fix absolute paths in existing data
 * @filepath scripts/fix-paths.js
 */

const fs = require('fs').promises;
const path = require('path');

async function fixPaths() {
  const projectRoot = process.cwd();
  const dataDir = path.join(projectRoot, 'data');
  const sessionsDir = path.join(dataDir, 'sessions');
  
  console.log('Fixing absolute paths in metadata...');
  console.log('Project root:', projectRoot);
  
  // Get all sessions
  const sessions = await fs.readdir(sessionsDir);
  
  for (const sessionId of sessions) {
    const metadataPath = path.join(sessionsDir, sessionId, 'metadata.json');
    
    try {
      // Read metadata
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);
      
      // Fix image paths
      let updated = false;
      for (const imageId in metadata.images) {
        const image = metadata.images[imageId];
        if (image.file_path && path.isAbsolute(image.file_path)) {
          // Convert to relative path
          const relativePath = path.relative(projectRoot, image.file_path);
          console.log(`  ${sessionId}/${imageId}: ${image.file_path} -> ${relativePath}`);
          image.file_path = relativePath;
          updated = true;
        }
      }
      
      // Save if updated
      if (updated) {
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(`✓ Fixed paths in session ${sessionId}`);
      }
    } catch (error) {
      console.error(`Failed to process session ${sessionId}:`, error.message);
    }
  }
  
  console.log('Done!');
}

fixPaths().catch(console.error);