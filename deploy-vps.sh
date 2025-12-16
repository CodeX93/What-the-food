#!/bin/bash

# VPS Deployment Script for Next.js App
# Run this script in your project root directory

echo "🚀 Starting VPS deployment process..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building production version..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo "✅ Build completed successfully!"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Stop existing PM2 process if running
echo "🛑 Stopping existing processes..."
pm2 stop what-the-food 2>/dev/null || true
pm2 delete what-the-food 2>/dev/null || true

# Start the application with PM2
echo "▶️  Starting application with PM2..."
pm2 start npm --name "what-the-food" -- start

# Save PM2 configuration
pm2 save

echo "✅ Application started!"
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📝 View logs with: pm2 logs what-the-food"
echo "🔄 Restart with: pm2 restart what-the-food"
echo ""
echo "🌐 Test your app:"
echo "   Local: curl http://localhost:3000"
echo "   Public: http://72.60.113.9"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Set up environment variables in .env.local"
echo "   2. Configure nginx (see DEPLOYMENT_VPS.md)"
echo "   3. Reload nginx: sudo systemctl reload nginx"











