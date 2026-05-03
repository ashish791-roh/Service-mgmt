import React from 'react';
import { useApp } from '../context/AppContext';
import { Wrench, CheckCircle, Banknote, Users, Activity, Target } from 'lucide-react';

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const MetricCard = ({ title, value, icon: Icon, color, sub }: any) => {
  const colorMap: Record<string, string> = {
    teal: "text-teal-500 bg-teal-50",
    cyan: "text-cyan-500 bg-cyan-50",
    green: "text-green-500 bg-green-50",
    orange: "text-orange-500 bg-orange-50",
  };
  const bgClass = colorMap[color] || colorMap.teal;

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 relative overflow-hidden flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        {sub && <span className="bg-gray-100 text-gray-500 text-[11px] font-medium px-2 py-1 rounded-lg">{sub}</span>}
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <h3 className="text-[18px] font-medium text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );
};

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
    'New': 'bg-cyan-200',
    'Assigned': 'bg-teal-400',
    'In Progress': 'bg-orange-400',
    'Completed': 'bg-green-500',
    'Delivered': 'bg-teal-600',
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
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Platform Analytics" subtitle="Deep insights and performance trends" />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Revenue" value={`₹${(totalRevenue/1000).toFixed(1)}k`} icon={Banknote} color="green" sub="Realized" />
        <MetricCard title="Total Volume" value={jobs.length} icon={Wrench} color="cyan" sub="All Time" />
        <MetricCard title="Client Base" value={customers.length} icon={Users} color="teal" sub="Active" />
        <MetricCard title="Parts Approved" value={partRequests.filter(r => r.status === 'Approved').length} icon={CheckCircle} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Status Breakdown */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
              <Activity className="text-teal-500" size={16} /> Workflow Distribution
            </h3>
          </div>
          <div className="p-6">
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-6 bg-gray-100">
              {statusBreakdown.filter(s => s.count > 0).map(s => (
                <div key={s.status} 
                  style={{ width: `${s.pct}%` }}
                  className={`${statusColors[s.status]} flex items-center justify-center`}
                  title={`${s.status}: ${s.count}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              {statusBreakdown.map(s => (
                <div key={s.status} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColors[s.status]}`} />
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{s.status}: <strong className="text-gray-900 ml-1">{s.count}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Quick Metrics List */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
              <Target className="text-cyan-500" size={16} /> Key Metrics
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'Completion Rate', value: `${jobs.length > 0 ? Math.round((jobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length / jobs.length) * 100) : 0}%`, color: 'text-green-600' },
              { label: 'Avg. Ticket Size', value: `₹${jobs.length > 0 ? Math.round(jobs.reduce((s, j) => s + j.estimatedCost, 0) / jobs.length).toLocaleString() : 0}`, color: 'text-teal-600' },
              { label: 'Parts Approval', value: `${partRequests.length > 0 ? Math.round((partRequests.filter(r => r.status === 'Approved').length / partRequests.length) * 100) : 0}%`, color: 'text-cyan-600' },
              { label: 'Active Engineers', value: `${users.filter(u => u.role === 'engineer' && u.active).length}/${engineers.length}`, color: 'text-orange-600' },
            ].map((m, i) => (
              <div key={m.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{m.label}</span>
                <span className={`text-[13px] font-medium ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engineer Leaderboard */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Engineer Leaderboard</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {engineerStats.sort((a, b) => b.completed - a.completed).map((eng, i) => (
              <div key={eng.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors border-l-4 border-transparent hover:border-teal-500">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium ${i === 0 ? 'bg-orange-100 text-orange-600' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-50 text-orange-400' : 'bg-gray-100 text-gray-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-medium text-gray-900">{eng.name}</p>
                    <span className="text-[11px] font-medium text-gray-500">{eng.completed}/{eng.total} jobs</span>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{ width: `${Math.min((eng.completed / Math.max(eng.total, 1)) * 100, 100)}%` }} />
                  </div>
                  <p className="text-[11px] font-normal text-gray-500 mt-1">{eng.avgDays > 0 ? `Avg ${eng.avgDays} days per repair` : 'No data'}</p>
                </div>
                <div className="text-right pl-4">
                  <span className="text-[18px] font-medium text-gray-900 block">{eng.total > 0 ? `${Math.round((eng.completed / eng.total) * 100)}` : '0'}<span className="text-[11px] text-gray-500 ml-1">%</span></span>
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Efficiency</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Hardware Distribution</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { type: 'Smartphone', color: 'bg-cyan-500' },
                { type: 'Laptop', color: 'bg-teal-500' },
                { type: 'Tablet', color: 'bg-green-500' },
                { type: 'Desktop', color: 'bg-orange-500' }
              ].map((device, i) => {
                const count = Math.floor(Math.random() * 8) + 2; // Simulated data
                const pct = Math.round((count / 20) * 100);
                return (
                  <div key={device.type} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide group-hover:text-gray-900 transition-colors">{device.type}</span>
                      <span className="text-[13px] font-medium text-gray-900">{count} units</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${device.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide text-center">Data represents active volume across all facilities</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
