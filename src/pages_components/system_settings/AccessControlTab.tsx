import React from 'react';
import { Shield } from 'lucide-react';
import { SectionCard, FieldRow, ToggleRow, Divider, type SystemSettings } from './shared';

interface AccessControlTabProps {
  settings: SystemSettings;
  set: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

export const AccessControlTab: React.FC<AccessControlTabProps> = ({ settings, set }) => {
  return (
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
  );
};
