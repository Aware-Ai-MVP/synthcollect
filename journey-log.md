# SynthCollect Development Journey Log (LLM-Optimized)

## Project Metadata
```json
{
  "project_name": "SynthCollect",
  "version": "1.0.0",
  "purpose": "AI training data collection system for facial image datasets",
  "client": "AwareAI",
  "deployment_target": "synthcollect.awareai.ai",
  "development_completed": "2024-11-27",
  "production_ready": true
}
```

## Technology Stack
```json
{
  "framework": "Next.js 15.4.5",
  "language": "TypeScript 5.7.2",
  "styling": "Tailwind CSS + Shadcn/ui",
  "state": "Zustand 5.0.2",
  "auth": "NextAuth 4.24.11",
  "validation": "Zod 3.24.1",
  "storage": "JSON filesystem (upgradeable)",
  "image_processing": "Sharp",
  "archiving": "Archiver",
  "deployment": "Node.js 18.17+"
}
```

## Architecture Overview

### Directory Structure
```
synthcollect/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── sessions/      # Session CRUD + images
│   │   │   └── images/        # Image serving
│   │   ├── auth/              # Auth pages
│   │   └── sessions/          # Session detail pages
│   ├── components/
│   │   ├── ui/                # Shadcn primitives
│   │   ├── layout/            # Header, navigation
│   │   ├── sessions/          # Session-specific
│   │   ├── upload/            # Upload components
│   │   └── shared/            # Reusable (AI scoring)
│   ├── lib/
│   │   ├── auth/              # Auth configuration
│   │   ├── config/            # App + scoring config
│   │   ├── storage/           # Storage abstraction
│   │   ├── types/             # TypeScript interfaces
│   │   ├── utils/             # Utilities
│   │   └── validations/       # Zod schemas
│   ├── stores/                # Zustand stores
│   └── hooks/                 # Custom React hooks
├── data/                      # File storage
│   ├── sessions/              # Session data
│   ├── exports/               # Export cache
│   └── image-mapping.json     # Image lookup
└── public/                    # Static assets
```

### Core Design Patterns
1. **Storage Abstraction**: Interface-based design for future database migration
2. **Component Composition**: Shared AI scoring component for DRY
3. **State Management**: Centralized Zustand store with actions
4. **Type Safety**: Full TypeScript coverage with Zod runtime validation
5. **Error Boundaries**: Comprehensive error handling at all levels

## Implementation Timeline

### Phase 1: Foundation (Steps 1-2)
```json
{
  "completed": [
    "Project initialization with Next.js 15",
    "TypeScript interfaces for all entities",
    "Storage abstraction layer",
    "JSON file-based storage implementation",
    "Configurable AI scoring fields system",
    "Utility functions and helpers"
  ],
  "key_decisions": {
    "storage": "JSON files for MVP, interface for future DB",
    "ids": "nanoid for collision-resistant IDs",
    "config": "JSON files for runtime configuration"
  }
}
```

### Phase 2: Authentication & API (Steps 3-4)
```json
{
  "completed": [
    "NextAuth v4 integration (downgraded from v5 beta)",
    "Session-based auth with JWT",
    "Protected API routes with ownership validation",
    "RESTful API design with consistent responses",
    "Middleware for route protection",
    "User session management"
  ],
  "security_measures": [
    "bcrypt password hashing",
    "JWT session tokens",
    "Ownership validation on all operations",
    "Input validation with Zod"
  ]
}
```

### Phase 3: UI Implementation (Steps 4-5)
```json
{
  "completed": [
    "Responsive dashboard with session cards",
    "Drag-and-drop image upload",
    "Real-time image grid display",
    "Session management interface",
    "Dark mode support with system detection",
    "Toast notifications for all actions"
  ],
  "ui_patterns": [
    "Optimistic updates",
    "Loading states",
    "Error boundaries",
    "Hover interactions",
    "Keyboard accessibility"
  ]
}
```

### Phase 4: Advanced Features (Steps 6-10)
```json
{
  "completed": [
    "Image dimension extraction with Sharp",
    "Multi-mode export (JSON/ZIP)",
    "Image replacement functionality",
    "Edit dialog with all metadata",
    "AI scoring toggle system",
    "Unified scoring component"
  ],
  "technical_achievements": [
    "Zero-config AI field system",
    "Portable ZIP exports",
    "Image cache busting",
    "Component reusability"
  ]
}
```

## API Documentation

### Authentication
```typescript
// POST /api/auth/signin
// Credentials: { email, password }
// Returns: Session cookie

// GET /api/auth/session
// Returns: Current user session

// POST /api/auth/signout
// Clears session
```

### Sessions API
```typescript
// GET /api/sessions
// Returns: User's sessions[]

// POST /api/sessions
// Body: { name, description? }
// Returns: Created session

// GET /api/sessions/[id]
// Returns: Session details

// DELETE /api/sessions/[id]
// Deletes session and images
```

### Images API
```typescript
// GET /api/sessions/[id]/images
// Returns: Session images[]

// POST /api/sessions/[id]/images
// Body: FormData { file, metadata }
// Returns: Created image record

// GET /api/images/[id]
// Returns: Image file stream

// PATCH /api/images/[id]
// Body: Updated metadata
// Returns: Updated record

// POST /api/images/[id]
// Body: FormData { file }
// Replaces image file

// DELETE /api/images/[id]
// Removes image and metadata
```

### Export API
```typescript
// POST /api/sessions/[id]/export
// Body: { mode: 'json' | 'full' }
// Returns: JSON or ZIP file
```

## Data Models

### Core Entities
```typescript
interface Session {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  image_count: number;
  status: 'active' | 'archived' | 'exported';
  export_history: ExportRecord[];
}

interface ImageRecord {
  id: string;
  session_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  image_dimensions: { width: number; height: number };
  prompt: string;
  generator_used: 'midjourney' | 'dalle' | 'stable-diffusion' | 'other';
  ai_scores?: Record<string, number>;
  quality_rating?: number;
  upload_timestamp: string;
  uploaded_by: string;
}
```

### Storage Structure
```
data/
├── sessions/
│   └── {session-id}/
│       ├── session_config.json    # Session metadata
│       ├── metadata.json          # Images metadata
│       └── images/                # Image files
├── exports/                       # Export cache
└── image-mapping.json            # ID to session mapping
```

## Configuration System

### AI Scoring Fields (`src/lib/config/scoring-fields.json`)
```json
{
  "fields": [
    {
      "name": "alertness_level",
      "type": "number",
      "min": 0,
      "max": 1,
      "description": "Level of alertness",
      "required": false
    }
  ]
}
```

### App Config (`src/lib/config/app-config.json`)
```json
{
  "storage": {
    "maxFileSize": 10485760,
    "allowedFormats": ["jpg", "jpeg", "png", "webp"]
  }
}
```

## Security Considerations

1. **Authentication**: JWT-based with httpOnly cookies
2. **Authorization**: Ownership validation on all resources
3. **Input Validation**: Zod schemas for all user input
4. **File Security**: Type validation, size limits
5. **XSS Prevention**: React's built-in protections
6. **CSRF**: NextAuth's built-in protection

## Performance Optimizations

1. **Image Loading**: Lazy loading with native browser API
2. **State Management**: Minimal re-renders with Zustand
3. **File Serving**: Immutable cache headers
4. **Bundle Size**: Tree-shaking, dynamic imports
5. **Database Queries**: In-memory caching for JSON

## Known Limitations & Future Improvements

### Current Limitations
1. In-memory user store (needs database)
2. JSON file storage (scalability limit ~10k images)
3. No real-time collaboration
4. Basic search functionality
5. No automated backups

### Planned Improvements
```json
{
  "database": "PostgreSQL migration path ready",
  "search": "Full-text search with filters",
  "realtime": "WebSocket for live updates",
  "backup": "Automated S3 backups",
  "ai_integration": "Automated scoring pipeline"
}
```

## Deployment Guide

### Environment Variables
```env
NEXTAUTH_SECRET=          # 32+ character secret
NEXTAUTH_URL=             # https://synthcollect.awareai.ai
NODE_ENV=production
```

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Critical Implementation Details

### AI Scoring State Management
- Default: All fields set to "AI will decide"
- Toggle enables manual slider input
- Only manual values sent to backend
- Edit mode preserves existing values

### File Upload Flow
1. Client-side preview generation
2. Sequential upload for reliability
3. Metadata validation before upload
4. Success/failure tracking per file
5. Automatic session refresh

### Dark Mode Implementation
- System preference detection
- LocalStorage persistence
- CSS variables for theming
- Smooth transitions

## Bug Fixes Applied

1. **Select Component**: Fixed empty string value error
2. **Params Await**: Next.js 15 dynamic route fix
3. **Infinite Loops**: Removed useEffect onChange calls
4. **Image Serving**: Fixed 405 method errors
5. **Hydration**: Resolved theme provider issues

## Testing Checklist

- [ ] Authentication flow
- [ ] Session CRUD operations
- [ ] Image upload with metadata
- [ ] AI scoring toggle behavior
- [ ] Export both modes
- [ ] Dark mode consistency
- [ ] Error handling
- [ ] Edge cases

## Handover Notes

### For Next Developer
1. **State Management**: All in Zustand stores
2. **Styling**: Tailwind utilities + Shadcn components
3. **Types**: Full TypeScript, check interfaces
4. **Storage**: Abstract interface, easy to swap
5. **Config**: JSON files in lib/config

### For Deployment
1. Set environment variables
2. Configure domain/SSL
3. Set up backup strategy
4. Monitor disk usage
5. Plan database migration at scale

### For Feature Addition
1. Follow existing patterns
2. Add types to interfaces
3. Update validation schemas
4. Test dark mode support
5. Document in journey log

## Commands Reference
```bash
# Development
npm run dev

# Production
npm run build
npm start

# Type checking
npm run type-check

# Add UI component
npx shadcn@latest add [component]
```

This journey log is optimized for LLM understanding with:
- Structured JSON blocks for easy parsing
- Clear categorization of information
- Complete technical details
- No ambiguity in descriptions
- Full context for any operation

### Step 11: Import/Merge Feature (Completed)

#### FEATURE_SPECIFICATION
```json
{
  "capabilities": [
    "Import from JSON export",
    "Import from ZIP with images",
    "Create new session from import",
    "Merge into existing session",
    "Duplicate detection and handling"
  ],
  "duplicate_strategies": {
    "skip": "Ignore duplicate images",
    "replace": "Overwrite existing images",
    "rename": "Import with unique names"
  }
}

### Step 12: Session Management Features (Completed)

#### FEATURE_SPECIFICATION
```json
{
  "capabilities": [
    "Edit session name and description",
    "Delete empty sessions",
    "Archive sessions",
    "Dropdown menu on hover",
    "Inline edit dialog"
  ],
  "ui_pattern": "Consistent with image management",
  "safety": "Prevent deletion of sessions with images"
}
### Phase 5: Import/Export System Fix (August 2025)
```json
{
  "critical_bug_fix": {
    "issue": "Import/Export session functionality broken - images not loading after import",
    "root_causes": [
      "Missing file_path field in ImportMetadataSchema validation",
      "Incomplete processImages method in ImportService",
      "Inconsistent path handling between export and import",
      "Poor error handling masking actual failures"
    ],
    "files_fixed": [
      "src/lib/validations/index.ts - Added missing file_path field to ImportMetadataSchema",
      "src/lib/services/import-service.ts - Complete rewrite with proper ZIP extraction",
      "src/app/api/images/[imageId]/route.ts - Enhanced error handling with multi-level file search",
      "scripts/debug-import.js - New diagnostic tool for troubleshooting imports",
      "scripts/fix-imported-sessions.js - Recovery tool for existing broken imports"
    ],
    "technical_achievements": [
      "Robust ZIP file extraction with proper path normalization",
      "Multi-level file search with auto-healing path correction", 
      "Comprehensive error logging and diagnostics",
      "Backward compatibility with existing data",
      "Production-ready import validation pipeline"
    ]
  },
  "implementation_details": {
    "import_service_improvements": [
      "Added detailed console logging for debugging",
      "Proper ArrayBuffer to JSZip conversion",
      "Robust file path handling (relative/absolute)",
      "Enhanced duplicate detection logic",
      "File verification after extraction"
    ],
    "validation_schema_fixes": [
      "Added optional file_path field to image metadata",
      "Included missing export fields (id, session_id, timestamps)",
      "Made schema more permissive for import compatibility"
    ],
    "image_api_enhancements": [
      "Multi-level file search when primary path fails",
      "Auto-healing: updates stored paths when files found elsewhere",
      "Detailed error messages showing all search attempts",
      "File existence verification before serving"
    ]
  },
  "debugging_tools_added": [
    "scripts/debug-import.js - Analyzes ZIP files and simulates import",
    "scripts/fix-imported-sessions.js - Repairs existing broken imports", 
    "scripts/diagnosis.sh - Complete system health check",
    "Enhanced console logging throughout import pipeline"
  ]
}
```

### Production Deployment Notes
```typescript
// Import/Export System Status: ✅ FIXED & TESTED
interface ImportExportSystem {
  status: 'production_ready';
  capabilities: [
    'Full ZIP export with images and metadata',
    'JSON-only export for metadata backup',
    'Robust import with file extraction',
    'Duplicate handling (skip/replace/rename)',
    'Path normalization and error recovery',
    'Comprehensive validation and logging'
  ];
  testing_checklist: [
    '✅ Create session with multiple images',
    '✅ Export session (both JSON and ZIP modes)',
    '✅ Import exported session as new session',
    '✅ Verify all images load correctly',
    '✅ Test duplicate handling strategies',
    '✅ Validate metadata preservation'
  ];
}
```

### Critical Bug Resolution Timeline
```json
{
  "issue_discovery": "Session images not loading after import - 404 errors",
  "diagnosis_phase": {
    "tools_used": ["Console logging analysis", "File system inspection", "ZIP content verification"],
    "root_cause_identified": "Validation schema missing file_path field + incomplete import logic"
  },
  "solution_implementation": {
    "approach": "Complete rewrite of import service with enhanced validation",
    "validation": "Fixed schema to include all export fields",
    "error_handling": "Multi-level file search with auto-healing",
    "testing": "Comprehensive diagnostic tools for future troubleshooting"
  },
  "verification": "Full import/export cycle working correctly"
}
```

### For Next AI Agent - Import/Export Context
```markdown
## Import/Export System Architecture

### Current Implementation Status: ✅ WORKING
- **Export**: Creates ZIP files with metadata.json + images/ folder
- **Import**: Extracts ZIP, validates metadata, recreates file structure
- **Validation**: Comprehensive Zod schemas with all required fields
- **Error Handling**: Multi-level file search with detailed logging

### Key Files to Understand:
1. `src/lib/services/import-service.ts` - Core import logic with ZIP extraction
2. `src/lib/validations/index.ts` - ImportMetadataSchema with file_path field
3. `src/app/api/images/[imageId]/route.ts` - Image serving with auto-healing
4. `scripts/debug-import.js` - Diagnostic tool for troubleshooting

### Testing Import/Export:
```bash
# Run diagnostics
node scripts/debug-import.js

# Fix existing broken imports  
node scripts/fix-imported-sessions.js

# System health check
chmod +x scripts/diagnosis.sh && ./scripts/diagnosis.sh
```

### Common Issues & Solutions:
- **Images not loading**: Check file_path in metadata, use diagnostic script
- **Import validation fails**: Ensure ZIP has metadata.json and images/ folder
- **Path issues**: Import service handles both relative/absolute paths automatically
- **Broken existing imports**: Use fix-imported-sessions.js script
```

