import React from 'react';
import type { Job, PartRequest, User } from '../../../types';

interface PartsDetailProps {
  jobs: Job[];
  partRequests: PartRequest[];
  users: User[];
}

export const PartsDetail: React.FC<PartsDetailProps> = ({ jobs, partRequests, users }) => {
  const engineers = users.filter((u) => u.role === 'engineer');
  const statuses = ['Pending', 'Approved', 'Rejected'] as const;
  const statusStyle: Record<string, string> = {
    Pending: 'border-orange-400 bg-orange-50 text-orange-700',
    Approved: 'border-green-400 bg-green-50 text-green-700',
    Rejected: 'border-red-400 bg-red-50 text-red-700',
  };
  return (
    <>
      <div className="flex divide-x divide-gray-100 border-b border-gray-100">
        {statuses.map(s => {
          const count = partRequests.filter((r) => r.status === s).length;
          const cls = s === 'Pending' ? 'text-orange-600' : s === 'Approved' ? 'text-green-600' : 'text-red-500';
          return (
            <div key={s} className="flex-1 px-6 py-4 text-center">
              <p className={`text-[20px] font-medium ${cls}`}>{count}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s}</p>
            </div>
          );
        })}
      </div>
      {statuses.map(s => {
        const filtered = partRequests.filter((r) => r.status === s);
        if (filtered.length === 0) return null;
        return (
          <div key={s}>
            <div className="px-6 py-2 bg-gray-50 border-y border-gray-100">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{s}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {filtered.map((r) => {
                const eng = engineers.find((e) => e.id === r.engineerId);
                const job = jobs.find((j) => j.id === r.jobId);
                const style = statusStyle[r.status] || '';
                const borderCls = style.split(' ')[0];
                const badgeCls = style.split(' ').slice(1).join(' ');
                return (
                  <div key={r.id} className={`flex items-start gap-4 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900">{r.partName}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Qty: {r.quantity} · {eng?.name ?? 'Unknown'}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">Reason: {r.reason}</p>
                      {job && <p className="text-[11px] text-teal-600 mt-0.5 truncate">Job: {job.problemDescription}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${badgeCls}`}>{r.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {partRequests.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No part requests yet.</p>}
    </>
  );
};
