import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Toast, useToast } from '../components/ui';
import {
  Building2, Bell, Shield, Clock, Palette,
  Save, RotateCcw, ChevronRight, Info, Check,
} from 'lucide-react';

// ── Local storage key for persisting settings ───────────────────────────────
const SETTINGS_KEY = 'fixhub_system_settings';

// ── Default settings ────────────────────────────────────────────────────────
export interface SystemSettings {
  // Business Info
  shopName: string;
  shopPhone: string;
  shopEmail: string;
  shopAddress: string;
  currency: string;

  // Job Settings
  urgencyYellowDays: number;
  urgencyRedDays: number;
  defaultJobStatus: string;

  // Notification Preferences (admin-level)
  notifyOnNewJob: boolean;
  notifyOnJobComplete: boolean;
  notifyOnPartsRequest: boolean;

  // Security
  sessionTimeoutMinutes: number;
  requirePasswordChange: boolean;

  // Display
  dateFormat: string;
  theme: 'light' | 'system';
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
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: SystemSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function getSettings(): SystemSettings {
  return loadSettings();
}

// ── Reusable sub-components ─────────────────────────────────────────────────
const PageHeader = ({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const SectionCard = ({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    {/* Section header */}
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-500 shrink-0">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-gray-900">{title}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="px-6 py-5 space-y-5">
      {children}
    </div>
  </div>
);

const FieldRow = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
    <div className="sm:w-48 shrink-0">
      <p className="text-[13px] font-medium text-gray-700">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

const Input = ({ value, onChange, placeholder, type = 'text', min, max }: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) => (
  <input
    type={type}
    value={value}
    min={min}
    max={max}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
  />
);

const Select = ({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const ToggleRow = ({ label, hint, checked, onChange }: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-4 py-1">
    <div>
      <p className="text-[13px] font-medium text-gray-700">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${checked ? 'bg-teal-500' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

const Divider = () => <hr className="border-gray-100" />;

// ── Nav tab type ────────────────────────────────────────────────────────────
type Tab = 'business' | 'jobs' | 'notifications' | 'security' | 'display';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'business',      label: 'Business',      icon: Building2 },
  { id: 'jobs',          label: 'Jobs',           icon: Clock },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'security',      label: 'Security',       icon: Shield },
  { id: 'display',       label: 'Display',        icon: Palette },
];

// ── Main Page ───────────────────────────────────────────────────────────────
export const SystemSettingsPage: React.FC = () => {
  const { currentUser } = useApp();
  const { toast, show: showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('business');
  const [settings, setSettings] = useState<SystemSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

  // Guard — only admins can access this page (also enforced in App.tsx routing)
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Shield size={48} className="mb-4 opacity-40" />
        <p className="text-[13px] font-medium text-gray-500">Access denied — Administrators only</p>
      </div>
    );
  }

  const set = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    showToast('Settings saved successfully', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    showToast('Settings reset to defaults', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="System Settings"
        subtitle="Configure global preferences, business info, and system behaviour"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[13px] font-medium transition-colors"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        }
      />

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-700">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          Settings are stored locally in this browser. They persist across sessions on this device and control
          display behaviour, urgency thresholds, and notification preferences for the admin account.
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <nav className="lg:w-48 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-colors relative ${
                    idx !== 0 ? 'border-t border-gray-100' : ''
                  } ${
                    isActive
                      ? 'bg-teal-50 text-teal-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[16px] bg-teal-500 rounded-r-full" />
                  )}
                  <Icon size={15} className="shrink-0" />
                  {tab.label}
                  {isActive && <ChevronRight size={13} className="ml-auto text-teal-400" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content panel */}
        <div className="flex-1 space-y-5">

          {/* ── BUSINESS INFO ─────────────────────────────────────────── */}
          {activeTab === 'business' && (
            <SectionCard icon={Building2} title="Business Information" description="Your shop's details used across the system">
              <FieldRow label="Shop Name" hint="Displayed in the header and reports">
                <Input
                  value={settings.shopName}
                  onChange={v => set('shopName', v)}
                  placeholder="e.g. FixHub Service Center"
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Phone Number" hint="Contact number for customer communication">
                <Input
                  value={settings.shopPhone}
                  onChange={v => set('shopPhone', v)}
                  placeholder="e.g. +91 98765 43210"
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Email Address" hint="Business email for correspondence">
                <Input
                  value={settings.shopEmail}
                  onChange={v => set('shopEmail', v)}
                  placeholder="e.g. support@fixhub.in"
                  type="email"
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Address" hint="Physical shop location">
                <textarea
                  value={settings.shopAddress}
                  onChange={e => set('shopAddress', e.target.value)}
                  placeholder="e.g. 12, MG Road, Bengaluru, Karnataka 560001"
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors resize-none"
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Currency" hint="Currency symbol used in billing and reports">
                <Select
                  value={settings.currency}
                  onChange={v => set('currency', v)}
                  options={[
                    { value: 'INR', label: '₹ INR — Indian Rupee' },
                    { value: 'USD', label: '$ USD — US Dollar' },
                    { value: 'EUR', label: '€ EUR — Euro' },
                    { value: 'GBP', label: '£ GBP — British Pound' },
                    { value: 'AED', label: 'د.إ AED — UAE Dirham' },
                  ]}
                />
              </FieldRow>
            </SectionCard>
          )}

          {/* ── JOB SETTINGS ──────────────────────────────────────────── */}
          {activeTab === 'jobs' && (
            <SectionCard icon={Clock} title="Job Configuration" description="Control urgency thresholds and default job behaviour">
              <FieldRow label="Default Job Status" hint="Status assigned when a new job is created">
                <Select
                  value={settings.defaultJobStatus}
                  onChange={v => set('defaultJobStatus', v)}
                  options={[
                    { value: 'New',      label: 'New' },
                    { value: 'Assigned', label: 'Assigned' },
                  ]}
                />
              </FieldRow>
              <Divider />
              <div className="space-y-1">
                <p className="text-[13px] font-semibold text-gray-700">Urgency Colour Thresholds</p>
                <p className="text-[11px] text-gray-400">
                  Jobs pending longer than these limits are highlighted to flag overdue work.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" />
                    <p className="text-[12px] font-semibold text-yellow-700 uppercase tracking-wide">Yellow Alert</p>
                  </div>
                  <p className="text-[11px] text-yellow-600">Pending for more than</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={settings.urgencyRedDays - 1}
                      value={settings.urgencyYellowDays}
                      onChange={e => set('urgencyYellowDays', Math.max(1, Math.min(settings.urgencyRedDays - 1, Number(e.target.value))))}
                      className="w-20 bg-white border border-yellow-300 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-yellow-800 focus:outline-none focus:border-yellow-500 transition-colors text-center"
                    />
                    <span className="text-[12px] text-yellow-700 font-medium">days</span>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                    <p className="text-[12px] font-semibold text-red-700 uppercase tracking-wide">Red Alert</p>
                  </div>
                  <p className="text-[11px] text-red-600">Pending for more than</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={settings.urgencyYellowDays + 1}
                      max={365}
                      value={settings.urgencyRedDays}
                      onChange={e => set('urgencyRedDays', Math.max(settings.urgencyYellowDays + 1, Number(e.target.value)))}
                      className="w-20 bg-white border border-red-300 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-red-800 focus:outline-none focus:border-red-500 transition-colors text-center"
                    />
                    <span className="text-[12px] text-red-700 font-medium">days</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-600">Current thresholds:</span>{' '}
                  Jobs are highlighted <span className="text-yellow-600 font-medium">yellow</span> after{' '}
                  <span className="font-semibold">{settings.urgencyYellowDays} days</span> and{' '}
                  <span className="text-red-600 font-medium">red</span> after{' '}
                  <span className="font-semibold">{settings.urgencyRedDays} days</span> without resolution.
                </p>
              </div>
            </SectionCard>
          )}

          {/* ── NOTIFICATIONS ─────────────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <SectionCard icon={Bell} title="Notification Preferences" description="Choose which system events trigger in-app notifications">
              <ToggleRow
                label="New Job Created"
                hint="Notify admin when reception creates a new service job"
                checked={settings.notifyOnNewJob}
                onChange={v => set('notifyOnNewJob', v)}
              />
              <Divider />
              <ToggleRow
                label="Job Completed"
                hint="Notify admin when an engineer marks a job as completed"
                checked={settings.notifyOnJobComplete}
                onChange={v => set('notifyOnJobComplete', v)}
              />
              <Divider />
              <ToggleRow
                label="Parts Request Submitted"
                hint="Notify admin when an engineer submits a new parts request"
                checked={settings.notifyOnPartsRequest}
                onChange={v => set('notifyOnPartsRequest', v)}
              />
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2">
                <p className="text-[11px] text-blue-600 leading-relaxed">
                  <span className="font-medium">Note:</span> Engineer-specific notifications (job assigned, status updated)
                  are always sent regardless of these settings. These preferences control admin-level alerts only.
                </p>
              </div>
            </SectionCard>
          )}

          {/* ── SECURITY ──────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <SectionCard icon={Shield} title="Security & Access" description="Session and password policy settings">
              <FieldRow label="Session Timeout" hint="Auto-logout after inactivity (in minutes)">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={settings.sessionTimeoutMinutes}
                    onChange={e => set('sessionTimeoutMinutes', Math.max(5, Math.min(1440, Number(e.target.value))))}
                    className="w-28 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors text-center"
                  />
                  <span className="text-[12px] text-gray-500 font-medium">minutes</span>
                  <span className="text-[11px] text-gray-400">
                    ({settings.sessionTimeoutMinutes >= 60
                      ? `${Math.round(settings.sessionTimeoutMinutes / 60)}h`
                      : `${settings.sessionTimeoutMinutes}m`})
                  </span>
                </div>
              </FieldRow>
              <Divider />
              <ToggleRow
                label="Force Password Change on First Login"
                hint="New accounts must reset their password on first sign-in"
                checked={settings.requirePasswordChange}
                onChange={v => set('requirePasswordChange', v)}
              />
              <Divider />
              {/* Read-only info rows */}
              <div className="space-y-3">
                <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Access Control Summary</p>
                {[
                  { label: 'Admin deactivate accounts',  value: 'Admin only' },
                  { label: 'Financial data visibility',  value: 'Admin & Reception' },
                  { label: 'Job assignment',              value: 'Admin & Reception' },
                  { label: 'Engineer data isolation',    value: 'Assigned jobs only' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-[12px] text-gray-600">{row.label}</span>
                    <span className="text-[12px] font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">{row.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── DISPLAY ───────────────────────────────────────────────── */}
          {activeTab === 'display' && (
            <SectionCard icon={Palette} title="Display Preferences" description="Formatting and appearance options">
              <FieldRow label="Date Format" hint="How dates appear throughout the system">
                <Select
                  value={settings.dateFormat}
                  onChange={v => set('dateFormat', v)}
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY  (31/12/2025)' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY  (12/31/2025)' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD  (2025-12-31)' },
                    { value: 'D MMM YYYY', label: 'D MMM YYYY  (31 Dec 2025)' },
                  ]}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Theme" hint="Interface colour theme">
                <div className="flex gap-3">
                  {([
                    { value: 'light',  label: 'Light',  desc: 'Always light' },
                    { value: 'system', label: 'System', desc: 'Follow OS' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => set('theme', opt.value)}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-[13px] font-medium transition-colors ${
                        settings.theme === opt.value
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <p>{opt.label}</p>
                      <p className="text-[11px] font-normal mt-0.5 opacity-70">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </FieldRow>
              <Divider />
              {/* Preview panel */}
              <div>
                <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</p>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Shop name:</span>
                    <span className="text-[13px] font-medium text-gray-900">{settings.shopName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Currency:</span>
                    <span className="text-[13px] font-medium text-gray-900">
                      {settings.currency === 'INR' ? '₹' : settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : 'د.إ'} {settings.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Date format:</span>
                    <span className="text-[13px] font-medium text-gray-900">{settings.dateFormat}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Yellow after:</span>
                    <span className="text-[13px] font-medium text-yellow-600">{settings.urgencyYellowDays} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Red after:</span>
                    <span className="text-[13px] font-medium text-red-600">{settings.urgencyRedDays} days</span>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── Bottom save bar ─────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[13px] font-medium transition-colors"
            >
              <RotateCcw size={14} />
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                saved ? 'bg-green-500 text-white' : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};