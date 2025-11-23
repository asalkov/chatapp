#!/bin/bash
# Cloud‑init script for the chat app EC2 instance

# Install Docker, AWS CLI, Nginx, and Certbot
sudo dnf install -y docker aws-cli nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker

# Install Docker Compose standalone binary
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Wait for Docker to be ready
sleep 5

# Authenticate to Amazon ECR (account 270163127745, region us-east-1)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 270163127745.dkr.ecr.us-east-1.amazonaws.com


# Pull the pre‑built images (ensure they exist in ECR)
docker pull 270163127745.dkr.ecr.us-east-1.amazonaws.com/chatapp-backend:latest
docker pull 270163127745.dkr.ecr.us-east-1.amazonaws.com/chatapp-frontend:latest

# Change to the app directory (files are copied via Terraform file provisioners)
mkdir -p /home/ec2-user/app
sudo chown -R ec2-user:ec2-user /home/ec2-user/app
cd /home/ec2-user/app

# Create the docker-compose.yml file
cat > /home/ec2-user/app/docker-compose.yml <<'EOF'
version: '3.8'

services:
  backend:
    image: 270163127745.dkr.ecr.us-east-1.amazonaws.com/chatapp-backend:latest
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
    restart: always

  frontend:
    image: 270163127745.dkr.ecr.us-east-1.amazonaws.com/chatapp-frontend:latest
    ports:
      - "8080:80"
    depends_on:
      - backend
    restart: always
EOF

# Bring the stack up with Docker Compose (uses the ECR images)
docker-compose up -d

# Generate self-signed SSL certificate
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/chatapp.key \
    -out /etc/nginx/ssl/chatapp.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=chatapp"

# Configure Nginx as reverse proxy with SSL
sudo tee /etc/nginx/conf.d/chatapp.conf > /dev/null <<'EOF'
# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name _;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name _;

    # SSL certificate paths
    ssl_certificate /etc/nginx/ssl/chatapp.crt;
    ssl_certificate_key /etc/nginx/ssl/chatapp.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend proxy
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo systemctl enable --now nginx

sudo bash -c 'echo "$(date) – Chat app started" >> /var/log/chatapp-startup.log'
