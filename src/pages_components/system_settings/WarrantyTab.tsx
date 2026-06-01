import React from 'react';
import { ShieldCheck, Trash2, Plus, Save, Eye } from 'lucide-react';
import { SectionCard } from './shared';
import type { WarrantyEntry } from '../../lib/warrantyConfig';

interface WarrantyTabProps {
  editWarranty: WarrantyEntry[];
  warrantyEdited: boolean;
  handleWarrantyChange: (idx: number, field: keyof WarrantyEntry, value: string | number) => void;
  handleAddWarrantyEntry: () => void;
  handleRemoveWarrantyEntry: (idx: number) => void;
  handleSaveWarranty: () => Promise<void>;
  handleResetWarranty: () => void;
}

export const WarrantyTab: React.FC<WarrantyTabProps> = ({
  editWarranty,
  warrantyEdited,
  handleWarrantyChange,
  handleAddWarrantyEntry,
  handleRemoveWarrantyEntry,
  handleSaveWarranty,
  handleResetWarranty,
}) => {
  return (
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
  );
};
