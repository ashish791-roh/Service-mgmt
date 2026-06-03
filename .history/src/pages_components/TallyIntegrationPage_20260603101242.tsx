'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCcw, Cloud, FilePlus, ShieldCheck, Upload, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { saveTallySettingsToAPI, testTallyConnectionAPI, loadTallyStats, uploadTallyDocument } from '../lib/tallySettings';

interface TallySettingsForm {
  enabled: boolean;
  host: string;
  port: number;
  companyName: string;
  syncStatus: string;
  lastTestedAt?: string;
}

interface TallyDashboardStats {
  totalDocuments: number;
  autoApproved: number;
  pendingReviews: number;
  failedEntries: number;
  successRate: number;
}

export const TallyIntegrationPage: React.FC = () => {
  const [settings, setSettings] = useState<TallySettingsForm>({
    enabled: false,
    host: 'localhost',
    port: 9000,
    companyName: 'FixHub Service Center',
    syncStatus: 'idle',
  });
  const [stats, setStats] = useState<TallyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [documentType, setDocumentType] = useState('invoice');
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const fetchState = async () => {
    setLoading(true);
    try {
      const payload = await loadTallyStats();
      setSettings(payload.settings);
      setStats(payload.stats);
    } catch (error) {
      console.error(error);
      setMessage('Unable to load Tally settings and stats.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const updateField = <K extends keyof TallySettingsForm>(key: K, value: TallySettingsForm[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await saveTallySettingsToAPI({
        enabled: settings.enabled,
        host: settings.host,
        port: settings.port,
        companyName: settings.companyName,
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error || 'Failed to save settings.');
      }
      setMessage('Tally settings saved successfully.');
      setMessageType('success');
      await fetchState();
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'Save failed.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const response = await testTallyConnectionAPI({
        enabled: settings.enabled,
        host: settings.host,
        port: settings.port,
        companyName: settings.companyName,
      });
      const body = await response.json();
      if (!response.ok || !body.result?.success) {
        throw new Error(body.result?.message || body?.error || 'Connection test failed.');
      }
      setMessage(body.result.message || 'Connection test succeeded.');
      setMessageType('success');
      await fetchState();
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'Connection test failed.');
      setMessageType('error');
    } finally {
      setTesting(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadResult(null);
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const response = await uploadTallyDocument(file, documentType);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || 'Upload failed');
      }
      setUploadResult(`Uploaded ${file.name} successfully. Document ID: ${body.document?.id}`);
      if (body.document?.extractedData) {
        setUploadResult(prev => `${prev} Confidence: ${body.document.extractedData.confidence?.toFixed?.(2) ?? 'unknown'}`);
      }
      await fetchState();
    } catch (error) {
      console.error(error);
      setUploadResult(error instanceof Error ? error.message : 'Upload failed.');
    }
  };

  const renderMessage = () => {
    if (!message) return null;
    const color = messageType === 'success' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : messageType === 'error'
      ? 'text-rose-700 bg-rose-50 border-rose-100'
      : 'text-slate-700 bg-slate-50 border-slate-100';
    return (
      <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${color}`}>
        {message}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-teal-600 font-semibold">Tally Integration</p>
            <h1 className="text-2xl font-semibold text-slate-900 mt-2">Automated ledger sync & invoice extraction</h1>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
              Configure TallyPrime connectivity, review document extraction results, and monitor sync status from a single admin view.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchState}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {renderMessage()}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <span className="block text-sm font-semibold text-slate-800 mb-2">Enable Tally sync</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateField('enabled', !settings.enabled)}
                    className={`inline-flex h-10 w-20 items-center rounded-full p-1 transition ${settings.enabled ? 'bg-teal-500' : 'bg-gray-200'}`}
                  >
                    <span className={`h-8 w-8 rounded-full bg-white shadow-sm transition-transform ${settings.enabled ? 'translate-x-10' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm font-medium text-slate-700">{settings.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Company name</span>
                <input
                  value={settings.companyName}
                  onChange={e => updateField('companyName', e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10"
                  placeholder="Tally company name"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Tally host</span>
                <input
                  value={settings.host}
                  onChange={e => updateField('host', e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10"
                  placeholder="localhost"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Tally port</span>
                <input
                  type="number"
                  min={1}
                  value={settings.port}
                  onChange={e => updateField('port', Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Cloud size={18} className="text-teal-600" />
                  <p className="text-sm font-semibold text-slate-900">Connection status</p>
                </div>
                <p className="text-sm text-slate-600">{settings.syncStatus === 'ready' ? 'Ready to sync' : settings.syncStatus === 'failed' ? 'Last test failed' : 'Not tested yet'}</p>
                {settings.lastTestedAt && (
                  <p className="mt-2 text-xs text-slate-500">Last tested: {new Date(settings.lastTestedAt).toLocaleString()}</p>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <ShieldCheck size={18} className="text-slate-700" />
                  <p className="text-sm font-semibold text-slate-900">Audit-friendly sync</p>
                </div>
                <p className="text-sm text-slate-600">All document uploads and Tally pushes are recorded in the audit log for traceability.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save settings
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !settings.enabled}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowRight size={18} />
                Test connection
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <FilePlus size={18} className="text-teal-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Upload document</p>
                  <p className="text-sm text-slate-500">Upload a bill or invoice to generate a Tally document.</p>
                </div>
              </div>
              <div className="grid gap-4">
                <label htmlFor="tally-document-type" className="block text-sm font-semibold text-slate-800">Document type</label>
                <select
                  id="tally-document-type"
                  value={documentType}
                  onChange={e => setDocumentType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10"
                >
                  <option value="invoice">Invoice</option>
                  <option value="gst-invoice">GST Invoice</option>
                  <option value="supplier-bill">Supplier Bill</option>
                  <option value="receipt">Receipt</option>
                  <option value="bank-statement">Bank Statement</option>
                  <option value="image">Image</option>
                </select>

                <label htmlFor="tally-upload-file" className="block text-sm font-semibold text-slate-800">Upload file</label>
                <input id="tally-upload-file" type="file" onChange={handleUpload} className="w-full text-sm text-slate-700" />
                {uploadResult && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{uploadResult}</div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <RefreshCcw size={18} className="text-slate-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Sync metrics</p>
                    <p className="text-sm text-slate-500">Track document processing and approvals.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchState}
                  className="text-sm font-semibold text-teal-600 hover:text-teal-500"
                >
                  Refresh
                </button>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Total documents</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stats?.totalDocuments ?? '—'}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Pending review</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{stats?.pendingReviews ?? '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Accuracy rate</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{stats?.successRate ?? '—'}%</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 grid gap-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <span>{stats?.autoApproved ?? '—'} auto-approved</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <AlertCircle size={16} className="text-rose-500" />
                    <span>{stats?.failedEntries ?? '—'} failed syncs</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700"><Upload size={16} /></span>
          <p>
            Use the upload panel to create a new document and trigger the AI extraction pipeline. After upload, use the document list in the audit log or a future document review screen to approve and push vouchers into Tally.
          </p>
        </div>
      </div>
    </div>
  );
};
