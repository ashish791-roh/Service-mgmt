import React from 'react';
import type { Job, Customer, User } from '../../../types';

interface RevenueBreakdownProps {
  jobs: Job[];
  customers: Customer[];
  users: User[];
}

export const RevenueBreakdown: React.FC<RevenueBreakdownProps> = ({ jobs, customers, users }) => {
  const engineers = users.filter((u) => u.role === 'engineer');
  const completed = jobs.filter((j) => ['Completed', 'Delivered'].includes(j.status));
  const totalRevenue = completed.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
  const pendingRevenue = jobs
    .filter((j) => ['New', 'Assigned', 'In Progress'].includes(j.status))
    .reduce((s, j) => s + j.estimatedCost, 0);
  const avgTicket = completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0;

  const byEngineer = engineers.map((eng) => {
    const engCompleted = completed.filter((j) => j.assignedEngineerId === eng.id);
    return { name: eng.name, count: engCompleted.length, revenue: engCompleted.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0) };
  }).sort((a, b) => b.revenue - a.revenue);
  const maxRev = byEngineer[0]?.revenue || 1;

  return (
    <>
      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-gray-100 border-b border-gray-100">
        {[
          { label: 'Collected', value: `₹${(totalRevenue / 1000).toFixed(1)}k`, cls: 'text-green-600' },
          { label: 'Pending', value: `₹${(pendingRevenue / 1000).toFixed(1)}k`, cls: 'text-orange-500' },
          { label: 'Avg Ticket', value: `₹${avgTicket.toLocaleString()}`, cls: 'text-teal-600' },
        ].map(s => (
          <div key={s.label} className="px-6 py-4 text-center">
            <p className={`text-[20px] font-medium ${s.cls}`}>{s.value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* By engineer */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Revenue by Engineer</p>
      </div>
      <div className="divide-y divide-gray-100">
        {byEngineer.map((eng) => (
          <div key={eng.name} className="flex items-center gap-4 px-6 py-4">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-[13px] shrink-0">
              {eng.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <p className="text-[12px] font-medium text-gray-900 truncate">{eng.name}</p>
                <p className="text-[12px] font-medium text-gray-700 shrink-0">₹{eng.revenue.toLocaleString()}</p>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.round((eng.revenue / maxRev) * 100)}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{eng.count} job{eng.count !== 1 ? 's' : ''} completed</p>
            </div>
          </div>
        ))}
        {byEngineer.length === 0 && <p className="px-6 py-6 text-[13px] text-gray-400 text-center">No revenue data yet.</p>}
      </div>

      {/* Job list */}
      <div className="px-6 py-3 bg-gray-50 border-t border-b border-gray-100">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">All Billed Jobs</p>
      </div>
      <div className="divide-y divide-gray-100">
        {completed.map((j) => {
          const customer = customers.find((c) => c.id === j.customerId);
          const engineer = engineers.find((e) => e.id === j.assignedEngineerId);
          return (
            <div key={j.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors border-l-4 border-green-400">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-gray-900 truncate">{j.problemDescription}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{customer?.name ?? 'Unknown'} · {engineer?.name ?? 'Unknown'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-medium text-green-700">₹{(j.actualCost ?? j.estimatedCost).toLocaleString()}</p>
                <p className="text-[11px] text-gray-400">{new Date(j.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          );
        })}
        {completed.length === 0 && <p className="px-6 py-6 text-[13px] text-gray-400 text-center">No billed jobs yet.</p>}
      </div>
    </>
  );
};
