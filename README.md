# SynthCollect - AI Training Data Collection System

<div align="center">
  <img src="public/logo.png" alt="SynthCollect Logo" width="200" />
  <p><strong>Systematic collection and management of AI-generated images for machine learning datasets</strong></p>
</div>

## 🚀 Overview

SynthCollect is a production-ready web application designed to streamline the collection, annotation, and organization of AI-generated facial images for training machine learning models. Built for AwareAI's fatigue detection system, it provides a professional workflow for managing synthetic training data at scale.

## ✨ Features

### Core Functionality
- 📁 **Session Management** - Organize images into logical collections
- 🖼️ **Drag-and-Drop Upload** - Batch upload with metadata annotation
- 🤖 **Flexible AI Scoring** - Configurable scoring fields with AI/manual toggle
- 📊 **Export System** - JSON metadata or full ZIP with images
- 🌓 **Dark Mode** - System-aware theme with manual override
- 🔐 **Secure Authentication** - Session-based auth with ownership validation

### Technical Highlights
- 🏗️ **Storage Abstraction** - Swappable storage backend (currently JSON, ready for DB)
- 📏 **Image Processing** - Automatic dimension extraction and validation
- ♻️ **Image Replacement** - Update images while preserving metadata
- 🎯 **Type Safety** - Full TypeScript coverage with runtime validation
- 🚄 **Performance** - Optimized with lazy loading and caching

## 🛠️ Tech Stack

- **Framework**: Next.js 15.4.5 (App Router)
- **Language**: TypeScript 5.7.2
- **Styling**: Tailwind CSS + Shadcn/ui
- **State**: Zustand
- **Auth**: NextAuth v4
- **Validation**: Zod
- **Image Processing**: Sharp

## 📋 Prerequisites

- Node.js >= 18.17.0
- npm >= 9.0.0

## 🏃‍♂️ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/awareai/synthcollect.git
   cd synthcollect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   NEXTAUTH_SECRET=your-32-character-secret-here
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - URL: http://localhost:3000
   - Default credentials: `test@example.com` / `testpass123`

## 📚 Usage Guide

### Creating a Session
1. Click "New Session" on the dashboard
2. Enter a descriptive name and optional description
3. Click "Create Session"

### Uploading Images
1. Open a session
2. Drag and drop images or click to select
3. For each image:
   - Enter the AI prompt used to generate it
   - Select the AI generator (Midjourney, DALL-E, etc.)
   - Optionally rate quality and add notes
   - Toggle AI scoring fields between manual/AI modes
4. Click "Upload"

### Managing Images
- **View**: Click on any image for full size
- **Edit**: Click ⋮ → "Edit Details" to update metadata
- **Replace**: Hover over image in edit dialog to replace file
- **Delete**: Click ⋮ → "Delete" with confirmation

### Exporting Data
1. Click "Export" in session header
2. Choose export mode:
   - **JSON Only**: Metadata for analysis
   - **Full Export**: ZIP with images and metadata

## 🏗️ Architecture

```
src/
├── app/                # Next.js pages and API routes
├── components/         # React components
│   ├── ui/            # Base UI components
│   ├── shared/        # Reusable components
│   └── [feature]/     # Feature-specific
├── lib/               # Core logic
│   ├── storage/       # Storage abstraction
│   ├── auth/          # Authentication
│   └── config/        # Configuration
└── stores/            # State management
```

### Storage Structure
```
data/
├── sessions/
│   └── [session-id]/
│       ├── session_config.json
│       ├── metadata.json
│       └── images/
└── exports/
```

## 🔧 Configuration

### AI Scoring Fields
Edit `src/lib/config/scoring-fields.json` to add/modify scoring fields:
```json
{
  "fields": [
    {
      "name": "field_name",
      "type": "number",
      "min": 0,
      "max": 1,
      "description": "Field description",
      "required": false
    }
  ]
}
```

### Application Settings
Edit `src/lib/config/app-config.json` for app-wide settings.

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t synthcollect .
docker run -p 3000:3000 synthcollect
```

### Environment Variables
- `NEXTAUTH_SECRET`: 32+ character secret for auth
- `NEXTAUTH_URL`: Full URL of deployment
- `NODE_ENV`: Set to "production"

## 🔒 Security

- JWT-based authentication with httpOnly cookies
- Session validation on all API endpoints
- Input validation with Zod schemas
- File type and size restrictions
- XSS protection via React
- CSRF protection via NextAuth

## 🐛 Known Issues

1. **Scale Limitation**: JSON storage suitable for ~10k images
2. **User Management**: Currently uses in-memory store
3. **Search**: Basic functionality, needs enhancement
4. **Backups**: Manual process, automation planned

## 🗺️ Roadmap

- [ ] PostgreSQL database migration
- [ ] Advanced search with filters
- [ ] Real-time collaboration
- [ ] Automated backups to S3
- [ ] AI scoring pipeline integration
- [ ] Bulk operations UI
- [ ] Analytics dashboard

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for AwareAI.

## 👥 Team

Developed for AwareAI's machine learning initiatives.

## 📞 Support

For issues or questions:
- Create an issue in the repository
- Contact the development team

---

<div align="center">
  <p>Built with ❤️ for better AI training data management</p>
</div>
