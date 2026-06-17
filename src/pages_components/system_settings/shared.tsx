import React from 'react';
import { ChevronRight } from 'lucide-react';

// ── Local storage key for persisting settings ───────────────────────────────
export const SETTINGS_KEY = 'fixhub_system_settings';

// ── Default settings ────────────────────────────────────────────────────────
export interface SystemSettings {
  shopName: string;
  shopPhone: string;
  shopEmail: string;
  shopAddress: string;
  gstin: string;
  taxRate: number;
  taxLabel: string;
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

export const DEFAULT_SETTINGS: SystemSettings = {
  shopName: 'FixHub Service Center',
  shopPhone: '',
  shopEmail: '',
  shopAddress: '',
  gstin: '29ABCDE1234F1Z5',
  taxRate: 18,
  taxLabel: 'GST',
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
export function loadSettings(): SystemSettings {
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

interface SectionCardProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  description: string;
  children: React.ReactNode;
  animateKey?: string;
}

export const SectionCard = ({ icon: Icon, title, description, children, animateKey }: SectionCardProps) => (
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

export const FieldRow = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
    <div className="sm:w-64 shrink-0 pt-2">
      <label className="text-[14px] font-semibold text-gray-800">{label}</label>
      {hint && <p className="text-[12px] font-medium text-gray-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

interface InputProps {
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export const Input = ({ value, onChange, placeholder, type = 'text', min, max, icon: Icon }: InputProps) => (
  <div className="relative flex items-center">
    {Icon && <Icon size={16} className="absolute left-4 text-gray-400 pointer-events-none" />}
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-gray-55 border border-gray-200 rounded-xl ${Icon ? 'pl-11' : 'px-4'} py-3 text-[14px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition-all duration-200`}
    />
  </div>
);

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export const Select = ({ value, onChange, options, icon: Icon }: SelectProps) => (
  <div className="relative flex items-center">
    {Icon && <Icon size={16} className="absolute left-4 text-gray-400 pointer-events-none z-10" />}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full bg-gray-55 border border-gray-200 rounded-xl ${Icon ? 'pl-11' : 'px-4'} py-3 text-[14px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition-all duration-200 appearance-none`}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronRight size={16} className="absolute right-4 text-gray-400 pointer-events-none rotate-90" />
  </div>
);

interface ToggleRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const ToggleRow = ({ label, hint, checked, onChange }: ToggleRowProps) => (
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

export const Divider = () => <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent my-1" />;
