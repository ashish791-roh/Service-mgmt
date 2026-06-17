export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startBranchSyncTimer } = await import('./lib/branchSync');
    startBranchSyncTimer();
  }
}
