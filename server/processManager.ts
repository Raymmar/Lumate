// Simplified process manager to help with server startup and shutdown

// Setup graceful shutdown for the process
export function setupGracefulShutdown(server: any, app: any) {
  const gracefulShutdown = () => {
    console.log('[Server] Shutting down gracefully...');
    
    // Close any active SSE connections
    const connections = app.get('activeSSEConnections') || [];
    if (connections.length > 0) {
      console.log(`[Server] Closing ${connections.length} active SSE connections`);
      connections.forEach((res: any) => {
        if (res && typeof res.end === 'function') {
          try {
            res.end();
          } catch (err) {
            console.error('[Server] Error closing SSE connection:', err);
          }
        }
      });
    }
    
    // Close the HTTP server
    if (server && typeof server.close === 'function') {
      server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
      });
    } else {
      console.log('[Server] No HTTP server to close, exiting');
      process.exit(0);
    }
    
    // Force close after timeout
    setTimeout(() => {
      console.error('[Server] Forcefully shutting down after timeout');
      process.exit(1);
    }, 5000);
  };
  
  // Listen for termination signals
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  
  // Handle uncaught exceptions to prevent crashes
  process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught exception:', error);
    
    // Don't exit on WebSocket errors since they can be non-fatal
    if (error.message && error.message.includes('WebSocket')) {
      console.log('[Server] Non-fatal WebSocket error, continuing...');
    } else {
      // For other uncaught exceptions, shut down gracefully
      gracefulShutdown();
    }
  });
  
  return gracefulShutdown;
}

// Dummy function for compatibility, we're not using process detection anymore
export async function ensureNoConflictingProcesses() {
  console.log('[Server] Proceeding with server startup...');
  return Promise.resolve();
}