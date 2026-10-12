import { describe, it, expect } from 'vitest';
import { checkAccess } from '@/lib/rbac';

describe('Centralized RBAC Engine', () => {
  it('should grant super_admin access to any route and method', () => {
    expect(checkAccess('/api/users', 'POST', 'super_admin')).toBe(true);
    expect(checkAccess('/api/tally/sync', 'DELETE', 'super_admin')).toBe(true);
    expect(checkAccess('/api/expenses', 'GET', 'super_admin')).toBe(true);
  });

  it('should enforce user management routes only for admins', () => {
    expect(checkAccess('/api/users', 'GET', 'admin')).toBe(true);
    expect(checkAccess('/api/users', 'POST', 'admin')).toBe(true);
    expect(checkAccess('/api/users', 'GET', 'reception')).toBe(false);
    expect(checkAccess('/api/users', 'GET', 'engineer')).toBe(false);
  });

  it('should enforce job update rules (PUT vs PATCH)', () => {
    // Only admin and reception can update whole job details (PUT)
    expect(checkAccess('/api/jobs/job-123', 'PUT', 'admin')).toBe(true);
    expect(checkAccess('/api/jobs/job-123', 'PUT', 'reception')).toBe(true);
    expect(checkAccess('/api/jobs/job-123', 'PUT', 'engineer')).toBe(false);

    // Only engineer can patch status (PATCH)
    expect(checkAccess('/api/jobs/job-123', 'PATCH', 'engineer')).toBe(true);
    expect(checkAccess('/api/jobs/job-123', 'PATCH', 'admin')).toBe(false);
    expect(checkAccess('/api/jobs/job-123', 'PATCH', 'reception')).toBe(false);
  });

  it('should enforce customer access rights', () => {
    expect(checkAccess('/api/customers', 'GET', 'admin')).toBe(true);
    expect(checkAccess('/api/customers', 'GET', 'reception')).toBe(true);
    expect(checkAccess('/api/customers', 'GET', 'engineer')).toBe(true);

    expect(checkAccess('/api/customers', 'POST', 'admin')).toBe(true);
    expect(checkAccess('/api/customers', 'POST', 'reception')).toBe(true);
    expect(checkAccess('/api/customers', 'POST', 'engineer')).toBe(false);
  });

  it('should fallback to true and warn for unconfigured API routes', () => {
    expect(checkAccess('/api/some-new-undocumented-path', 'GET', 'engineer')).toBe(true);
  });
});
