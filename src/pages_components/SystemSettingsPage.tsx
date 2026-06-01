import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Toast, useToast } from '../components/ui';
import {
  Building2, Bell, Shield, Clock, Palette, Save, ChevronRight, Info, Check, Timer, ShieldCheck, Webhook
} from 'lucide-react';
import { DEFAULT_SLA_TIERS, type SLATier } from '../lib/sla';
import { loadWarrantyConfig, DEFAULT_WARRANTY_ENTRIES, type WarrantyEntry } from '../lib/warrantyConfig';
import { saveSLATiersToAPI } from '../lib/sla';
import { saveWarrantyConfigToAPI } from '../lib/warrantyConfig';

import {
  loadSettings,
  saveSettings,
  getSettings,
  DEFAULT_SETTINGS,
  type SystemSettings
} from './system_settings/shared';

import { BusinessProfileTab } from './system_settings/BusinessProfileTab';
import { ServiceJobsTab } from './system_settings/ServiceJobsTab';
import { SLATiersTab } from './system_settings/SLATiersTab';
import { WarrantyTab } from './system_settings/WarrantyTab';
import { NotificationsTab } from './system_settings/NotificationsTab';
import { AccessControlTab } from './system_settings/AccessControlTab';
import { AppearanceTab } from './system_settings/AppearanceTab';
import { WebhooksTab } from './system_settings/WebhooksTab';

// Re-export settings helpers so they can be consumed by other parts of the application
export { saveSettings, getSettings };
export type { SystemSettings };

const PageHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-gray-200/60 shadow-sm relative overflow-hidden">
    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
    <div className="relative z-10">
      <h1 className="text-[24px] font-semibold text-gray-900 tracking-tight">{title}</h1>
      <p className="text-[14px] font-medium text-gray-500 mt-1.5">{subtitle}</p>
    </div>
  </div>
);

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
  const handleSaveTiers = async () => {
    const valid = editTiers.every(t => t.deviceType.trim() && t.warningHours > 0 && t.criticalHours > t.warningHours);
    if (!valid) { showToast('Each tier needs a name and criticalHours > warningHours.', 'error'); return; }
    
    try {
      const result = await saveSLATiersToAPI(editTiers);
      if (result.ok) {
        updateSLATiers(editTiers);
        setSlaEdited(false);
        showToast('SLA tiers saved and synced to all devices.', 'success');
      } else {
        showToast(result.error || 'Failed to save SLA tiers.', 'error');
      }
    } catch (error) {
      showToast('Network error while saving SLA tiers.', 'error');
    }
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
  const handleSaveWarranty = async () => {
    const valid = editWarranty.every(e => e.deviceType.trim() && e.days >= 0);
    if (!valid) { showToast('Each warranty entry needs a device type and a non-negative number of days.', 'error'); return; }
    
    try {
      const result = await saveWarrantyConfigToAPI(editWarranty);
      if (result.ok) {
        setWarrantyEdited(false);
        showToast('Warranty durations saved and synced to all devices.', 'success');
      } else {
        showToast(result.error || 'Failed to save warranty config.', 'error');
      }
    } catch (error) {
      showToast('Network error while saving warranty config.', 'error');
    }
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

  // Clean theme previews on unmount
  useEffect(() => {
    return () => {
      window.dispatchEvent(new Event('theme-change'));
    };
  }, []);

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
            <BusinessProfileTab settings={settings} set={set} />
          )}

          {activeTab === 'jobs' && (
            <ServiceJobsTab settings={settings} set={set} />
          )}

          {activeTab === 'sla' && (
            <SLATiersTab
              editTiers={editTiers}
              slaEdited={slaEdited}
              handleTierChange={handleTierChange}
              handleAddTier={handleAddTier}
              handleRemoveTier={handleRemoveTier}
              handleSaveTiers={handleSaveTiers}
              handleResetTiers={handleResetTiers}
            />
          )}

          {activeTab === 'warranty' && (
            <WarrantyTab
              editWarranty={editWarranty}
              warrantyEdited={warrantyEdited}
              handleWarrantyChange={handleWarrantyChange}
              handleAddWarrantyEntry={handleAddWarrantyEntry}
              handleRemoveWarrantyEntry={handleRemoveWarrantyEntry}
              handleSaveWarranty={handleSaveWarranty}
              handleResetWarranty={handleResetWarranty}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsTab settings={settings} set={set} />
          )}

          {activeTab === 'security' && (
            <AccessControlTab settings={settings} set={set} />
          )}

          {activeTab === 'display' && (
            <AppearanceTab settings={settings} set={set} />
          )}

          {activeTab === 'webhooks' && (
            <WebhooksTab />
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