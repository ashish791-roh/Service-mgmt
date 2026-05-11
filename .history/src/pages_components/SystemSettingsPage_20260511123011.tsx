import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Toast, useToast } from '../components/ui';
import {
  Building2, Bell, Shield, Clock, Palette,
  Save, RotateCcw, ChevronRight, Info, Check,
  AlertTriangle, Eye, CreditCard
} from 'lucide-react';

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

type Tab = 'business' | 'jobs' | 'notifications' | 'security' | 'display';

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'business',      label: 'Business Profile',  icon: Building2, desc: 'Contact & location info' },
  { id: 'jobs',          label: 'Service Jobs',      icon: Clock,     desc: 'SLA & urgency settings' },
  { id: 'notifications', label: 'Notifications',     icon: Bell,      desc: 'Admin alert preferences' },
  { id: 'security',      label: 'Access Control',    icon: Shield,    desc: 'Session & security policies' },
  { id: 'display',       label: 'Appearance',        icon: Palette,   desc: 'Theme & formatting' },
];

export const SystemSettingsPage: React.FC = () => {
  const { currentUser } = useApp();
  const { toast, show: showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('business');
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