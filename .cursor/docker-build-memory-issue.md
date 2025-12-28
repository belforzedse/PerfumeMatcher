# Docker Build Memory Issue - Frontend Build SIGKILL

## Problem

The frontend Docker build fails with `SIGKILL` during `npm run build`, indicating the process is being killed due to insufficient memory (OOM - Out of Memory).

## Root Cause

Next.js builds, especially with Turbopack, are memory-intensive. Docker builds can run out of memory if:
1. The system doesn't have enough available RAM
2. Node.js memory limits are too low
3. Other processes are consuming memory during build

## Solution Implemented (2GB RAM System)

### 1. Optimized Node.js Memory Limit
Set `NODE_OPTIONS="--max-old-space-size=1228"` (1.2GB) to leave ~800MB for OS and Docker on a 2GB system.

### 2. Using Turbopack (Default)
Using `npm run build` with Turbopack (Next.js 16 default) as requested.

### 3. Docker Compose Memory Limits
Set memory limits to 1.5GB max, 512MB reservation in `docker-compose.yml`.

### 4. Next.js Config Optimization
Added Turbopack memory limit configuration in `next.config.ts`.

## Files Modified

- `frontend/Dockerfile` - Added NODE_OPTIONS and switched to webpack build
- `docker-compose.yml` - Added memory limits for frontend service
- `DEPLOYMENT.md` - Added troubleshooting section

## Alternative Solutions for 2GB Systems

If the build still fails on a 2GB system:

1. **Add swap space** (RECOMMENDED for 2GB systems):
   ```bash
   # Create 2GB swap file
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   
   # Make it permanent
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   
   # Verify
   free -h
   ```

2. **Further reduce memory limit** (if no swap available):
   ```dockerfile
   ENV NODE_OPTIONS="--max-old-space-size=1024"  # 1GB
   ```

2. **Build on a more powerful machine** and push to registry

3. **Enable Docker BuildKit** for better caching:
   ```bash
   export DOCKER_BUILDKIT=1
   docker compose build frontend
   ```

4. **Check system memory**:
   ```bash
   free -h
   # Ensure at least 4GB available
   ```

5. **Configure swap** (if needed):
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

## Verification

After applying fixes, verify the build:
```bash
docker compose build frontend
# Should complete without SIGKILL errors
```

## References

- Next.js Build Requirements: https://nextjs.org/docs/deployment
- Docker Memory Management: https://docs.docker.com/config/containers/resource_constraints/
- Node.js Memory Options: https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes

