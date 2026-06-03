export interface TallySettingsPayload {
  enabled: boolean;
  host: string;
  port: number;
  companyName: string;
}

export interface TallyDashboardStats {
  totalDocuments: number;
  autoApproved: number;
  pendingReviews: number;
  failedEntries: number;
  successRate: number;
}

export interface TallySettingsResponse {
  settings: TallySettingsPayload & { syncStatus: string; lastTestedAt?: string };
}

export async function loadTallySettings() {
  const res = await fetch('/api/tally/settings', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load Tally settings');
  return (await res.json()) as TallySettingsResponse;
}

export async function saveTallySettingsToAPI(settings: TallySettingsPayload) {
  const res = await fetch('/api/tally/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res;
}

export async function testTallyConnectionAPI(settings: TallySettingsPayload) {
  const res = await fetch('/api/tally/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res;
}

export async function loadTallyStats() {
  const res = await fetch('/api/tally/stats', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load Tally stats');
  return (await res.json()) as { stats: TallyDashboardStats; settings: TallySettingsResponse['settings'] };
}

export async function uploadTallyDocument(file: File, documentType: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  const res = await fetch('/api/tally/upload', {
    method: 'POST',
    body: formData,
  });
  return res;
}
