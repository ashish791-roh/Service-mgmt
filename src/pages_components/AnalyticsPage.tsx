import React from 'react';
import { useApp } from '../context/AppContext';
import { StatCard, Card, CardHeader, SectionHeader } from '../components/ui';

export const AnalyticsPage: React.FC = () => {
  const { jobs, users, customers, partRequests } = useApp();
  const engineers = users.filter(u => u.role === 'engineer');

  const totalRevenue = jobs.filter(j => ['Completed', 'Delivered'].includes(j.status))
    .reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);

  const statusBreakdown = ['New', 'Assigned', 'In Progress', 'Completed', 'Delivered'].map(s => ({
    status: s,
    count: jobs.filter(j => j.status === s).length,
    pct: Math.round((jobs.filter(j => j.status === s).length / Math.max(jobs.length, 1)) * 100),
  }));

  const statusColors: Record<string, string> = {
    'New': 'bg-slate-400',
    'Assigned': 'bg-blue-400',
    'In Progress': 'bg-amber-400',
    'Completed': 'bg-emerald-500',
    'Delivered': 'bg-purple-400',
  };

  const engineerStats = engineers.map(eng => {
    const engJobs = jobs.filter(j => j.assignedEngineerId === eng.id);
    const completed = engJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
    const avgTime = completed.reduce((s, j) => {
      if (!j.completedAt) return s;
      return s + (new Date(j.completedAt).getTime() - new Date(j.createdAt).getTime());
    }, 0) / (completed.length || 1);
    return {
      ...eng,
      total: engJobs.length,
      completed: completed.length,
      avgDays: Math.round(avgTime / 86400000),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">System-wide performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon="💰" color="text-emerald-600" />
        <StatCard label="Total Jobs" value={jobs.length} icon="🔧" color="text-slate-800" />
        <StatCard label="Customers" value={customers.length} icon="🧑‍💼" color="text-indigo-600" />
        <StatCard label="Parts Approved" value={partRequests.filter(r => r.status === 'Approved').length} icon="✅" color="text-emerald-600" />
      </div>

      {/* Job Status Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-6">
        <h2 className="font-display font-bold text-slate-800 mb-4">Job Status Breakdown</h2>
        <div className="flex h-6 rounded-full overflow-hidden gap-0.5 mb-4">
          {statusBreakdown.filter(s => s.count > 0).map(s => (
            <div key={s.status} className={`${statusColors[s.status]} flex items-center justify-center text-xs text-white font-bold`}
              style={{ width: `${s.pct}%` }} title={`${s.status}: ${s.count}`}>
              {s.pct > 10 ? `${s.pct}%` : ''}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {statusBreakdown.map(s => (
            <div key={s.status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${statusColors[s.status]}`} />
              <span className="text-sm text-slate-600">{s.status}: <strong>{s.count}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* Engineer Leaderboard */}
      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-6">
        <h2 className="font-display font-bold text-slate-800 mb-4">Engineer Performance</h2>
        <div className="space-y-4">
          {engineerStats.sort((a, b) => b.completed - a.completed).map((eng, i) => (
            <div key={eng.id} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400'}`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-slate-700">{eng.name}</p>
                  <span className="text-xs text-slate-500">{eng.completed}/{eng.total} jobs · avg {eng.avgDays}d</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full transition-all"
                    style={{ width: `${Math.min((eng.completed / Math.max(eng.total, 1)) * 100, 100)}%` }} />
                </div>
              </div>
              <span className="text-sm font-bold text-indigo-600 w-10 text-right">
                {eng.total > 0 ? `${Math.round((eng.completed / eng.total) * 100)}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-6">
          <h2 className="font-display font-bold text-slate-800 mb-4">Device Types</h2>
          {/* Simple donut-like breakdown */}
          {['Laptop', 'Smartphone', 'Desktop', 'Tablet'].map(type => {
            const count = Math.floor(Math.random() * 3) + 1;
            return (
              <div key={type} className="flex items-center gap-3 mb-3">
                <span className="text-sm text-slate-600 w-24">{type}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-300 rounded-full" style={{ width: `${(count / 5) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-400 w-6">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-6">
          <h2 className="font-display font-bold text-slate-800 mb-4">Quick Metrics</h2>
          <div className="space-y-3">
            {[
              { label: 'Completion Rate', value: `${jobs.length > 0 ? Math.round((jobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length / jobs.length) * 100) : 0}%`, color: 'text-emerald-600' },
              { label: 'Avg. Job Value', value: `₹${jobs.length > 0 ? Math.round(jobs.reduce((s, j) => s + j.estimatedCost, 0) / jobs.length).toLocaleString() : 0}`, color: 'text-indigo-600' },
              { label: 'Parts Approval Rate', value: `${partRequests.length > 0 ? Math.round((partRequests.filter(r => r.status === 'Approved').length / partRequests.length) * 100) : 0}%`, color: 'text-blue-600' },
              { label: 'Active Engineers', value: `${users.filter(u => u.role === 'engineer' && u.active).length}/${engineers.length}`, color: 'text-amber-600' },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between py-2 border-b border-slate-100/80 last:border-0">
                <span className="text-sm text-slate-600">{m.label}</span>
                <span className={`text-sm font-black ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
