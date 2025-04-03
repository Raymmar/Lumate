# Development Guidelines

## Cache Clearing and Development Server

If you're experiencing issues with the Replit webview serving cached versions of your code (not reflecting recent changes), use the following script to clear the cache and start the development server:

```bash
./start-dev.sh
```

This script will:

1. Clear the Vite cache in `node_modules/.vite`
2. Clear build directories (`dist` and `client/dist`)
3. Rebuild the project
4. Start the development server

## Manual Cache Clearing

If you prefer to clear the cache manually, you can run these commands:

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Clear build directories
rm -rf dist client/dist

# Rebuild the project
npm run build

# Start the server
npm run dev
```

## Deployment

When deploying to production, the caching issues will not affect the deployed version, as production builds are always freshly generated during the deployment process.