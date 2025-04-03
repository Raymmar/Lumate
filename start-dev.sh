#!/bin/bash

# Script to clear Vite cache and start the development server
# Run this script instead of using the "Start application" workflow button

# Clear Vite cache
echo "🧹 Clearing Vite cache..."
rm -rf node_modules/.vite

# Clear build directories
echo "🧹 Clearing build directories..."
rm -rf dist client/dist

# Rebuild the project
echo "🔨 Rebuilding the project..."
npm run build

# Start the development server
echo "🚀 Starting development server..."
npm run dev