# Deployment Guide

## VPS Deployment

### Prerequisites
- Ubuntu 20.04+ or similar
- Node.js 18.17+
- nginx (optional, for reverse proxy)
- PM2 for process management

### Steps

1. **Clone and Setup**
   ```bash
   git clone [repository]
   cd synthcollect
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with production values
   ```

3. **Build Application**
   ```bash
   npm run build
   ```

4. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start npm --name "synthcollect" -- start
   pm2 save
   pm2 startup
   ```

5. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name synthcollect.awareai.ai;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **SSL with Certbot**
   ```bash
   sudo certbot --nginx -d synthcollect.awareai.ai
   ```

## Docker Deployment

### Build and Run
```bash
docker build -t synthcollect .
docker run -d \
  --name synthcollect \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e NEXTAUTH_SECRET=your-secret \
  -e NEXTAUTH_URL=https://synthcollect.awareai.ai \
  synthcollect
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NODE_ENV=production
    restart: unless-stopped
```

## Backup Strategy

### Automated Backups
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/synthcollect"
DATA_DIR="/app/data"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" $DATA_DIR

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
```

### Cron Setup
```bash
0 2 * * * /path/to/backup.sh
```

## Monitoring

### Health Check Endpoint
Create `src/app/api/health/route.ts`:
```typescript
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
```

### Uptime Monitoring
- Use services like UptimeRobot
- Monitor endpoint: `/api/health`
- Alert on downtime

## Performance Optimization

### Next.js Optimization
```javascript
// next.config.mjs
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
};
```

### Image Optimization
- Consider CDN for images
- Implement image compression
- Use WebP format when possible

## Scaling Considerations

### Database Migration
When ready to scale beyond JSON:
1. Install PostgreSQL
2. Update storage adapter
3. Migrate existing data
4. Update connection config

### Horizontal Scaling
- Use Redis for session storage
- Implement shared file storage (S3)
- Load balancer for multiple instances