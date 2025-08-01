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