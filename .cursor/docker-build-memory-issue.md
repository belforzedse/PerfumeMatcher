# Docker Build Memory Issue - Frontend Build SIGKILL

## Problem

The frontend Docker build fails with `SIGKILL` during `npm run build`, indicating the process is being killed due to insufficient memory (OOM - Out of Memory).

## Root Cause

Next.js builds, especially with Turbopack, are memory-intensive. Docker builds can run out of memory if:
1. The system doesn't have enough available RAM
2. Node.js memory limits are too low
3. Other processes are consuming memory during build

## Solution Implemented

### 1. Increased Node.js Memory Limit
Added `NODE_OPTIONS="--max-old-space-size=4096"` to the Dockerfile to allocate 4GB for the build process.

### 2. Switched to Webpack Build
Changed from `npm run build` (Turbopack) to `npm run build:webpack` for more stable and memory-efficient builds in Docker environments.

### 3. Docker Compose Memory Limits
Added memory limits in `docker-compose.yml` for runtime (though build-time memory depends on system resources).

## Files Modified

- `frontend/Dockerfile` - Added NODE_OPTIONS and switched to webpack build
- `docker-compose.yml` - Added memory limits for frontend service
- `DEPLOYMENT.md` - Added troubleshooting section

## Alternative Solutions

If the build still fails:

1. **Reduce memory limit** (if system has < 4GB RAM):
   ```dockerfile
   ENV NODE_OPTIONS="--max-old-space-size=2048"  # 2GB
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

