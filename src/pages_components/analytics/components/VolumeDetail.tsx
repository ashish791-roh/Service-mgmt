import React from 'react';
import type { Job, Customer, User } from '../../../types';

interface VolumeDetailProps {
  jobs: Job[];
  customers: Customer[];
  users: User[];
}

const statusColors: Record<string, string> = {
  'New': 'border-cyan-400 text-cyan-700 bg-cyan-50',
  'Assigned': 'border-teal-400 text-teal-700 bg-teal-50',
  'In Progress': 'border-orange-400 text-orange-700 bg-orange-50',
  'Completed': 'border-green-400 text-green-700 bg-green-50',
  'Delivered': 'border-green-400 text-green-700 bg-green-50',
};

export const VolumeDetail: React.FC<VolumeDetailProps> = ({ jobs, customers, users }) => {
  const engineers = users.filter((u) => u.role === 'engineer');
  const statuses = ['New', 'Assigned', 'In Progress', 'Completed', 'Delivered'];

  return (
    <>
      <div className="flex divide-x divide-gray-100 border-b border-gray-100 flex-wrap">
        {statuses.map(s => {
          const count = jobs.filter((j) => j.status === s).length;
          return (
            <div key={s} className="flex-1 min-w-[80px] px-4 py-4 text-center">
              <p className="text-[18px] font-medium text-gray-900">{count}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{s}</p>
            </div>
          );
        })}
      </div>
      <div className="divide-y divide-gray-100">
        {jobs.map((j) => {
          const customer = customers.find((c) => c.id === j.customerId);
          const engineer = engineers.find((e) => e.id === j.assignedEngineerId);
          const style = statusColors[j.status] || 'border-gray-300 text-gray-700 bg-gray-50';
          const borderCls = style.split(' ')[0];
          const badgeCls = style.split(' ').slice(1).join(' ');
          const daysOld = Math.floor((Date.now() - new Date(j.createdAt).getTime()) / 86400000);
          return (
            <div key={j.id} className={`flex flex-col gap-1.5 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium text-gray-900 truncate flex-1">{j.problemDescription}</p>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${badgeCls}`}>{j.status}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                <span>{customer?.name ?? 'Unknown'}</span>
                <span>·</span>
                <span>{engineer?.name ?? <span className="text-orange-500">Unassigned</span>}</span>
                <span>·</span>
                <span className={daysOld > 10 ? 'text-red-500 font-medium' : daysOld > 5 ? 'text-yellow-600' : 'text-gray-500'}>{daysOld}d ago</span>
                <span>·</span>
                <span className="font-medium text-gray-700">₹{j.estimatedCost.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No jobs yet.</p>}
      </div>
    </>
  );
};
