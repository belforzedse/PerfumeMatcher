# 🚀 VPS Deployment Guide

Complete guide for deploying PerfumeMatcher to your VPS using GitHub Actions.

## 📋 Prerequisites

- VPS with Ubuntu 20.04+ (or similar Linux distribution)
- Docker and Docker Compose installed on VPS
- SSH access to VPS
- GitHub repository with Actions enabled
- OpenAI API key
- **Custom domains configured:**
  - `kioskapi.gandom-perfume.ir` (Backend API)
  - `kiosk.gandom-perfume.ir` (Frontend)
- DNS records pointing to your VPS IP address

## 🔧 VPS Initial Setup

### 1. Install Docker and Docker Compose

SSH into your VPS and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (replace $USER with your username)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes to take effect
exit
```

### 2. Create Deployment Directory

```bash
sudo mkdir -p /opt/perfume-matcher
sudo chown $USER:$USER /opt/perfume-matcher
```

### 3. Configure Firewall

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow backend port (internal only, not exposed externally)
sudo ufw allow 8000/tcp from 127.0.0.1

# Allow frontend port (internal only, not exposed externally)
sudo ufw allow 3000/tcp from 127.0.0.1

# Enable firewall
sudo ufw enable
```

### 3.5. Setup DNS Records

Before proceeding, ensure your DNS records are configured:

- **A Record:** `kioskapi.gandom-perfume.ir` → Your VPS IP address
- **A Record:** `kiosk.gandom-perfume.ir` → Your VPS IP address

You can verify DNS propagation:
```bash
dig kioskapi.gandom-perfume.ir
dig kiosk.gandom-perfume.ir
```

### 4. Generate SSH Key for GitHub Actions

```bash
# On your local machine, generate a new SSH key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vps_deploy_key

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/vps_deploy_key.pub user@your-vps-ip

# Test connection
ssh -i ~/.ssh/vps_deploy_key user@your-vps-ip
```

## 🔐 GitHub Secrets Configuration

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

### Required Secrets

1. **VPS_HOST** - Your VPS IP address or domain
   ```
   Example: 82.115.26.133
   ```

2. **VPS_USER** - SSH username for VPS
   ```
   Example: ubuntu
   ```

3. **VPS_SSH_KEY** - Private SSH key content (the entire content of `~/.ssh/vps_deploy_key`)
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   ...
   -----END OPENSSH PRIVATE KEY-----
   ```

4. **DJANGO_SECRET_KEY** - Django secret key (generate a new one)
   ```bash
   # Generate on your local machine
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

5. **OPENAI_API_KEY** - Your OpenAI API key
   ```
   sk-...
   ```

6. **ADMIN_ACCESS_KEY** - Secret key for admin API access
   ```
   Your secure random string
   ```

### Optional Secrets

- **NEXT_PUBLIC_BACKEND_BASE_URL** - Override backend URL (defaults to `http://VPS_HOST:8000`)

## 📝 Environment Files

The deployment workflow automatically creates `.env` files if they don't exist. However, you can manually create them on the VPS:

### Backend `.env` (`/opt/perfume-matcher/backend/.env`)

```env
SECRET_KEY=your-django-secret-key
DEBUG=False
ALLOWED_HOSTS=kioskapi.gandom-perfume.ir,your-vps-ip,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://kiosk.gandom-perfume.ir,http://kiosk.gandom-perfume.ir
OPENAI_API_KEY=sk-your-openai-key
AI_MODEL=gpt-5-mini
ADMIN_ACCESS_KEY=your-admin-key
```

### Frontend `.env.local` (`/opt/perfume-matcher/frontend/.env.local`)

```env
NEXT_PUBLIC_BACKEND_BASE_URL=https://kioskapi.gandom-perfume.ir
```

## 🚀 Deployment Process

### Automatic Deployment

1. **Push to main/master branch:**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **GitHub Actions will automatically:**
   - Checkout code
   - Connect to VPS via SSH
   - Copy backend and frontend files
   - Copy Nginx configuration
   - Create environment files if missing
   - Build and start Docker containers
   - Run database migrations
   - Perform health checks

3. **Setup Nginx (First time only):**
   ```bash
   # SSH into VPS
   ssh user@your-vps-ip
   
   # Run Nginx setup script
   sudo /opt/perfume-matcher/scripts/setup-nginx.sh
   ```
   This will:
   - Install Nginx (if not installed)
   - Configure reverse proxy
   - Obtain SSL certificates via Let's Encrypt
   - Enable HTTPS redirects

4. **Monitor deployment:**
   - Go to GitHub → Actions tab
   - Watch the deployment workflow
   - Check logs for any errors

### Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# SSH into VPS
ssh user@your-vps-ip

# Navigate to project
cd /opt/perfume-matcher

# Pull latest code (if using git)
git pull origin main

# Or copy files manually using rsync/scp

# Build and start services
docker compose up -d --build

# Run migrations
docker compose exec backend python manage.py migrate

# Collect static files
docker compose exec backend python manage.py collectstatic --noinput

# Check status
docker compose ps
docker compose logs -f
```

## 🔍 Verification

After deployment, verify services are running:

```bash
# Check containers
docker compose ps

# Check backend
curl http://localhost:8000/api/perfumes/

# Check frontend
curl http://localhost:3000

# View logs
docker compose logs backend
docker compose logs frontend
```

## 🔄 Updating Deployment

### Update Code

Simply push to the main branch - GitHub Actions will handle the rest.

### Update Environment Variables

1. Update secrets in GitHub repository settings
2. Delete `.env` files on VPS (they'll be recreated with new values):
   ```bash
   ssh user@vps-ip
   rm /opt/perfume-matcher/backend/.env
   rm /opt/perfume-matcher/frontend/.env.local
   ```
3. Push a new commit to trigger deployment

### Manual Update

```bash
# SSH into VPS
ssh user@your-vps-ip
cd /opt/perfume-matcher

# Pull latest
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build
```

## 🛠️ Troubleshooting

### Backend won't start

```bash
# Check logs
docker compose logs backend

# Common issues:
# - Missing environment variables
# - Database migration errors
# - Port conflicts
```

### Frontend won't start

```bash
# Check logs
docker compose logs frontend

# Common issues:
# - Missing NEXT_PUBLIC_BACKEND_BASE_URL
# - Build errors
# - Port conflicts
```

### Frontend build fails with SIGKILL (Out of Memory)

If you see `npm error signal SIGKILL` during the build process, the build is running out of memory:

**Symptoms:**
```
npm error path /app
npm error command failed
npm error signal SIGKILL
```

**Solutions for 2GB RAM Systems:**

1. **Add swap space (CRITICAL for 2GB systems):**
   ```bash
   # Create 2GB swap file
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   
   # Make it permanent
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   
   # Verify swap is active
   free -h
   # You should see swap in the output
   ```
   **This is the most important step for 2GB systems!**

2. **Check available memory:**
   ```bash
   free -h
   # Ensure you have at least 1.5GB available + swap
   ```

3. **The Dockerfile is already optimized:**
   - Uses `NODE_OPTIONS="--max-old-space-size=1228"` (1.2GB)
   - Uses Turbopack (default Next.js 16 bundler)
   - If build still fails, you can reduce further:
     ```dockerfile
     ENV NODE_OPTIONS="--max-old-space-size=1024"  # 1GB
     ```

4. **Build with BuildKit cache (recommended):**
   ```bash
   # Enable BuildKit for better caching
   export DOCKER_BUILDKIT=1
   docker compose build frontend
   ```

5. **Stop other services during build:**
   ```bash
   # Stop other containers to free memory
   docker stop $(docker ps -q)
   # Build frontend
   docker compose build frontend
   # Restart services
   docker compose up -d
   ```

6. **Alternative: Build on a more powerful machine:**
   - Build the image on a CI/CD system or local machine with more RAM
   - Push to Docker Hub or registry
   - Pull and run on the VPS

### Connection issues

```bash
# Test SSH connection
ssh -i ~/.ssh/vps_deploy_key user@vps-ip

# Check firewall
sudo ufw status

# Check Docker
docker ps
docker compose ps
```

### Database issues

```bash
# Run migrations manually
docker compose exec backend python manage.py migrate

# Create superuser (if needed)
docker compose exec backend python manage.py createsuperuser
```

## 📊 Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

### Check Resource Usage

```bash
# Container stats
docker stats

# Disk usage
df -h
docker system df
```

## 🔒 Security Best Practices

1. **Use strong secrets:**
   - Generate strong Django SECRET_KEY
   - Use secure ADMIN_ACCESS_KEY
   - Keep OpenAI API key secret

2. **Firewall configuration:**
   - Only expose necessary ports
   - Consider using a reverse proxy (nginx) for production

3. **Regular updates:**
   - Keep Docker images updated
   - Update system packages regularly
   - Monitor security advisories

4. **Backup database:**
   ```bash
   # Backup SQLite database
   docker compose exec backend python manage.py dumpdata > backup.json
   ```

## 🌐 Production Considerations

### Nginx Reverse Proxy

The deployment includes automatic Nginx configuration for:
- **Backend API:** `https://kioskapi.gandom-perfume.ir` → `http://localhost:8000`
- **Frontend:** `https://kiosk.gandom-perfume.ir` → `http://localhost:3000`

The Nginx configuration is located at:
- `/opt/perfume-matcher/nginx/perfume-matcher.conf`
- Symlinked to `/etc/nginx/sites-available/perfume-matcher`

### SSL/HTTPS

SSL certificates are automatically obtained via Let's Encrypt when you run the setup script:

```bash
sudo /opt/perfume-matcher/scripts/setup-nginx.sh
```

Certificates are automatically renewed via Certbot's systemd timer.

### Access Your Application

After deployment and Nginx setup:

- **Backend API:** `https://kioskapi.gandom-perfume.ir`
- **Frontend:** `https://kiosk.gandom-perfume.ir`
- **API Endpoint:** `https://kioskapi.gandom-perfume.ir/api/perfumes/`

Internal ports (not exposed externally):
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

## 📞 Support

If you encounter issues:

1. Check GitHub Actions logs
2. Check Docker container logs
3. Verify environment variables
4. Check firewall settings
5. Review this documentation

---

**Deployment Path:** `/opt/perfume-matcher`  
**Backend Port:** `8000`  
**Frontend Port:** `3000`  
**Health Check:** Automatic after deployment

