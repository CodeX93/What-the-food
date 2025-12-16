#!/bin/bash

# Clean Build Script - Fixes chunk loading and build errors
# Run this whenever you encounter build or chunk loading errors

echo "🧹 Cleaning build artifacts..."

# Remove Next.js build artifacts
rm -rf .next
echo "✅ Removed .next directory"

# Remove node_modules cache
rm -rf node_modules/.cache
echo "✅ Cleared node_modules cache"

# Clear Next.js cache
rm -rf .next/cache
echo "✅ Cleared Next.js cache"

# Remove turbo cache if exists
rm -rf .turbo
echo "✅ Removed .turbo directory"

# Remove package manager cache
rm -rf .npm
rm -rf .yarn
rm -rf .pnpm-store
echo "✅ Cleared package manager cache"

echo ""
echo "✨ Build cache cleared!"
echo "🚀 Now run: npm run build"
echo ""
