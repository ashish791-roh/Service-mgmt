import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { SectionCard, FieldRow, Select, type SystemSettings } from './shared';

interface ServiceJobsTabProps {
  settings: SystemSettings;
  set: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

export const ServiceJobsTab: React.FC<ServiceJobsTabProps> = ({ settings, set }) => {
  return (
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
  );
};
