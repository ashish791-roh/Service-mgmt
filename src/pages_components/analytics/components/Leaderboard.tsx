import React from 'react';
import type { Job, User } from '../../../types';

interface LeaderboardProps {
  jobs: Job[];
  users: User[];
}

const statusColors: Record<string, string> = {
  'New': 'border-cyan-400 text-cyan-700 bg-cyan-50',
  'Assigned': 'border-teal-400 text-teal-700 bg-teal-50',
  'In Progress': 'border-orange-400 text-orange-700 bg-orange-50',
  'Completed': 'border-green-400 text-green-700 bg-green-50',
  'Delivered': 'border-green-400 text-green-700 bg-green-50',
};

export const Leaderboard: React.FC<LeaderboardProps> = ({ jobs, users }) => {
  const engineers = users.filter((u) => u.role === 'engineer');

  const engineerStats = engineers.map((eng) => {
    const engJobs = jobs.filter((j) => j.assignedEngineerId === eng.id);
    const completed = engJobs.filter((j) => ['Completed', 'Delivered'].includes(j.status));
    const pending = engJobs.filter((j) => ['Assigned', 'In Progress'].includes(j.status));
    const avgTime = completed.reduce((s, j) => {
      const end = j.completedAt ? new Date(j.completedAt).getTime() : new Date(j.updatedAt).getTime();
      return s + (end - new Date(j.createdAt).getTime());
    }, 0) / (completed.length || 1);
    const revenue = completed.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
    return {
      ...eng,
      total: engJobs.length,
      completed: completed.length,
      pending: pending.length,
      avgDays: completed.length > 0 ? Math.round(avgTime / 86400000) : 0,
      efficiency: engJobs.length > 0 ? Math.round((completed.length / engJobs.length) * 100) : 0,
      revenue,
      recentJobs: engJobs.slice(0, 3),
    };
  }).sort((a, b) => b.completed - a.completed);

  return (
    <div className="divide-y divide-gray-100">
      {engineerStats.map((eng, i) => {
        const medalCls = i === 0 ? 'bg-orange-100 text-orange-600' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-50 text-orange-400' : 'bg-gray-100 text-gray-500';
        return (
          <div key={eng.id} className={`flex flex-col gap-3 px-6 py-5 border-l-4 ${eng.active ? 'border-teal-400' : 'border-gray-200'} hover:bg-gray-50 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium ${medalCls} shrink-0`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-gray-900">{eng.name}</p>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${eng.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {eng.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">{eng.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${eng.efficiency}%` }} />
              </div>
              <span className="text-[11px] font-medium text-gray-700 shrink-0">{eng.efficiency}% efficiency</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 text-[11px] font-medium">{eng.completed} completed</span>
              <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-[11px] font-medium">{eng.pending} pending</span>
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium">{eng.total} total</span>
              {eng.avgDays > 0 && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium">avg {eng.avgDays}d/job</span>}
              {eng.revenue > 0 && <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[11px] font-medium">₹{eng.revenue.toLocaleString()} earned</span>}
            </div>
            {eng.recentJobs.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-gray-100">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Recent jobs</p>
                {eng.recentJobs.map((j) => {
                  const style = statusColors[j.status] || 'border-gray-300 text-gray-700 bg-gray-50';
                  const badgeCls = style.split(' ').slice(1).join(' ');
                  return (
                    <div key={j.id} className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-gray-600 truncate flex-1">{j.problemDescription}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${badgeCls}`}>{j.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {engineerStats.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No engineers registered.</p>}
    </div>
  );
};
