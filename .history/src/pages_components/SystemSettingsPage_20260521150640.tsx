import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Toast, useToast } from '../components/ui';
import {
  Building2, Bell, Shield, Clock, Palette,
  Save, ChevronRight, Info, Check,
  AlertTriangle, Eye, CreditCard, Plus, Trash2, Timer, ShieldCheck,
  Webhook, RefreshCw, TestTube2, ToggleLeft, ToggleRight, ExternalLink,
} from 'lucide-react';
import { DEFAULT_SLA_TIERS, type SLATier } from '../lib/sla';
import {
  loadWarrantyConfig, saveWarrantyConfig,
  DEFAULT_WARRANTY_ENTRIES, type WarrantyEntry,
} from '../lib/warrantyConfig';
import { saveSLATiersToAPI } from '../lib/sla';
import { saveWarrantyConfigToAPI } from '../lib/warrantyConfig';

// ── Local storage key for persisting settings ───────────────────────────────
const SETTINGS_KEY = 'fixhub_system_settings';

// ── Default settings ────────────────────────────────────────────────────────
export interface SystemSettings {
  shopName: string;
  shopPhone: string;
  shopEmail: string;
  shopAddress: string;
  currency: string;
  urgencyYellowDays: number;
  urgencyRedDays: number;
  defaultJobStatus: string;
  notifyOnNewJob: boolean;
  notifyOnJobComplete: boolean;
  notifyOnPartsRequest: boolean;
  sessionTimeoutMinutes: number;
  requirePasswordChange: boolean;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
}

const DEFAULT_SETTINGS: SystemSettings = {
  shopName: 'FixHub Service Center',
  shopPhone: '',
  shopEmail: '',
  shopAddress: '',
  currency: 'INR',
  urgencyYellowDays: 5,
  urgencyRedDays: 10,
  defaultJobStatus: 'New',
  notifyOnNewJob: true,
  notifyOnJobComplete: true,
  notifyOnPartsRequest: true,
  sessionTimeoutMinutes: 60,
  requirePasswordChange: false,
  dateFormat: 'DD/MM/YYYY',
  theme: 'light',
};

// ── Load / save helpers ─────────────────────────────────────────────────────
function loadSettings(): SystemSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: SystemSettings): void {
  try { 
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); 
    window.dispatchEvent(new Event('theme-change'));
  } catch { /* ignore */ }
}

export function getSettings(): SystemSettings {
  return loadSettings();
}

// ── Reusable sub-components ─────────────────────────────────────────────────
const PageHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-gray-200/60 shadow-sm relative overflow-hidden">
    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
    <div className="relative z-10">
      <h1 className="text-[24px] font-semibold text-gray-900 tracking-tight">{title}</h1>
      <p className="text-[14px] font-medium text-gray-500 mt-1.5">{subtitle}</p>
    </div>
  </div>
);

const SectionCard = ({ icon: Icon, title, description, children, animateKey }: any) => (
  <div
    key={animateKey}
    className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden animate-[slideUp_0.4s_ease-out]"
  >
    <div className="flex items-center gap-4 px-8 py-6 bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-900 dark:to-gray-800 border-b border-gray-100">
      <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-teal-600 shrink-0">
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div>
        <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">{title}</h2>
        <p className="text-[12px] font-medium text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="px-8 py-7 space-y-7">
      {children}
    </div>
  </div>
);

const FieldRow = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
    <div className="sm:w-64 shrink-0 pt-2">
      <label className="text-[14px] font-semibold text-gray-800">{label}</label>
      {hint && <p className="text-[12px] font-medium text-gray-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

const Input = ({ value, onChange, placeholder, type = 'text', min, max, icon: Icon }: any) => (
  <div className="relative flex items-center">
    {Icon && <Icon size={16} className="absolute left-4 text-gray-400 pointer-events-none" />}
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-gray-50 border border-gray-200 rounded-xl ${Icon ? 'pl-11' : 'px-4'} py-3 text-[14px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition-all duration-200`}
    />
  </div>
);

const Select = ({ value, onChange, options, icon: Icon }: any) => (
  <div className="relative flex items-center">
    {Icon && <Icon size={16} className="absolute left-4 text-gray-400 pointer-events-none z-10" />}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full bg-gray-50 border border-gray-200 rounded-xl ${Icon ? 'pl-11' : 'px-4'} py-3 text-[14px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition-all duration-200 appearance-none`}
    >
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronRight size={16} className="absolute right-4 text-gray-400 pointer-events-none rotate-90" />
  </div>
);

const ToggleRow = ({ label, hint, checked, onChange }: any) => (
  <div className="flex items-start justify-between gap-6 py-2">
    <div>
      <p className="text-[14px] font-semibold text-gray-800">{label}</p>
      {hint && <p className="text-[12px] font-medium text-gray-400 mt-1 leading-relaxed max-w-lg">{hint}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative shrink-0 w-[44px] h-[24px] rounded-full transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-teal-500/20 shadow-inner border border-transparent ${checked ? 'bg-teal-500 border-teal-600/20' : 'bg-gray-200 border-gray-300/50'}`}
    >
      <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${checked ? 'translate-x-[20px]' : 'translate-x-0'}`} />
    </button>
  </div>
);

const Divider = () => <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent my-1" />;

type Tab = 'business' | 'jobs' | 'sla' | 'warranty' | 'notifications' | 'security' | 'display' | 'webhooks';

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'business',      label: 'Business Profile',  icon: Building2,   desc: 'Contact & location info' },
  { id: 'jobs',          label: 'Service Jobs',      icon: Clock,       desc: 'Urgency thresholds' },
  { id: 'sla',           label: 'SLA Tiers',         icon: Timer,       desc: 'Per-device-type deadlines' },
  { id: 'warranty',      label: 'Warranty',          icon: ShieldCheck, desc: 'Per-repair warranty durations' },
  { id: 'notifications', label: 'Notifications',     icon: Bell,        desc: 'Admin alert preferences' },
  { id: 'security',      label: 'Access Control',    icon: Shield,      desc: 'Session & security policies' },
  { id: 'display',       label: 'Appearance',        icon: Palette,     desc: 'Theme & formatting' },
  { id: 'webhooks',      label: 'Webhooks',          icon: Webhook,     desc: 'Zapier & external integrations' },
];

// ── Webhook types (mirror lib/webhooks.ts) ───────────────────────────────────
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

const WebhooksTab: React.FC = () => {
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

export const SystemSettingsPage: React.FC = () => {
  const { currentUser, slaTiers, updateSLATiers } = useApp();
  const { toast, show: showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('business');
  // ── SLA tier local edit state ─────────────────────────────────
  const [editTiers, setEditTiers] = useState<SLATier[]>(slaTiers);
  const [slaEdited, setSlaEdited] = useState(false);

  const handleTierChange = (idx: number, field: keyof SLATier, value: string | number) => {
    setEditTiers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    setSlaEdited(true);
  };
  const handleAddTier = () => {
    setEditTiers(prev => [...prev, { deviceType: 'New Type', warningHours: 48, criticalHours: 72 }]);
    setSlaEdited(true);
  };
  const handleRemoveTier = (idx: number) => {
    setEditTiers(prev => prev.filter((_, i) => i !== idx));
    setSlaEdited(true);
  };
  const handleSaveTiers = () => {
    const valid = editTiers.every(t => t.deviceType.trim() && t.warningHours > 0 && t.criticalHours > t.warningHours);
    if (!valid) { showToast('Each tier needs a name and criticalHours > warningHours.', 'error'); return; }
    updateSLATiers(editTiers);
    setSlaEdited(false);
    showToast('SLA tiers saved.', 'success');
  };
  const handleResetTiers = () => {
    setEditTiers([...DEFAULT_SLA_TIERS]);
    setSlaEdited(true);
  };

  // ── Warranty duration local edit state ────────────────────────
  const [editWarranty, setEditWarranty] = useState<WarrantyEntry[]>(() => loadWarrantyConfig());
  const [warrantyEdited, setWarrantyEdited] = useState(false);

  const handleWarrantyChange = (idx: number, field: keyof WarrantyEntry, value: string | number) => {
    setEditWarranty(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    setWarrantyEdited(true);
  };
  const handleAddWarrantyEntry = () => {
    setEditWarranty(prev => [...prev, { deviceType: 'New Type', days: 30 }]);
    setWarrantyEdited(true);
  };
  const handleRemoveWarrantyEntry = (idx: number) => {
    setEditWarranty(prev => prev.filter((_, i) => i !== idx));
    setWarrantyEdited(true);
  };
  const handleSaveWarranty = () => {
    const valid = editWarranty.every(e => e.deviceType.trim() && e.days >= 0);
    if (!valid) { showToast('Each warranty entry needs a device type and a non-negative number of days.', 'error'); return; }
    saveWarrantyConfig(editWarranty);
    setWarrantyEdited(false);
    showToast('Warranty durations saved.', 'success');
  };
  const handleResetWarranty = () => {
    setEditWarranty([...DEFAULT_WARRANTY_ENTRIES]);
    setWarrantyEdited(true);
  };

  const [settings, setSettings] = useState<SystemSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<SystemSettings>(loadSettings);

  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  // Instant theme preview
  useEffect(() => {
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    // Cleanup: if unmounted without saving, App.tsx's applyTheme will run on next load, 
    // but to be safe, dispatch a theme-change to force App.tsx to revert to localStorage.
    return () => {
      window.dispatchEvent(new Event('theme-change'));
    };
  }, [settings.theme]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Shield size={32} className="text-gray-300" />
        </div>
        <h2 className="text-[18px] font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-[13px] font-medium text-gray-500">System settings are restricted to Administrators.</p>
      </div>
    );
  }

  const set = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    saveSettings(settings);
    setOriginalSettings(settings);
    setSaved(true);
    showToast('Settings successfully updated', 'success');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    showToast('Settings restored to defaults', 'info');
  };

  const handleDiscard = () => {
    setSettings(originalSettings);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] pb-32">
      <PageHeader
        title="System Preferences"
        subtitle="Configure the operational behaviour and appearance of the FixHub platform."
      />

      <div className="flex items-start gap-4 px-5 py-4 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-slate-800 dark:to-slate-900 border border-blue-100 dark:border-slate-700 rounded-2xl shadow-sm">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[13px] font-medium text-blue-800 dark:text-blue-200 leading-relaxed">
          These settings apply globally to this browser instance. They dictate SLA visual thresholds, default workflows, and your core administrative preferences.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Floating Sidebar */}
        <nav className="lg:w-72 shrink-0 space-y-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 group ${
                  isActive
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/20'
                    : 'bg-transparent text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-teal-50 group-hover:text-teal-600'
                }`}>
                  <Icon size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className={`text-[14px] font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                    {tab.label}
                  </h3>
                  <p className={`text-[12px] font-medium mt-0.5 ${isActive ? 'text-teal-100' : 'text-gray-500'}`}>
                    {tab.desc}
                  </p>
                </div>
                {isActive && <ChevronRight size={16} className="ml-auto text-white/70" />}
              </button>
            );
          })}
        </nav>

        {/* Dynamic Content Panel */}
        <div className="flex-1 min-w-0">
          {activeTab === 'business' && (
            <SectionCard animateKey="business" icon={Building2} title="Business Profile" description="Manage your public facing operational details.">
              <FieldRow label="Registered Name" hint="This name appears on invoices, reports, and customer emails.">
                <Input
                  icon={Building2}
                  value={settings.shopName}
                  onChange={(v: string) => set('shopName', v)}
                  placeholder="e.g. FixHub Service Center"
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Primary Phone" hint="The main contact line for customer inquiries.">
                <Input
                  value={settings.shopPhone}
                  onChange={(v: string) => set('shopPhone', v)}
                  placeholder="e.g. +91 98765 43210"
                  type="tel"
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Support Email" hint="Monitored email address for support requests.">
                <Input
                  value={settings.shopEmail}
                  onChange={(v: string) => set('shopEmail', v)}
                  placeholder="e.g. support@fixhub.in"
                  type="email"
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Physical Address" hint="Where devices are dropped off and serviced.">
                <textarea
                  value={settings.shopAddress}
                  onChange={e => set('shopAddress', e.target.value)}
                  placeholder="e.g. 12, MG Road, Bengaluru, Karnataka 560001"
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition-all duration-200 resize-none"
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Billing Currency" hint="Set the base currency for all estimates and sales.">
                <Select
                  icon={CreditCard}
                  value={settings.currency}
                  onChange={(v: string) => set('currency', v)}
                  options={[
                    { value: 'INR', label: '₹ (INR) — Indian Rupee' },
                    { value: 'USD', label: '$ (USD) — US Dollar' },
                    { value: 'EUR', label: '€ (EUR) — Euro' },
                    { value: 'GBP', label: '£ (GBP) — British Pound' },
                    { value: 'AED', label: 'د.إ (AED) — UAE Dirham' },
                  ]}
                />
              </FieldRow>
            </SectionCard>
          )}

          {activeTab === 'jobs' && (
            <SectionCard animateKey="jobs" icon={Clock} title="Service Level Agreements" description="Define processing thresholds and automated status assignments.">
              <FieldRow label="Default Status on Creation" hint="New jobs logged by reception will automatically be assigned this status.">
                <Select
                  value={settings.defaultJobStatus}
                  onChange={(v: string) => set('defaultJobStatus', v)}
                  options={[
                    { value: 'New',      label: 'New — Requires Assignment' },
                    { value: 'Assigned', label: 'Assigned — Ready for Engineer' },
                  ]}
                />
              </FieldRow>
              
              <div className="pt-6 mt-6 border-t border-gray-100">
                <div className="mb-6">
                  <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    Urgency Escalation Matrix
                  </h3>
                  <p className="text-[13px] font-medium text-gray-500 mt-1">
                    Set the SLA parameters. Jobs exceeding these thresholds without resolution will trigger visual alerts across the dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Yellow Alert Card */}
                  <div className="relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-b from-amber-200 to-amber-100">
                    <div className="bg-gradient-to-b from-amber-50/90 to-white h-full rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shadow-inner">
                            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
                          </div>
                          <h4 className="text-[14px] font-bold text-amber-900 tracking-tight">Warning Tier</h4>
                        </div>
                      </div>
                      <p className="text-[12px] font-medium text-amber-700/80 mb-3">Trigger warning alert after</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={1}
                          max={settings.urgencyRedDays - 1}
                          value={settings.urgencyYellowDays}
                          onChange={e => set('urgencyYellowDays', Math.max(1, Math.min(settings.urgencyRedDays - 1, Number(e.target.value))))}
                          className="w-24 bg-white border border-amber-200/50 shadow-sm rounded-xl px-4 py-2.5 text-[16px] font-bold text-amber-900 focus:outline-none focus:ring-4 focus:ring-amber-500/20 text-center"
                        />
                        <span className="text-[14px] font-semibold text-amber-800">Days</span>
                      </div>
                    </div>
                  </div>

                  {/* Red Alert Card */}
                  <div className="relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-b from-rose-200 to-rose-100">
                    <div className="bg-gradient-to-b from-rose-50/90 to-white h-full rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shadow-inner">
                            <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm animate-pulse" />
                          </div>
                          <h4 className="text-[14px] font-bold text-rose-900 tracking-tight">Critical Tier</h4>
                        </div>
                      </div>
                      <p className="text-[12px] font-medium text-rose-700/80 mb-3">Trigger critical breach after</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={settings.urgencyYellowDays + 1}
                          max={365}
                          value={settings.urgencyRedDays}
                          onChange={e => set('urgencyRedDays', Math.max(settings.urgencyYellowDays + 1, Number(e.target.value)))}
                          className="w-24 bg-white border border-rose-200/50 shadow-sm rounded-xl px-4 py-2.5 text-[16px] font-bold text-rose-900 focus:outline-none focus:ring-4 focus:ring-rose-500/20 text-center"
                        />
                        <span className="text-[14px] font-semibold text-rose-800">Days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'sla' && (
            <SectionCard animateKey="sla" icon={Timer} title="SLA Tier Configuration" description="Define per-device-type SLA deadlines. Jobs exceeding these thresholds get flagged and notifications are sent to the engineer and all admins.">
              {/* Info banner */}
              <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-[13px] text-blue-700 font-medium mb-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-blue-500" />
                <span>
                  The <strong>Warning</strong> threshold triggers a yellow badge. The <strong>Critical</strong> threshold triggers a red badge and pushes an SLA-breach notification to the assigned engineer and all admins. Critical must be greater than Warning.
                </span>
              </div>

              {/* Tier table */}
              <div className="space-y-3 mt-2">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_120px_120px_40px] gap-3 px-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Device Type</span>
                  <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wide text-center">Warning (h)</span>
                  <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wide text-center">Critical (h)</span>
                  <span />
                </div>

                {editTiers.map((tier, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_120px_120px_40px] gap-3 items-center">
                    <input
                      type="text"
                      value={tier.deviceType}
                      onChange={e => handleTierChange(idx, 'deviceType', e.target.value)}
                      placeholder="e.g. Phone"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
                    />
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={tier.criticalHours - 1}
                        value={tier.warningHours}
                        onChange={e => handleTierChange(idx, 'warningHours', Math.max(1, Number(e.target.value)))}
                        className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[14px] font-bold text-amber-900 text-center focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={tier.warningHours + 1}
                        max={720}
                        value={tier.criticalHours}
                        onChange={e => handleTierChange(idx, 'criticalHours', Math.max(tier.warningHours + 1, Number(e.target.value)))}
                        className="w-full bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[14px] font-bold text-red-900 text-center focus:outline-none focus:ring-2 focus:ring-red-400/40"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveTier(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove tier"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddTier}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-teal-600 hover:text-teal-700 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors border border-teal-200"
                  >
                    <Plus size={13} /> Add Tier
                  </button>
                  <button
                    onClick={handleResetTiers}
                    className="text-[13px] font-medium text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Reset to Defaults
                  </button>
                </div>
                <button
                  onClick={handleSaveTiers}
                  disabled={!slaEdited}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                    slaEdited
                      ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Save size={14} /> Save SLA Tiers
                </button>
              </div>

              {/* Live preview */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-[13px] font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Eye size={13} /> Live Preview
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {editTiers.map((tier, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[12px] font-bold text-gray-700 mb-2">{tier.deviceType || '—'}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-[11px] text-amber-700 font-medium">Warning after {tier.warningHours}h</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          <span className="text-[11px] text-red-700 font-medium">Breach after {tier.criticalHours}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'warranty' && (
            <SectionCard animateKey="warranty" icon={ShieldCheck} title="Warranty Duration Configuration" description="Set how many days of warranty cover each device type receives after a completed repair. A value of 0 means no warranty certificate is issued.">
              {/* Info banner */}
              <div className="flex items-start gap-3 px-4 py-3 bg-teal-50 border border-teal-100 rounded-xl text-[13px] text-teal-700 font-medium mb-2">
                <ShieldCheck size={15} className="shrink-0 mt-0.5 text-teal-500" />
                <span>
                  When a job is marked <strong>Completed</strong>, a PDF warranty certificate is auto-generated and the customer receives an SMS link to download it. Set <strong>0 days</strong> to disable warranty for that device type.
                </span>
              </div>

              {/* Warranty table */}
              <div className="space-y-3 mt-2">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_160px_40px] gap-3 px-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Device Type</span>
                  <span className="text-[11px] font-semibold text-teal-500 uppercase tracking-wide text-center">Warranty (days)</span>
                  <span />
                </div>

                {editWarranty.map((entry, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_160px_40px] gap-3 items-center">
                    <input
                      type="text"
                      value={entry.deviceType}
                      onChange={e => handleWarrantyChange(idx, 'deviceType', e.target.value)}
                      placeholder="e.g. Phone"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
                    />
                    <input
                      type="number"
                      min={0}
                      max={730}
                      value={entry.days}
                      onChange={e => handleWarrantyChange(idx, 'days', Math.max(0, Number(e.target.value)))}
                      className="w-full bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 text-[14px] font-bold text-teal-900 text-center focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                    />
                    <button
                      onClick={() => handleRemoveWarrantyEntry(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddWarrantyEntry}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-teal-600 hover:text-teal-700 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors border border-teal-200"
                  >
                    <Plus size={13} /> Add Device Type
                  </button>
                  <button
                    onClick={handleResetWarranty}
                    className="text-[13px] font-medium text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Reset to Defaults
                  </button>
                </div>
                <button
                  onClick={handleSaveWarranty}
                  disabled={!warrantyEdited}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                    warrantyEdited
                      ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Save size={14} /> Save Warranty Config
                </button>
              </div>

              {/* Live preview */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-[13px] font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Eye size={13} /> Live Preview
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {editWarranty.map((entry, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[12px] font-bold text-gray-700 mb-2">{entry.deviceType || '—'}</p>
                      <div className="flex items-center gap-2">
                        {entry.days > 0 ? (
                          <>
                            <span className="inline-block w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                            <span className="text-[11px] text-teal-700 font-medium">{entry.days}-day warranty</span>
                          </>
                        ) : (
                          <>
                            <span className="inline-block w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                            <span className="text-[11px] text-gray-400 font-medium">No warranty</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'notifications' && (
            <SectionCard animateKey="notifs" icon={Bell} title="Admin Alert Preferences" description="Configure the in-app events that will push notifications to your admin account.">
              <ToggleRow
                label="New Job Registration"
                hint="Receive an alert instantly when reception logs a new device for repair."
                checked={settings.notifyOnNewJob}
                onChange={(v: boolean) => set('notifyOnNewJob', v)}
              />
              <Divider />
              <ToggleRow
                label="Job Resolution"
                hint="Be notified when an engineer marks a job as 'Completed' or 'Delivered'."
                checked={settings.notifyOnJobComplete}
                onChange={(v: boolean) => set('notifyOnJobComplete', v)}
              />
              <Divider />
              <ToggleRow
                label="Inventory & Parts Requests"
                hint="Alerts when an engineer requests a part that needs administrative approval."
                checked={settings.notifyOnPartsRequest}
                onChange={(v: boolean) => set('notifyOnPartsRequest', v)}
              />
            </SectionCard>
          )}

          {activeTab === 'security' && (
            <SectionCard animateKey="sec" icon={Shield} title="Security Policies" description="Manage session lifetimes and password requirements.">
              <FieldRow label="Session Expiry Time" hint="Automatically log users out after a period of inactivity to secure the terminal.">
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={settings.sessionTimeoutMinutes}
                    onChange={e => set('sessionTimeoutMinutes', Math.max(5, Math.min(1440, Number(e.target.value))))}
                    className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 text-center"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800">Minutes</p>
                    <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                      Equivalent to {settings.sessionTimeoutMinutes >= 60
                        ? `${(settings.sessionTimeoutMinutes / 60).toFixed(1)} hours`
                        : `${settings.sessionTimeoutMinutes} mins`}
                    </p>
                  </div>
                </div>
              </FieldRow>
              <Divider />
              <ToggleRow
                label="Mandatory Password Reset"
                hint="Force new employees to change their temporary password upon their first successful login."
                checked={settings.requirePasswordChange}
                onChange={(v: boolean) => set('requirePasswordChange', v)}
              />
              
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Shield size={14} className="text-gray-400" />
                  Privilege Matrix Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Deactivate Staff Accounts',  value: 'Admin Only' },
                    { label: 'View Revenue Forecasts',     value: 'Admin & Reception' },
                    { label: 'Modify Job Assignments',     value: 'Admin & Reception' },
                    { label: 'Engineer Data Access',       value: 'Assigned Jobs Only' },
                  ].map(row => (
                    <div key={row.label} className="bg-gray-50 rounded-xl p-4 border border-gray-200/50 flex flex-col justify-between">
                      <span className="text-[12px] font-medium text-gray-500 mb-2">{row.label}</span>
                      <span className="text-[13px] font-bold text-gray-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'display' && (
            <SectionCard animateKey="disp" icon={Palette} title="Interface Appearance" description="Customise the visual rendering of the FixHub platform.">
              <FieldRow label="Date Formatting" hint="The convention used for timestamps across all tables and logs.">
                <Select
                  value={settings.dateFormat}
                  onChange={(v: string) => set('dateFormat', v)}
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY  (e.g., 31/12/2025)' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY  (e.g., 12/31/2025)' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD  (e.g., 2025-12-31)' },
                    { value: 'D MMM YYYY', label: 'D MMM YYYY  (e.g., 31 Dec 2025)' },
                  ]}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="UI Theme Mode" hint="Select the primary colour scheme for the dashboard.">
                <div className="flex gap-4">
                  {([
                    { value: 'light',  label: 'Light Mode',  desc: 'Classic bright interface' },
                    { value: 'dark',   label: 'Dark Mode',   desc: 'Professional dark interface' },
                    { value: 'system', label: 'System Sync', desc: 'Adapts to OS preferences' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => set('theme', opt.value)}
                      className={`flex-1 py-4 px-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                        settings.theme === opt.value
                          ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <p className={`text-[14px] font-bold ${settings.theme === opt.value ? 'text-teal-900' : 'text-gray-900'}`}>{opt.label}</p>
                      <p className={`text-[12px] font-medium mt-1 ${settings.theme === opt.value ? 'text-teal-700/80' : 'text-gray-500'}`}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </FieldRow>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Eye size={14} className="text-gray-400" />
                  Live Widget Preview
                </h3>
                <div className="bg-gray-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  {/* Fake UI Header */}
                  <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                        <WrenchIcon />
                      </div>
                      <span className="text-[15px] font-bold text-white tracking-tight">{settings.shopName || 'Shop Name'}</span>
                    </div>
                    <div className="text-[12px] font-medium text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full">
                      {settings.currency} Balance: 1,250.00
                    </div>
                  </div>
                  {/* Fake Table Row */}
                  <div className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-700/50">
                    <div>
                      <p className="text-[13px] font-semibold text-gray-200">Job #1042</p>
                      <p className="text-[11px] font-medium text-gray-500 mt-1">Logged on: {settings.dateFormat}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
                      <span className="text-[12px] font-bold text-rose-400">{settings.urgencyRedDays} Days Overdue</span>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'webhooks' && (
            <SectionCard animateKey="webhooks" icon={Webhook} title="Webhook / Zapier Integration" description="Fire HTTP callbacks to external services on job, parts, and payment events.">
              <WebhooksTab />
            </SectionCard>
          )}

        </div>
      </div>

      {/* ── Smart Floating Save Bar ───────────────────────────────── */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isDirty ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0 pointer-events-none'
      }`}>
        <div className="bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-gray-700/50 backdrop-blur-xl">
          <div className="flex flex-col">
            <p className="text-[14px] font-bold">Unsaved Changes Detected</p>
            <p className="text-[12px] font-medium text-gray-400">Please save your settings before leaving.</p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleDiscard}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-lg ${
                saved 
                  ? 'bg-green-500 text-white shadow-green-500/20' 
                  : 'bg-teal-500 text-white hover:bg-teal-400 shadow-teal-500/20'
              }`}
            >
              {saved ? <Check size={16} strokeWidth={3} /> : <Save size={16} strokeWidth={2.5} />}
              {saved ? 'Saved!' : 'Apply Changes'}
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

// Mini icon for the preview widget
const WrenchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);