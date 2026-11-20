# CSMS Deployment Guide

## Quick Start with Docker

The easiest way to deploy CSMS is using Docker Compose:

```bash
# Clone or navigate to the CSMS directory
cd CSMS

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: localhost:5432

## Manual Deployment

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### 1. Database Setup
```sql
CREATE DATABASE csms_db;
CREATE USER csms_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE csms_db TO csms_user;
```

### 2. Backend Deployment
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate
npm run seed  # Optional: adds sample data
npm start
```

### 3. Frontend Deployment
```bash
cd frontend
npm install
npm run build
npm install -g serve
serve -s build -l 3000
```

## Production Deployment

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=csms_db
DB_USER=csms_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_very_long_secure_jwt_secret_key
PORT=5000
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### SSL with Let's Encrypt
```bash
sudo certbot --nginx -d your-domain.com
```

## Cloud Deployment Options

### Heroku
1. Create Heroku apps for frontend and backend
2. Add PostgreSQL addon
3. Set environment variables
4. Deploy using Git

### Vercel (Frontend) + Railway (Backend + DB)
1. Deploy frontend to Vercel
2. Deploy backend and database to Railway
3. Update CORS settings in backend

### AWS/DigitalOcean
1. Set up EC2/Droplet instances
2. Install Docker and Docker Compose
3. Use docker-compose.yml for deployment
4. Set up load balancer and SSL

## Monitoring and Maintenance

### Health Checks
- Backend: `GET /api/health`
- Database: Check connection in backend logs

### Backup Strategy
```bash
# Database backup
pg_dump -h localhost -U csms_user csms_db > backup.sql

# Restore
psql -h localhost -U csms_user csms_db < backup.sql
```

### Log Management
```bash
# Docker logs
docker-compose logs backend
docker-compose logs frontend

# Application logs
tail -f backend/logs/app.log
```

## Security Checklist

- [ ] Change default passwords
- [ ] Use strong JWT secret
- [ ] Enable HTTPS in production
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Database access restrictions
- [ ] Environment variable security

## Performance Optimization

- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Database indexing optimization
- [ ] Connection pooling
- [ ] Caching strategy
- [ ] Load balancing for high traffic

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL service status
   - Verify credentials in .env
   - Check network connectivity

2. **CORS Issues**
   - Update frontend URL in backend CORS config
   - Check proxy settings in frontend

3. **Build Failures**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed

4. **Performance Issues**
   - Monitor database queries
   - Check server resources
   - Optimize frontend bundle size
