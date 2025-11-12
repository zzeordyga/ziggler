# Ziggler Task Management - Docker Setup

This project includes Docker configurations for both development and production environments.

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Git

### Development Environment

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ziggler
   ```

2. **Start the application:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/api/v1
   - Health Check: http://localhost:8080/api/v1/health

### Production Environment

1. **Using production compose file:**
   ```bash
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

2. **With Nginx reverse proxy:**
   ```bash
   docker-compose -f docker-compose.prod.yml --profile with-nginx up --build -d
   ```

## Environment Variables

### Backend Environment Variables
- `GIN_MODE`: Set to "release" for production
- `PORT`: Server port (default: 8080)
- `JWT_SECRET`: Secret key for JWT tokens (change in production!)
- `CORS_ALLOWED_ORIGINS`: Allowed CORS origins
- `CORS_ALLOW_CREDS`: Allow credentials in CORS

### Frontend Environment Variables
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_WS_URL`: WebSocket/Socket.IO URL
- `NODE_ENV`: Environment mode

## Docker Commands

### Build only specific service:
```bash
# Build backend only
docker-compose build backend

# Build frontend only
docker-compose build frontend
```

### View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop services:
```bash
docker-compose down
```

### Remove volumes (reset database):
```bash
docker-compose down -v
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │
│   (Next.js)     │◄──►│   (Go/Gin)      │
│   Port: 3000    │    │   Port: 8080    │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
                   │
         ┌─────────────────┐
         │   SQLite DB     │
         │   (Volume)      │
         └─────────────────┘
```

## Features Included in Docker Setup

### Backend Container:
- ✅ Go 1.25 runtime
- ✅ SQLite database with persistent volume
- ✅ JWT authentication
- ✅ Socket.IO real-time updates
- ✅ CORS configuration
- ✅ Health checks
- ✅ Multi-stage build for optimization

### Frontend Container:
- ✅ Node.js 20 runtime
- ✅ Next.js standalone build
- ✅ Socket.IO client
- ✅ Environment variable support
- ✅ Production optimizations
- ✅ Health checks

### Production Features:
- ✅ Nginx reverse proxy
- ✅ Rate limiting
- ✅ Security headers
- ✅ SSL/TLS ready
- ✅ Persistent data volumes
- ✅ Container restart policies

## Development

### Hot Reload Development (without Docker):
```bash
# Backend
cd backend
go run main.go

# Frontend
cd frontend
npm run dev
```

### Database

The SQLite database is stored in a Docker volume for persistence. The database file is located at `/root/data/ziggler.db` inside the backend container.

### API Documentation

Once running, the API endpoints are available at:
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/tasks` - Get tasks (with pagination)
- `POST /api/v1/tasks` - Create task
- `PUT /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task
- `GET /api/v1/stats` - Get statistics
- `GET /api/v1/users` - Get users
- Socket.IO endpoint: `/api/v1/socket.io/`

## Troubleshooting

### Common Issues:

1. **Port conflicts:**
   ```bash
   # Check what's using the ports
   lsof -i :3000
   lsof -i :8080
   ```

2. **Database issues:**
   ```bash
   # Reset database
   docker-compose down -v
   docker-compose up --build
   ```

3. **Socket.IO connection issues:**
   - Check CORS settings
   - Verify WebSocket support
   - Check network connectivity between containers

4. **Build failures:**
   ```bash
   # Clean build
   docker-compose down
   docker system prune -f
   docker-compose up --build --force-recreate
   ```

### Logs and Debugging:
```bash
# View all logs
docker-compose logs -f

# Execute into running container
docker-compose exec backend sh
docker-compose exec frontend sh

# Check container status
docker-compose ps
```

## Security Considerations for Production

1. **Change JWT_SECRET** in production environment
2. **Configure proper CORS origins**
3. **Use HTTPS** with proper SSL certificates
4. **Set up firewall rules**
5. **Regular security updates**
6. **Monitor and log access**

## Performance Optimization

- Frontend uses Next.js standalone build for minimal container size
- Backend uses multi-stage build with Alpine Linux
- Static assets are served efficiently
- Database connections are pooled
- Health checks ensure service availability