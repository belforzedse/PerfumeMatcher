# VPS Deployment Architecture

## Overview

This project uses GitHub Actions to automatically deploy both the Django backend and Next.js frontend to a VPS using Docker Compose.

## Architecture

```
GitHub Repository
    ↓ (on push to main)
GitHub Actions Workflow
    ↓ (SSH + rsync)
VPS (/opt/perfume-matcher)
    ├── backend/ (Django)
    │   ├── Dockerfile
    │   └── .env
    └── frontend/ (Next.js)
        ├── Dockerfile
        └── .env.local
    ↓ (docker compose)
Docker Containers
    ├── perfume-backend:8000
    └── perfume-frontend:3000
```

## Key Files

### `.github/workflows/deploy.yml`
- Triggers on push to main/master
- Uses SSH to connect to VPS
- Copies files via rsync
- Creates environment files
- Builds and starts Docker containers
- Runs migrations
- Performs health checks

### `docker-compose.yml` (root)
- Orchestrates both services
- Sets up networking
- Configures health checks
- Manages volumes for persistence

### `backend/Dockerfile`
- Python 3.11 slim base
- Installs dependencies
- Runs migrations on startup
- Exposes port 8000

### `frontend/Dockerfile`
- Node.js 20 base
- Multi-stage build
- Production optimized
- Exposes port 3000

## Environment Variables

### Backend (.env)
- `SECRET_KEY` - Django secret key
- `DEBUG` - Set to False in production
- `ALLOWED_HOSTS` - VPS IP/domain
- `OPENAI_API_KEY` - OpenAI API key
- `AI_MODEL` - Model to use (gpt-4o-mini)
- `ADMIN_ACCESS_KEY` - Admin API key

### Frontend (.env.local)
- `NEXT_PUBLIC_BACKEND_BASE_URL` - Backend API URL

## Deployment Flow

1. **Code Push** → GitHub detects push to main
2. **Workflow Trigger** → GitHub Actions starts
3. **SSH Setup** → Configures SSH connection
4. **File Transfer** → rsync copies files to VPS
5. **Env Setup** → Creates .env files if missing
6. **Docker Build** → Builds container images
7. **Container Start** → Starts services
8. **Migrations** → Runs database migrations
9. **Health Check** → Verifies services are running

## Security Considerations

- SSH keys stored as GitHub secrets
- Environment variables never committed
- Docker containers run with minimal privileges
- Firewall configured to expose only necessary ports
- Secrets rotated regularly

## Monitoring

- Docker Compose logs: `docker compose logs -f`
- Container status: `docker compose ps`
- Health checks: Automatic via Docker Compose
- GitHub Actions: View workflow runs

## Rollback Procedure

If deployment fails:

```bash
# SSH into VPS
ssh user@vps-ip

# Stop current containers
cd /opt/perfume-matcher
docker compose down

# Checkout previous version (if using git)
git checkout <previous-commit>

# Rebuild and start
docker compose up -d --build
```

## Scaling Considerations

Current setup is for single-server deployment. For scaling:

1. Use PostgreSQL instead of SQLite
2. Add Redis for caching
3. Use load balancer for multiple instances
4. Consider container orchestration (Kubernetes) for larger scale

