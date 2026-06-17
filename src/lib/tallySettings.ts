import { getCsrfToken, jsonHeaders } from './api';

export interface TallySettingsPayload {
  enabled: boolean;
  host: string;
  port: number;
  companyName: string;
  mockMode?: boolean;
  autoPushOnApproval?: boolean;
}

export interface TallyDashboardStats {
  totalDocuments: number;
  autoApproved: number;
  pushed: number;
  pendingReviews: number;
  failedEntries: number;
  successRate: number;
}

export interface TallySettingsResponse {
  settings: TallySettingsPayload & { syncStatus: string; lastTestedAt?: string; mockMode?: boolean; autoPushOnApproval?: boolean };
}

export async function loadTallySettings() {
  const res = await fetch('/api/tally/settings', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load Tally settings');
  return (await res.json()) as TallySettingsResponse;
}

export async function saveTallySettingsToAPI(settings: TallySettingsPayload) {
  const res = await fetch('/api/tally/settings', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ 
      ...settings, 
      mockMode: settings.mockMode ?? false,
      autoPushOnApproval: settings.autoPushOnApproval ?? true,
    }),
  });
  return res;
}

export async function testTallyConnectionAPI(settings: TallySettingsPayload) {
  const res = await fetch('/api/tally/test-connection', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(settings),
  });
  return res;
}

export async function loadTallyStats() {
  const res = await fetch('/api/tally/stats', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load Tally stats');
  return (await res.json()) as { stats: TallyDashboardStats; settings: TallySettingsResponse['settings'] & { mockMode?: boolean } };
}

export async function loadTallyDocuments() {
  const res = await fetch('/api/tally/documents', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load documents');
  return (await res.json()) as { documents: any[] };
}

export async function approveTallyDocument(documentId: string, action: 'approve' | 'reject', extractedData?: any, force?: boolean) {
  const res = await fetch('/api/tally/approve', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ documentId, action, extractedData, force }),
  });
  return res;
}

export async function uploadTallyDocument(file: File, documentType: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  const res = await fetch('/api/tally/upload', {
    method: 'POST',
    headers: {
      'x-csrf-token': getCsrfToken(),
    },
    body: formData,
  });
  return res;
}

export async function deleteTallyDocument(documentId: string) {
  const res = await fetch(`/api/tally/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      'x-csrf-token': getCsrfToken(),
    },
  });
  return res;
}

export async function fetchPendingJobsAPI() {
  const res = await fetch('/api/tally/pending-jobs', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load pending jobs');
  return (await res.json()) as { pendingJobs: any[] };
}

export async function pushJobToTallyAPI(jobId: string) {
  const res = await fetch('/api/tally/push-job', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ jobId }),
  });
  return res;
}

export async function fetchTallyQueueAPI(params: {
  status?: string;
  entityType?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.entityType) query.append('entityType', params.entityType);
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));

  const res = await fetch(`/api/tally/queue?${query.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch queue items');
  return (await res.json()) as { items: any[]; total: number; page: number; limit: number };
}

export async function executeQueueActionAPI(action: 'retry' | 'cancel' | 'cleanup', id?: string, ids?: string[]) {
  const res = await fetch('/api/tally/queue/action', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ action, id, ids }),
  });
  if (!res.ok) throw new Error('Failed to execute queue action');
  return (await res.json()) as { success: boolean; count?: number; message: string };
}
