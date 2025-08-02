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
   NEXTAUTH_URL=http://localhost:3050
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - URL: http://localhost:3050
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

## 🚀 Deployment Guide

### Prerequisites
- Node.js 18.17+ 
- npm 9.0+
- PM2 (for production process management)
- nginx (optional, for reverse proxy)

### Environment Setup

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd synthcollect
   ```

2. **Install dependencies**
   ```bash
   npm ci --only=production
   ```

3. **Environment configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   **Critical environment variables:**
   ```env
   # REQUIRED: 32+ character random string
   NEXTAUTH_SECRET=your-super-secret-key-32-chars-minimum
   
   # REQUIRED: Full URL of your deployment
   NEXTAUTH_URL=https://synthcollect.yourdomain.com
   
   # REQUIRED: Production mode
   NODE_ENV=production
   
   # OPTIONAL: Custom port (default: 3000)
   PORT=3000
   ```

### Production Deployment

#### Option 1: PM2 (Recommended)
```bash
# Build application
npm run build

# Install PM2 globally
npm install -g pm2

# Start application
pm2 start npm --name "synthcollect" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**PM2 Management Commands:**
```bash
pm2 list                    # List all processes
pm2 logs synthcollect       # View logs
pm2 restart synthcollect    # Restart app
pm2 stop synthcollect       # Stop app
pm2 delete synthcollect     # Remove app
pm2 monit                   # Monitor resources
```

#### Option 2: Direct Node.js
```bash
npm run build
npm start
```

#### Option 3: Docker
```bash
# Build image
docker build -t synthcollect .

# Run container
docker run -d \
  --name synthcollect \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e NEXTAUTH_SECRET=your-secret \
  -e NEXTAUTH_URL=https://synthcollect.yourdomain.com \
  synthcollect
```

### Reverse Proxy (nginx)

Create `/etc/nginx/sites-available/synthcollect`:
```nginx
server {
    listen 80;
    server_name synthcollect.yourdomain.com;

    location / {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and restart nginx:
```bash
sudo ln -s /etc/nginx/sites-available/synthcollect /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d synthcollect.yourdomain.com
```

### Data Backup Strategy

**Automated backup script** (`scripts/backup.sh`):
```bash
#!/bin/bash
BACKUP_DIR="/backups/synthcollect"
APP_DATA="/path/to/synthcollect/data"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf "$BACKUP_DIR/synthcollect_backup_$DATE.tar.gz" $APP_DATA

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
```

**Setup daily backups:**
```bash
chmod +x scripts/backup.sh
crontab -e
# Add: 0 2 * * * /path/to/synthcollect/scripts/backup.sh
```

### Monitoring & Health Checks

**Health check endpoint:** `GET /api/health`

**Basic monitoring with PM2:**
```bash
pm2 install pm2-logrotate    # Log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Security Considerations

1. **File Permissions:**
   ```bash
   chmod 755 synthcollect/
   chmod -R 644 synthcollect/data/
   chown -R app:app synthcollect/
   ```

2. **Firewall:**
   ```bash
   sudo ufw allow 22          # SSH
   sudo ufw allow 80          # HTTP
   sudo ufw allow 443         # HTTPS
   sudo ufw enable
   ```

3. **Environment Variables:**
   - Never commit `.env*` files to git
   - Use strong NEXTAUTH_SECRET (32+ characters)
   - Regenerate secrets for production

### Performance Optimization

1. **Enable gzip compression** (nginx):
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **Static file caching** (nginx):
   ```nginx
   location /_next/static/ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

### Troubleshooting

**Common issues:**

1. **Port already in use:**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

2. **Permission denied for data directory:**
   ```bash
   sudo chown -R $USER:$USER data/
   chmod -R 755 data/
   ```

3. **Environment variables not loading:**
   ```bash
   # Check if .env.local exists and has correct values
   cat .env.local
   ```

4. **NextAuth errors:**
   - Verify NEXTAUTH_SECRET is set
   - Ensure NEXTAUTH_URL matches deployment URL
   - Check for trailing slashes in URLs

**Logs location:**
- PM2 logs: `~/.pm2/logs/`
- Application logs: Check PM2 logs or stdout
- nginx logs: `/var/log/nginx/`

### Scaling Considerations

**Current limitations:**
- JSON file storage (suitable for ~10K images)
- Single server deployment
- No real-time collaboration

**Future scaling options:**
- Database migration (PostgreSQL ready)
- Load balancer with multiple instances
- CDN for image serving
- Redis for session storage


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
