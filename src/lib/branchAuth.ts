import { prisma } from './prisma';

/**
 * Validates a branch's incoming request credentials against HQ database.
 * Returns the Branch record if valid, or null.
 */
export async function validateBranchApiKey(apiKey: string): Promise<any | null> {
  if (!apiKey) return null;
  const branch = await prisma.branch.findUnique({
    where: { apiKey }
  });
  if (!branch || branch.suspended) return null;
  return branch;
}
