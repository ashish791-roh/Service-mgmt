import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, RefreshCw, Webhook, Check, AlertTriangle, Eye, Trash2, ToggleRight, ToggleLeft, TestTube2, ExternalLink
} from 'lucide-react';

type WebhookEvent = 'job.status_changed' | 'part.approved' | 'part.rejected' | 'payment.created';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, { label: string; desc: string; color: string }> = {
  'job.status_changed': { label: 'Job Status Changed',  desc: 'Fires when a job moves between any statuses', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'part.approved':      { label: 'Part Approved',        desc: 'Fires when a part request is approved',       color: 'bg-green-100 text-green-700 border-green-200' },
  'part.rejected':      { label: 'Part Rejected',        desc: 'Fires when a part request is rejected',       color: 'bg-red-100 text-red-700 border-red-200' },
  'payment.created':    { label: 'Payment Created',      desc: 'Fires when a payment record is added',        color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const BLANK_FORM = { name: '', url: '', secret: '', events: [] as WebhookEvent[], active: true };

export const WebhooksTab: React.FC = () => {
  const [hooks, setHooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; status?: number; error?: string }>>({});
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/webhooks');
      if (r.ok) setHooks(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleEvent(ev: WebhookEvent) {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  }

  async function handleSave() {
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    if (!form.url.trim()) { setFormError('URL is required.'); return; }
    try { new URL(form.url); } catch { setFormError('URL must be a valid https:// address.'); return; }
    if (form.events.length === 0) { setFormError('Select at least one event.'); return; }

    setSaving(true);
    try {
      const payload = { name: form.name, url: form.url, secret: form.secret || undefined, events: form.events, active: form.active };
      let r: Response;
      if (editingId) {
        r = await fetch(`/api/webhooks/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        r = await fetch('/api/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (!r.ok) {
        const d = await r.json();
        setFormError(d.error || 'Save failed.');
        return;
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...BLANK_FORM });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook?')) return;
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    load();
  }

  async function handleToggle(hook: WebhookConfig) {
    await fetch(`/api/webhooks/${hook.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !hook.active }),
    });
    load();
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const r = await fetch('/api/webhooks/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const d = await r.json();
      setTestResults(prev => ({ ...prev, [id]: d }));
    } finally {
      setTestingId(null);
    }
  }

  function startEdit(hook: WebhookConfig) {
    setForm({ name: hook.name, url: hook.url, secret: hook.secret || '', events: [...hook.events], active: hook.active });
    setEditingId(hook.id);
    setShowForm(true);
    setFormError('');
  }

  function startNew() {
    setForm({ ...BLANK_FORM });
    setEditingId(null);
    setShowForm(true);
    setFormError('');
  }

  return (
    <div className="px-8 py-8 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-gray-500 mt-1">
            Fire HTTP POST callbacks to external services on key events.
            Connect to <span className="font-semibold text-gray-700">Zapier</span>,{' '}
            <span className="font-semibold text-gray-700">Make</span>,{' '}
            <span className="font-semibold text-gray-700">WhatsApp Business</span>, Google Sheets, and more — without custom code.
          </p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl text-[13px] font-bold hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20 shrink-0"
        >
          <Plus size={15} strokeWidth={3} /> Add Webhook
        </button>
      </div>

      {/* Event legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(WEBHOOK_EVENT_LABELS) as [WebhookEvent, typeof WEBHOOK_EVENT_LABELS[WebhookEvent]][]).map(([ev, meta]) => (
          <div key={ev} className={`rounded-xl px-4 py-3 border text-[11px] font-semibold ${meta.color}`}>
            <p className="font-bold text-[12px] mb-0.5">{meta.label}</p>
            <p className="font-medium opacity-75">{meta.desc}</p>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 space-y-5 animate-[slideUp_0.3s_ease-out]">
          <h3 className="text-[14px] font-bold text-gray-900">{editingId ? 'Edit Webhook' : 'New Webhook'}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Zapier Job Tracker"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">Endpoint URL</label>
              <input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://hooks.zapier.com/…"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">
              Signing Secret <span className="text-gray-400 font-medium">(optional — HMAC-SHA256)</span>
            </label>
            <input
              value={form.secret}
              onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
              placeholder="Leave blank to skip signature header"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              type="password"
            />
            <p className="text-[11px] text-gray-400 mt-1.5 font-medium">When set, each request includes an <code className="bg-gray-100 px-1 rounded">X-FixHub-Signature</code> header you can verify on your server.</p>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-gray-600 block mb-2">Events to fire on</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(WEBHOOK_EVENT_LABELS) as [WebhookEvent, typeof WEBHOOK_EVENT_LABELS[WebhookEvent]][]).map(([ev, meta]) => {
                const selected = form.events.includes(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all ${
                      selected ? meta.color + ' shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {selected && <Check size={11} className="inline mr-1" strokeWidth={3} />}
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-[12px] font-semibold border border-red-200">
              <AlertTriangle size={14} /> {formError}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white rounded-xl text-[13px] font-bold hover:bg-teal-400 disabled:opacity-60 transition-colors"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
              {saving ? 'Saving…' : editingId ? 'Update Webhook' : 'Create Webhook'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setFormError(''); }}
              className="px-4 py-2.5 text-[13px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-[13px] font-medium gap-2">
          <RefreshCw size={16} className="animate-spin" /> Loading webhooks…
        </div>
      ) : hooks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Webhook size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px] font-semibold text-gray-500">No webhooks configured yet.</p>
          <p className="text-[12px] font-medium text-gray-400 mt-1">Click &ldquo;Add Webhook&rdquo; to connect FixHub to external tools.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hooks.map(hook => {
            const testRes = testResults[hook.id];
            return (
              <div key={hook.id} className={`bg-white rounded-2xl border ${hook.active ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
                {/* Active indicator */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${hook.active ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-gray-900">{hook.name}</span>
                    {!hook.active && <span className="text-[10px] font-bold bg-gray-100 text-gray-400 rounded-full px-2 py-0.5 uppercase tracking-wide">Paused</span>}
                  </div>
                  <p className="text-[12px] font-medium text-gray-400 mt-0.5 truncate">{hook.url}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {hook.events.map(ev => (
                      <span key={ev} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${WEBHOOK_EVENT_LABELS[ev]?.color ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {WEBHOOK_EVENT_LABELS[ev]?.label ?? ev}
                      </span>
                    ))}
                  </div>
                  {testRes && (
                    <p className={`text-[11px] font-semibold mt-1.5 ${testRes.ok ? 'text-green-600' : 'text-red-500'}`}>
                      {testRes.ok ? `✓ Test delivered (HTTP ${testRes.status})` : `✗ Test failed — ${testRes.error ?? `HTTP ${testRes.status}`}`}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTest(hook.id)}
                    disabled={testingId === hook.id}
                    title="Send test payload"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                  >
                    {testingId === hook.id ? <RefreshCw size={12} className="animate-spin" /> : <TestTube2 size={12} />}
                    Test
                  </button>
                  <button
                    onClick={() => handleToggle(hook)}
                    title={hook.active ? 'Pause webhook' : 'Activate webhook'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    {hook.active ? <ToggleRight size={14} className="text-teal-500" /> : <ToggleLeft size={14} />}
                    {hook.active ? 'Active' : 'Paused'}
                  </button>
                  <button
                    onClick={() => startEdit(hook)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
                    title="Edit"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(hook.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Integration hints */}
      <div className="mt-6 bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl border border-teal-100 p-6">
        <h4 className="text-[13px] font-bold text-teal-800 mb-3 flex items-center gap-2">
          <ExternalLink size={14} /> Popular integrations
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
          {[
            { name: 'Zapier', hint: 'Use "Catch Hook" as trigger URL, then connect to WhatsApp, Gmail, Sheets…', icon: '⚡' },
            { name: 'Make (Integromat)', hint: '"Custom Webhook" module → map FixHub JSON fields to any app.', icon: '🔗' },
            { name: 'Google Sheets', hint: 'Via Zapier/Make: append a row on every job status change automatically.', icon: '📊' },
          ].map(tip => (
            <div key={tip.name} className="bg-white/70 rounded-xl p-4 border border-white">
              <p className="font-bold text-gray-800 mb-1">{tip.icon} {tip.name}</p>
              <p className="text-gray-500 font-medium leading-relaxed">{tip.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
