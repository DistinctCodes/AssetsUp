# Docker Setup Guide

## Overview

This directory contains Docker configuration for the AssetsUp backend service.

## Files

- **Dockerfile** - Multi-stage production build
- **Dockerfile.dev** - Development build with watch mode
- **docker-compose.yml** - Production docker-compose configuration
- **docker-compose.dev.yml** - Development docker-compose configuration
- **.dockerignore** - Files to exclude from Docker build context

## Quick Start

### Development

```bash
# Start services in development mode
docker-compose -f docker-compose.dev.yml up

# Rebuild after changing dependencies
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Environment Variables

Create a `.env` file in `backend/contrib/`:

```bash
NODE_ENV=production
PORT=6003
FRONTEND_URL=http://localhost:3000

DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
DB_DATABASE=assetsup

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

## Services

### PostgreSQL Database
- **Image**: postgres:16-alpine
- **Port**: 5432
- **Volume**: postgres_data (persisted)
- **Health Check**: Automatic with 5 retries

### Backend API
- **Port**: 6003
- **Build**: Multi-stage for production
- **Volume**: uploads directory and source code (dev only)
- **Dependencies**: Waits for PostgreSQL to be healthy

## Features

### Production (Dockerfile)
- ✅ Multi-stage build for minimal image size
- ✅ Alpine Linux base for small footprint
- ✅ Health checks for container monitoring
- ✅ dumb-init for proper signal handling
- ✅ Production-optimized Node.js setup

### Development (Dockerfile.dev)
- ✅ Hot-reload with watch mode
- ✅ Source code mounted as volume
- ✅ Easy debugging and rapid development
- ✅ Node modules cached

## Common Commands

```bash
# Build images
docker-compose -f docker-compose.dev.yml build

# Run migrations
docker-compose -f docker-compose.dev.yml exec backend npm run migration:run

# Generate migration
docker-compose -f docker-compose.dev.yml exec backend npm run migration:generate

# Access database
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d assetsup

# View backend logs
docker-compose logs -f backend

# Rebuild specific service
docker-compose -f docker-compose.dev.yml up --build backend
```

## Network

Services communicate through a dedicated bridge network (`assetsup-network` or `assetsup-network-dev`).
This allows service-to-service communication by service name (e.g., `postgres` as hostname).

## Volumes

### Production
- `postgres_data` - PostgreSQL data persistence
- `uploads` - Bind mount for file uploads

### Development
- `postgres_data_dev` - PostgreSQL data persistence
- `uploads` - Bind mount for file uploads
- `src` - Source code for hot-reload
- Anonymous volume for node_modules

## Health Checks

Both PostgreSQL and Backend have health checks configured:
- **PostgreSQL**: Checks pg_isready command
- **Backend**: HTTP health check on startup

## Troubleshooting

### Ports already in use
```bash
# Change port in .env file or docker-compose file
# Or kill existing process using port 5432 or 6003
```

### Database connection error
```bash
# Ensure PostgreSQL is healthy
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Build issues
```bash
# Clean and rebuild
docker-compose down -v
docker-compose up --build
```

## Security Notes

- Update `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in production
- Use strong `DB_PASSWORD` in production
- Never commit `.env` file to version control
- Use secrets management in production deployments
