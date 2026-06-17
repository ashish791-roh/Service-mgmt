import React from 'react';
import { Timer, AlertTriangle, Trash2, Plus, Save, Eye } from 'lucide-react';
import { SectionCard } from './shared';
import type { SLATier } from '../../lib/sla';

interface SLATiersTabProps {
  editTiers: SLATier[];
  slaEdited: boolean;
  handleTierChange: (idx: number, field: keyof SLATier, value: string | number) => void;
  handleAddTier: () => void;
  handleRemoveTier: (idx: number) => void;
  handleSaveTiers: () => Promise<void>;
  handleResetTiers: () => void;
}

export const SLATiersTab: React.FC<SLATiersTabProps> = ({
  editTiers,
  slaEdited,
  handleTierChange,
  handleAddTier,
  handleRemoveTier,
  handleSaveTiers,
  handleResetTiers,
}) => {
  return (
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
        <div className="grid grid-cols-[1fr_100px_100px_100px_40px] gap-3 px-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Device Type</span>
          <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wide text-center">Warning (h)</span>
          <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wide text-center">Critical (h)</span>
          <span className="text-[11px] font-semibold text-teal-600 uppercase tracking-wide text-center">GST (%)</span>
          <span />
        </div>

        {editTiers.map((tier, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_100px_100px_100px_40px] gap-3 items-center">
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
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={tier.taxRate !== undefined ? tier.taxRate : 18}
                onChange={e => handleTierChange(idx, 'taxRate', Math.max(0, Number(e.target.value)))}
                className="w-full bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 text-[14px] font-bold text-teal-900 text-center focus:outline-none focus:ring-2 focus:ring-teal-400/40"
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
  );
};
