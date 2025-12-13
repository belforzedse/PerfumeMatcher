#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <frontend_domain> <api_domain>" >&2
  echo "Example: $0 kiosk.gandom-perfume.ir kioskapi.gandom-perfume.ir" >&2
  exit 1
fi

FRONTEND_DOMAIN="$1"
API_DOMAIN="$2"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (sudo bash ...)" >&2
  exit 1
fi

echo "==> Running VPS setup for PerfumeMatcher"
echo "    Frontend domain: $FRONTEND_DOMAIN"
echo "    API domain: $API_DOMAIN"

echo "==> Updating apt and installing dependencies..."
apt update
apt upgrade -y
apt install -y curl docker.io nginx certbot python3-certbot-nginx ufw jq

if ! id -u deploy >/dev/null 2>&1; then
  echo "==> Creating deploy user..."
  useradd -m -s /bin/bash deploy
fi

echo "==> Ensuring Docker service is running..."
systemctl enable --now docker

# Install Docker Compose v2 (plugin)
echo "==> Installing Docker Compose v2..."
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

usermod -aG docker deploy || true

# Configure passwordless sudo for deploy user (for nginx reload and directory operations)
echo "deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx, /bin/mkdir, /usr/bin/chown" > /etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy

echo "==> Configuring UFW..."
ufw allow 22/tcp || true
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 9001/tcp  # Portainer agent
# Internal ports (only accessible from localhost)
ufw allow from 127.0.0.1 to any port 8000 || true
ufw allow from 127.0.0.1 to any port 3000 || true
ufw --force enable

echo "==> Creating directories..."
mkdir -p /opt/perfume-matcher/{backend,frontend,nginx,scripts}
mkdir -p /opt/perfume-matcher/backend/media/uploads
chown -R deploy:deploy /opt/perfume-matcher

echo "==> Writing nginx reverse proxy config..."
cat <<NGINX >/etc/nginx/sites-available/perfume-matcher
# Backend API - ${API_DOMAIN}
server {
    listen 80;
    listen [::]:80;
    server_name ${API_DOMAIN};

    # Redirect HTTP to HTTPS (will be configured by Certbot)
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;

        # CORS headers
        add_header Access-Control-Allow-Origin \$http_origin always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Admin-Key" always;
        add_header Access-Control-Allow-Credentials true always;

        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Media files
    location /media/ {
        alias /opt/perfume-matcher/backend/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Static files
    location /static/ {
        alias /opt/perfume-matcher/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# Frontend - ${FRONTEND_DOMAIN}
server {
    listen 80;
    listen [::]:80;
    server_name ${FRONTEND_DOMAIN} www.${FRONTEND_DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${FRONTEND_DOMAIN} www.${FRONTEND_DOMAIN};

    # SSL certificate (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/${API_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${API_DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host localhost;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Cache static assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/perfume-matcher /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

echo "==> Setting up SSL certificates..."
# Get SSL certificates for both domains
certbot --nginx -d ${API_DOMAIN} --non-interactive --agree-tos --email admin@gandom-perfume.ir --redirect || echo "Certificate for ${API_DOMAIN} may already exist or DNS not ready"

certbot --nginx -d ${FRONTEND_DOMAIN} -d www.${FRONTEND_DOMAIN} --non-interactive --agree-tos --email admin@gandom-perfume.ir --redirect || echo "Certificate for ${FRONTEND_DOMAIN} may already exist or DNS not ready"

# Reload Nginx after SSL setup
systemctl reload nginx

echo "==> Installing Portainer agent..."
docker volume create portainer_agent_data >/dev/null 2>&1 || true
docker rm -f portainer_agent >/dev/null 2>&1 || true
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest

echo "==> Creating initial environment files..."
# Backend .env template
cat <<ENV >/opt/perfume-matcher/backend/.env.template
SECRET_KEY=CHANGE_ME_IN_GITHUB_SECRETS
DEBUG=False
ALLOWED_HOSTS=${API_DOMAIN},localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://${FRONTEND_DOMAIN},http://${FRONTEND_DOMAIN}
OPENAI_API_KEY=CHANGE_ME_IN_GITHUB_SECRETS
AI_MODEL=gpt-5-mini
ADMIN_ACCESS_KEY=CHANGE_ME_IN_GITHUB_SECRETS
ENV

# Frontend .env.local template
cat <<ENV >/opt/perfume-matcher/frontend/.env.local.template
NEXT_PUBLIC_BACKEND_BASE_URL=https://${API_DOMAIN}
ENV

chown deploy:deploy /opt/perfume-matcher/backend/.env.template
chown deploy:deploy /opt/perfume-matcher/frontend/.env.local.template

echo "==> Done! Next steps:"
echo ""
echo "✅ VPS setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Configure DNS records:"
echo "     - ${FRONTEND_DOMAIN} -> $(hostname -I | awk '{print $1}')"
echo "     - ${API_DOMAIN} -> $(hostname -I | awk '{print $1}')"
echo ""
echo "  2. Configure GitHub Secrets:"
echo "     - VPS_HOST: $(hostname -I | awk '{print $1}')"
echo "     - VPS_USER: deploy"
echo "     - VPS_SSH_KEY: (your SSH private key)"
echo "     - DJANGO_SECRET_KEY: (generate with: python -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\")"
echo "     - OPENAI_API_KEY: (your OpenAI API key)"
echo "     - ADMIN_ACCESS_KEY: (your secure admin key)"
echo ""
echo "  3. Push to main branch - GitHub Actions will deploy automatically"
echo ""
echo "  4. If SSL certificates failed, run manually after DNS propagates:"
echo "     sudo certbot --nginx -d ${API_DOMAIN} -d ${FRONTEND_DOMAIN} -d www.${FRONTEND_DOMAIN}"
echo ""
echo "🌐 Your application will be available at:"
echo "   - Frontend: https://${FRONTEND_DOMAIN}"
echo "   - Backend API: https://${API_DOMAIN}"
echo ""
echo "🐳 Portainer agent is running on port 9001"
echo "   Add this agent to your Portainer instance:"
echo "   tcp://$(hostname -I | awk '{print $1}'):9001"

