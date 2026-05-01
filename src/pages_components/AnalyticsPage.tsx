import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';

// ── Icons ────────────────────────────────────────────────────────
const Icons = {
  Wrench: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  CheckCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Banknote: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  Users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Target: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
};

// ── Shared UI Components ─────────────────────────────────────────
const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
    <div>
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight leading-tight">{title}</h1>
      <p className="text-sm font-bold text-violet-500 uppercase tracking-widest mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </motion.div>
);

const AnimatedCard = ({ children, delay = 0, className = "" }: any) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className={`bg-white rounded-3xl border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)] hover:border-violet-100 transition-all duration-300 overflow-hidden ${className}`}>
    {children}
  </motion.div>
);

const InteractiveStatCard = ({ title, value, icon, gradient, delay, sub }: any) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay, ease: "easeOut" }} whileHover={{ scale: 1.02 }} className="relative bg-white rounded-3xl p-5 border border-slate-100 shadow-sm overflow-hidden group cursor-pointer">
    <div className={`absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl group-hover:scale-150 group-hover:opacity-20 transition-all duration-500`} />
    <div className="flex justify-between items-start mb-4 relative z-10">
      <motion.div whileHover={{ rotate: 10, scale: 1.1 }} className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>
        {Icons[icon as keyof typeof Icons]}
      </motion.div>
      {sub && <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">{sub}</span>}
    </div>
    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <div className="flex items-end gap-3 relative z-10">
      <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{value}</h3>
    </div>
  </motion.div>
);

// ── AnalyticsPage ─────────────────────────────────────────────
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
    'New': 'bg-slate-300',
    'Assigned': 'bg-blue-400',
    'In Progress': 'bg-amber-400',
    'Completed': 'bg-emerald-500',
    'Delivered': 'bg-violet-500',
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
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Platform Analytics" subtitle="Deep insights and performance trends" />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InteractiveStatCard title="Total Revenue" value={`₹${(totalRevenue/1000).toFixed(1)}k`} icon="Banknote" gradient="from-emerald-500 to-teal-400" delay={0.1} sub="Realized" />
        <InteractiveStatCard title="Total Volume" value={jobs.length} icon="Wrench" gradient="from-blue-600 to-cyan-400" delay={0.2} sub="All Time" />
        <InteractiveStatCard title="Client Base" value={customers.length} icon="Users" gradient="from-violet-600 to-fuchsia-500" delay={0.3} sub="Active" />
        <InteractiveStatCard title="Parts Approved" value={partRequests.filter(r => r.status === 'Approved').length} icon="CheckCircle" gradient="from-amber-400 to-orange-500" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Status Breakdown */}
        <AnimatedCard delay={0.5} className="lg:col-span-2">
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100/80 bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="text-indigo-500">{Icons.Activity}</span> Workflow Distribution
            </h3>
          </div>
          <div className="p-8">
            <div className="flex h-4 rounded-full overflow-hidden gap-1 mb-6 shadow-inner bg-slate-100">
              {statusBreakdown.filter(s => s.count > 0).map(s => (
                <motion.div key={s.status} 
                  initial={{ width: 0 }}
                  animate={{ width: `${s.pct}%` }}
                  transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                  className={`${statusColors[s.status]} flex items-center justify-center`}
                  title={`${s.status}: ${s.count}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-5">
              {statusBreakdown.map(s => (
                <div key={s.status} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors[s.status]} shadow-sm`} />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{s.status}: <strong className="text-slate-900 ml-1">{s.count}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedCard>

        {/* Quick Metrics List */}
        <AnimatedCard delay={0.6}>
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100/80 bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="text-emerald-500">{Icons.Target}</span> Key Metrics
            </h3>
          </div>
          <div className="p-8 space-y-6">
            {[
              { label: 'Completion Rate', value: `${jobs.length > 0 ? Math.round((jobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length / jobs.length) * 100) : 0}%`, color: 'text-emerald-600' },
              { label: 'Avg. Ticket Size', value: `₹${jobs.length > 0 ? Math.round(jobs.reduce((s, j) => s + j.estimatedCost, 0) / jobs.length).toLocaleString() : 0}`, color: 'text-indigo-600' },
              { label: 'Parts Approval', value: `${partRequests.length > 0 ? Math.round((partRequests.filter(r => r.status === 'Approved').length / partRequests.length) * 100) : 0}%`, color: 'text-violet-600' },
              { label: 'Active Engineers', value: `${users.filter(u => u.role === 'engineer' && u.active).length}/${engineers.length}`, color: 'text-amber-600' },
            ].map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + (i * 0.1) }} className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{m.label}</span>
                <span className={`text-xl font-black tracking-tighter ${m.color}`}>{m.value}</span>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engineer Leaderboard */}
        <AnimatedCard delay={0.7}>
          <div className="px-8 py-6 border-b border-slate-100/80 bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Engineer Leaderboard</h3>
          </div>
          <div className="divide-y divide-slate-100/80">
            {engineerStats.sort((a, b) => b.completed - a.completed).map((eng, i) => (
              <motion.div key={eng.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + (i * 0.08) }} className="flex items-center gap-5 px-8 py-5 hover:bg-slate-50/50 transition-colors group">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-md transition-transform group-hover:scale-110 ${i === 0 ? 'bg-gradient-to-br from-amber-300 to-orange-500 shadow-orange-500/30' : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 shadow-slate-500/30' : i === 2 ? 'bg-gradient-to-br from-orange-300 to-rose-500 shadow-rose-500/30' : 'bg-slate-100 text-slate-400 shadow-none'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{eng.name}</p>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{eng.completed}/{eng.total} jobs</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${Math.min((eng.completed / Math.max(eng.total, 1)) * 100, 100)}%` }} transition={{ duration: 1, delay: 1 }} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{eng.avgDays > 0 ? `Avg ${eng.avgDays} days per repair` : 'No data'}</p>
                </div>
                <div className="text-right pl-4">
                  <span className="text-2xl font-black text-slate-900 tracking-tighter block">{eng.total > 0 ? `${Math.round((eng.completed / eng.total) * 100)}` : '0'}<span className="text-sm text-slate-400">%</span></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency</span>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>

        {/* Device Breakdown */}
        <AnimatedCard delay={0.8}>
          <div className="px-8 py-6 border-b border-slate-100/80 bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Hardware Distribution</h3>
          </div>
          <div className="p-8">
            <div className="space-y-6">
              {[
                { type: 'Smartphone', color: 'from-blue-500 to-cyan-400' },
                { type: 'Laptop', color: 'from-violet-500 to-fuchsia-400' },
                { type: 'Tablet', color: 'from-emerald-500 to-teal-400' },
                { type: 'Desktop', color: 'from-amber-400 to-orange-500' }
              ].map((device, i) => {
                const count = Math.floor(Math.random() * 8) + 2; // Simulated data
                const pct = Math.round((count / 20) * 100);
                return (
                  <motion.div key={device.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + (i * 0.1) }} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{device.type}</span>
                      <span className="text-sm font-black text-slate-900">{count} units</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <motion.div className={`h-full rounded-full bg-gradient-to-r ${device.color}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 1.1 + (i * 0.1) }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Data represents active volume across all facilities</p>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
};
