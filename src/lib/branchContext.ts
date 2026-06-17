export type DeploymentRole = 'branch' | 'hq';

/**
 * Returns the current deployment role ('branch' | 'hq').
 * Defaults to 'branch'.
 */
export function getDeploymentRole(): DeploymentRole {
  const role = process.env.DEPLOYMENT_ROLE?.toLowerCase();
  return role === 'hq' ? 'hq' : 'branch';
}

/**
 * Returns true if this is an HQ deployment.
 */
export function isHQ(): boolean {
  return getDeploymentRole() === 'hq';
}

/**
 * Returns the ID of the current branch.
 * Defaults to 'default'.
 */
export function getBranchId(): string {
  return process.env.BRANCH_ID || 'default';
}

/**
 * Stamps a data payload with the local branch ID.
 */
export function withLocalBranchId<T extends Record<string, any>>(data: T): T & { branchId: string } {
  return {
    ...data,
    branchId: getBranchId(),
  };
}
