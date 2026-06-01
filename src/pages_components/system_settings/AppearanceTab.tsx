import React, { useEffect } from 'react';
import { Palette, Eye } from 'lucide-react';
import { SectionCard, FieldRow, Select, Divider, type SystemSettings } from './shared';

interface AppearanceTabProps {
  settings: SystemSettings;
  set: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

const WrenchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const AppearanceTab: React.FC<AppearanceTabProps> = ({ settings, set }) => {
  // Instant theme preview
  useEffect(() => {
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.theme]);

  return (
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
  );
};
