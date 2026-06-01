import React from 'react';
import type { Job, PartRequest, User } from '../../../types';

interface KeyMetricsDetailProps {
  jobs: Job[];
  partRequests: PartRequest[];
  users: User[];
}

export const KeyMetricsDetail: React.FC<KeyMetricsDetailProps> = ({ jobs, partRequests, users }) => {
  const engineers = users.filter((u) => u.role === 'engineer');
  const completedJobs = jobs.filter((j) => ['Completed', 'Delivered'].includes(j.status));
  const completionRate = jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0;
  const avgTicket = jobs.length > 0 ? Math.round(jobs.reduce((s, j) => s + j.estimatedCost, 0) / jobs.length) : 0;
  const partsApprovalRate = partRequests.length > 0 ? Math.round((partRequests.filter((r) => r.status === 'Approved').length / partRequests.length) * 100) : 0;
  const activeEngineers = engineers.filter((e) => e.active).length;

  const repairTimes = completedJobs
    .filter((j) => j.completedAt || j.updatedAt)
    .map((j) => {
      const end = j.completedAt ? new Date(j.completedAt).getTime() : new Date(j.updatedAt).getTime();
      return (end - new Date(j.createdAt).getTime()) / 86400000;
    });
  const avgRepairDays = repairTimes.length > 0 ? Math.round(repairTimes.reduce((a, b) => a + b, 0) / repairTimes.length) : 0;

  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const month = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    const count = jobs.filter((j) => {
      const jd = new Date(j.createdAt);
      return jd.getFullYear() === d.getFullYear() && jd.getMonth() === d.getMonth();
    }).length;
    return { month, count };
  });
  const maxMonthly = Math.max(...monthly.map(m => m.count), 1);

  return (
    <>
      <div className="divide-y divide-gray-100 border-b border-gray-100">
        {[
          { label: 'Completion Rate', value: `${completionRate}%`, sub: `${completedJobs.length} of ${jobs.length} jobs resolved`, barPct: completionRate, barColor: 'bg-green-500' },
          { label: 'Avg. Ticket Size', value: `₹${avgTicket.toLocaleString()}`, sub: `Across all ${jobs.length} jobs`, barPct: Math.min(Math.round((avgTicket / 10000) * 100), 100), barColor: 'bg-teal-500' },
          { label: 'Parts Approval Rate', value: `${partsApprovalRate}%`, sub: `${partRequests.filter((r) => r.status === 'Approved').length} of ${partRequests.length} requests`, barPct: partsApprovalRate, barColor: 'bg-cyan-500' },
          { label: 'Active Engineers', value: `${activeEngineers}/${engineers.length}`, sub: `${engineers.length - activeEngineers} inactive`, barPct: engineers.length > 0 ? Math.round((activeEngineers / engineers.length) * 100) : 0, barColor: 'bg-orange-400' },
          { label: 'Avg. Repair Time', value: `${avgRepairDays} day${avgRepairDays !== 1 ? 's' : ''}`, sub: `Based on ${completedJobs.length} completed jobs`, barPct: Math.min(avgRepairDays * 10, 100), barColor: 'bg-blue-400' },
        ].map(m => (
          <div key={m.label} className="px-6 py-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-gray-500">{m.label}</span>
              <span className="text-[15px] font-medium text-gray-900">{m.value}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
              <div className={`h-full ${m.barColor} rounded-full`} style={{ width: `${m.barPct}%` }} />
            </div>
            <p className="text-[11px] text-gray-400">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="px-6 py-4">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-4">Jobs — Last 6 Months</p>
        <div className="flex items-end gap-2 h-28">
          {monthly.map(m => {
            const h = Math.round((m.count / maxMonthly) * 100);
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-medium text-gray-700">{m.count > 0 ? m.count : ''}</span>
                <div className="w-full rounded-t-sm bg-teal-500 transition-all" style={{ height: `${Math.max(h, m.count > 0 ? 8 : 2)}%` }} />
                <span className="text-[10px] text-gray-400">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
