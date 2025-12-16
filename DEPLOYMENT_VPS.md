# VPS Deployment Guide for Next.js

## Common Issues and Solutions

### 1. Build and Start the Application

First, ensure your app is built and running:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Install dependencies (if not already done)
npm install

# Build the production version
npm run build

# Start the production server
npm start
```

The app should now be running on `http://localhost:3000`

### 2. Keep the App Running (PM2 Recommended)

Install PM2 to keep your app running:

```bash
# Install PM2 globally
npm install -g pm2

# Start your app with PM2
pm2 start npm --name "what-the-food" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### 3. Updated Nginx Configuration

Your current nginx config is basic. For Next.js, you need a more complete configuration:

```nginx
server {
    listen 80;
    server_name 72.60.113.9;  # Your IP or domain

    # Increase body size for file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Handle Next.js static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Handle images and other static assets
    location /images {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

After updating nginx config:

```bash
# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 4. Environment Variables

Ensure all environment variables are set. Create a `.env.local` file in your project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL (important for redirects)
NEXT_PUBLIC_APP_URL=http://72.60.113.9

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
# ... other Stripe keys
```

### 5. Check if App is Running

```bash
# Check if Node.js process is running
ps aux | grep node

# Check if port 3000 is in use
netstat -tulpn | grep 3000
# or
ss -tulpn | grep 3000

# Check PM2 status
pm2 status

# View PM2 logs
pm2 logs what-the-food
```

### 6. Firewall Configuration

Ensure port 80 (and 443 if using SSL) is open:

```bash
# For UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status

# For firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 7. Debugging Steps

1. **Test if Next.js is running locally:**
   ```bash
   curl http://localhost:3000
   ```

2. **Check nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Check Next.js logs:**
   ```bash
   pm2 logs what-the-food
   # or if running directly
   npm start
   ```

4. **Test nginx proxy:**
   ```bash
   curl -H "Host: 72.60.113.9" http://localhost:3000
   ```

### 8. Common 404 Causes

- **App not running:** Start with `npm start` or PM2
- **Wrong port:** Ensure app is on port 3000
- **Build missing:** Run `npm run build` first
- **Environment variables missing:** Check `.env.local`
- **Nginx not reloaded:** Run `sudo systemctl reload nginx`
- **Firewall blocking:** Check firewall rules

### 9. Production Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Production build created (`npm run build`)
- [ ] App running on port 3000
- [ ] PM2 configured (optional but recommended)
- [ ] Environment variables set in `.env.local`
- [ ] Nginx configured and reloaded
- [ ] Firewall allows port 80
- [ ] Tested locally: `curl http://localhost:3000`
- [ ] Tested via nginx: `curl http://72.60.113.9`

### 10. SSL/HTTPS Setup (Recommended)

For production, set up SSL with Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com
```

Then update nginx to redirect HTTP to HTTPS.











