#!/bin/bash

# Clear Vite cache
echo "🧹 Clearing Vite cache..."
rm -rf node_modules/.vite

# Clear build directories
echo "🧹 Clearing build directories..."
rm -rf dist client/dist

# Start the development server
echo "🚀 Starting development server..."
tsx server/index.ts