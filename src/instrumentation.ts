export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startBranchSyncTimer } = await import('./lib/branchSync');
    startBranchSyncTimer();

    // Startup Redis health check in production
    if (process.env.NODE_ENV === 'production') {
      try {
        const { getRedis } = await import('./lib/rateLimit');
        const redis = getRedis();
        console.log('[Startup] Performing Redis health check...');
        const pong = await redis.ping();
        if (typeof pong !== 'string' || (!pong.includes('PONG') && !pong.includes('ok') && !pong.includes('OK'))) {
          throw new Error(`Unexpected ping response: ${pong}`);
        }
        console.log('[Startup] Redis health check passed successfully.');
      } catch (err) {
        console.error('[Startup] CRITICAL: Redis health check failed at startup!', err);
        throw err; // Halt initialization
      }
    }
  }
}
