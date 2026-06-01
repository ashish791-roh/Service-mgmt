import React from 'react';
import type { Job, Customer, User } from '../../../types';

interface WorkflowDistributionProps {
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

const statusBarColors: Record<string, string> = {
  'New': 'bg-cyan-200',
  'Assigned': 'bg-teal-400',
  'In Progress': 'bg-orange-400',
  'Completed': 'bg-green-500',
  'Delivered': 'bg-teal-600',
};

export const WorkflowDistribution: React.FC<WorkflowDistributionProps> = ({ jobs, customers, users }) => {
  const engineers = users.filter((u) => u.role === 'engineer');
  const statuses = ['New', 'Assigned', 'In Progress', 'Completed', 'Delivered'];
  const statusBreakdown = statuses.map(s => ({
    status: s,
    count: jobs.filter((j) => j.status === s).length,
    pct: Math.round((jobs.filter((j) => j.status === s).length / Math.max(jobs.length, 1)) * 100),
    jobs: jobs.filter((j) => j.status === s),
  }));

  return (
    <>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex h-4 rounded-full overflow-hidden gap-0.5 bg-gray-100">
          {statusBreakdown.filter(s => s.count > 0).map(s => (
            <div key={s.status} style={{ width: `${s.pct}%` }}
              className={`${statusBarColors[s.status]} flex items-center justify-center`}
              title={`${s.status}: ${s.count}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          {statusBreakdown.map(s => (
            <div key={s.status} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${statusBarColors[s.status]}`} />
              <span className="text-[11px] font-medium text-gray-600">{s.status}: <strong className="text-gray-900">{s.count}</strong> ({s.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
      {statusBreakdown.map(s => {
        if (s.count === 0) return null;
        const style = statusColors[s.status] || 'border-gray-300 text-gray-700 bg-gray-50';
        const borderCls = style.split(' ')[0];
        return (
          <div key={s.status}>
            <div className="px-6 py-2 bg-gray-50 border-y border-gray-100 flex items-center justify-between">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{s.status}</p>
              <span className="text-[11px] font-medium text-gray-700">{s.count} job{s.count !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {s.jobs.map((j) => {
                const customer = customers.find((c) => c.id === j.customerId);
                const engineer = engineers.find((e) => e.id === j.assignedEngineerId);
                const daysOld = Math.floor((Date.now() - new Date(j.createdAt).getTime()) / 86400000);
                return (
                  <div key={j.id} className={`flex items-center gap-4 px-6 py-3 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-gray-900 truncate">{j.problemDescription}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{customer?.name ?? 'Unknown'} · {engineer?.name ?? <span className="text-orange-500">Unassigned</span>}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-medium text-gray-700">₹{j.estimatedCost.toLocaleString()}</p>
                      <p className={`text-[10px] mt-0.5 ${daysOld > 10 ? 'text-red-500 font-medium' : daysOld > 5 ? 'text-yellow-600' : 'text-gray-400'}`}>{daysOld}d</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
};
