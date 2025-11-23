# HTTPS Setup Guide for Chat App

## Option 1: Let's Encrypt (Free SSL) ✅ RECOMMENDED

### Prerequisites:
1. **Domain name** pointing to your EC2 IP
   - Buy from Namecheap (~$12/year) OR
   - Use free subdomain from FreeDNS.afraid.org

### Steps:

#### 1. Update Security Group (Terraform)
Add HTTPS port 443 to your security group:

```hcl
# In terraform/main.tf, add this ingress rule:
ingress {
  from_port   = 443
  to_port     = 443
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}
```

#### 2. Deploy the Updated Infrastructure
```bash
cd terraform
terraform apply -auto-approve
```

#### 3. Point Your Domain to EC2
In your domain registrar (Namecheap, GoDaddy, etc.):
- Create an **A record**: `@` → `YOUR_EC2_PUBLIC_IP`
- Create an **A record**: `www` → `YOUR_EC2_PUBLIC_IP`

Wait 5-10 minutes for DNS to propagate.

#### 4. SSH into EC2 and Run Certbot
```bash
# SSH into your instance
ssh -i terraform/chat_app_key.pem ec2-user@YOUR_EC2_IP

# Run certbot
sudo certbot --nginx \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --non-interactive \
  --agree-tos \
  -m your@email.com
```

#### 5. Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

### ✅ Done! Your app is now at `https://yourdomain.com`

---

## Option 2: CloudFront + ACM (AWS Managed)

### Pros:
- CDN caching (faster global access)
- DDoS protection
- AWS-managed certificates

### Cons:
- ~$1-5/month for CloudFront
- More complex setup

### Steps:

1. **Request Certificate in ACM**
   ```bash
   # In AWS Console → ACM → Request Certificate
   # Domain: yourdomain.com, *.yourdomain.com
   # Validation: DNS (add CNAME record)
   ```

2. **Create CloudFront Distribution**
   - Origin: Your EC2 public IP
   - Viewer Protocol: Redirect HTTP to HTTPS
   - Alternate Domain Names: yourdomain.com
   - SSL Certificate: Select your ACM cert

3. **Update DNS**
   - Point your domain to CloudFront distribution URL

---

## Option 3: Self-Signed Certificate (Development Only)

**NOT recommended for production** (browser warnings).

```bash
# On EC2
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt

# Update nginx config to use these certs
```

---

## 📊 Cost Comparison

| Option | Monthly Cost | Setup Time | Best For |
|--------|--------------|------------|----------|
| Let's Encrypt | **$0** (+ domain $1/mo) | 10 min | Small apps, 10 users ✅ |
| CloudFront | $1-5 | 30 min | Global users, CDN |
| Self-signed | $0 | 5 min | Dev/testing only |

---

## 🔧 Troubleshooting

### Cert renewal fails:
```bash
sudo certbot renew --force-renewal
```

### Port 443 not accessible:
```bash
# Check security group allows 443
aws ec2 describe-security-groups
```

### WebSocket over HTTPS:
Your nginx config already handles this! Socket.io will automatically use `wss://` instead of `ws://`.
