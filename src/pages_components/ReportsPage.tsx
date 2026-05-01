import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';

// Simple print/export simulation for prototype
const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ── Icons ────────────────────────────────────────────────────────
const Icons = {
  Wrench: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  CheckCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Banknote: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  Hourglass: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>,
  Download: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  User: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Box: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
};

// ── Interactive UI Components ────────────────────────────────────
const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
  >
    <div>
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight leading-tight">{title}</h1>
      <p className="text-sm font-bold text-violet-500 uppercase tracking-widest mt-2">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </motion.div>
);

const AnimatedCard = ({ children, delay = 0, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className={`bg-white rounded-[2rem] border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)] hover:border-violet-100 transition-all duration-300 overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);

const InteractiveStatCard = ({ title, value, icon, gradient, delay, sub }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    whileHover={{ scale: 1.02 }}
    className="relative bg-white rounded-3xl p-5 border border-slate-100 shadow-sm overflow-hidden group cursor-pointer"
  >
    <div className={`absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl group-hover:scale-150 group-hover:opacity-20 transition-all duration-500`} />
    
    <div className="flex justify-between items-start mb-4 relative z-10">
      <motion.div 
        whileHover={{ rotate: 10, scale: 1.1 }}
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}
      >
        {Icons[icon as keyof typeof Icons]}
      </motion.div>
      {sub && <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">{sub}</span>}
    </div>
    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <div className="flex items-end gap-3 relative z-10">
      <h3 className="text-4xl lg:text-4xl font-black text-slate-900 tracking-tighter leading-none">{value}</h3>
    </div>
  </motion.div>
);

const GlowButton = ({ icon, text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: any = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_8px_16px_rgba(0,0,0,0.15)]",
    vivid: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_12px_25px_rgba(139,92,246,0.4)]",
    success: "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)]",
  };
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      onClick={onClick} 
      className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all ${styles[variant]} ${className}`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {text}
    </motion.button>
  );
};

export const ReportsPage: React.FC = () => {
  const { jobs, customers, users, devices, inventory } = useApp();
  const [dateFrom, setDateFrom] = useState('2026-04-01');
  const [dateTo, setDateTo] = useState('2026-04-30');
  const [activeTab, setActiveTab] = useState<'jobs' | 'engineers' | 'inventory' | 'revenue'>('jobs');

  const engineers = users.filter(u => u.role === 'engineer');

  // Filtered jobs by date range
  const filteredJobs = jobs.filter(j => {
    const d = new Date(j.createdAt);
    return d >= new Date(dateFrom) && d <= new Date(dateTo + 'T23:59:59');
  });

  // Revenue metrics
  const completedJobs = filteredJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
  const totalRevenue = completedJobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
  const pendingRevenue = filteredJobs
    .filter(j => !['Completed', 'Delivered'].includes(j.status))
    .reduce((s, j) => s + j.estimatedCost, 0);

  // Engineer performance
  const engineerStats = engineers.map(eng => {
    const engJobs = filteredJobs.filter(j => j.assignedEngineerId === eng.id);
    const completed = engJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
    const avgMs = completed.reduce((s, j) => {
      if (!j.completedAt) return s;
      return s + (new Date(j.completedAt).getTime() - new Date(j.createdAt).getTime());
    }, 0) / (completed.length || 1);
    return {
      name: eng.name,
      total: engJobs.length,
      completed: completed.length,
      pending: engJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status)).length,
      avgDays: Math.round(avgMs / 86400000),
      efficiency: engJobs.length > 0 ? Math.round((completed.length / engJobs.length) * 100) : 0,
    };
  });

  const statusBreakdown: Record<string, number> = {};
  filteredJobs.forEach(j => { statusBreakdown[j.status] = (statusBreakdown[j.status] ?? 0) + 1; });

  const statusColors: Record<string, string> = {
    New: 'bg-slate-300', Assigned: 'bg-blue-400',
    'In Progress': 'bg-amber-400', Completed: 'bg-emerald-500', Delivered: 'bg-violet-500',
  };

  const handleExportJobs = () => {
    const data = filteredJobs.map(j => {
      const customer = customers.find(c => c.id === j.customerId);
      const device = devices.find(d => d.id === j.deviceId);
      const engineer = users.find(u => u.id === j.assignedEngineerId);
      return {
        'Job ID': j.id,
        'Customer': customer?.name ?? '',
        'Phone': customer?.phone ?? '',
        'Device': `${device?.brand} ${device?.model}`,
        'Problem': j.problemDescription,
        'Engineer': engineer?.name ?? 'Unassigned',
        'Status': j.status,
        'Estimated Cost': j.estimatedCost,
        'Actual Cost': j.actualCost ?? '',
        'Created': new Date(j.createdAt).toLocaleDateString('en-IN'),
      };
    });
    exportToCSV(data as Record<string, unknown>[], `jobs_report_${dateFrom}_${dateTo}.csv`);
  };

  const handleExportEngineers = () => {
    exportToCSV(engineerStats as unknown as Record<string, unknown>[], `engineer_report_${dateFrom}_${dateTo}.csv`);
  };

  const handleExportInventory = () => {
    const data = inventory.map(i => ({
      'Item': i.name, 'Category': i.category, 'Stock': i.quantity,
      'Min Stock': i.minStock, 'Unit Cost': i.unitCost,
      'Total Value': i.quantity * i.unitCost,
      'Status': i.quantity <= i.minStock ? 'Low Stock' : 'OK',
    }));
    exportToCSV(data as Record<string, unknown>[], `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const tabs = [
    { id: 'jobs' as const, label: 'Jobs Report', icon: Icons.Wrench },
    { id: 'engineers' as const, label: 'Engineer Performance', icon: Icons.User },
    { id: 'inventory' as const, label: 'Inventory', icon: Icons.Box },
    { id: 'revenue' as const, label: 'Revenue', icon: Icons.Banknote },
  ];

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Business Intelligence" subtitle="Export and analyze performance data" />

      {/* Date Filter */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-32 -top-32 w-64 h-64 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Reporting Period</h3>
          <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mt-1">Select date range</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto relative z-10">
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-full sm:w-auto">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-3">From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 shadow-sm" />
          </div>
          <span className="text-slate-300 font-black hidden sm:block">→</span>
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-full sm:w-auto">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-3">To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 shadow-sm" />
          </div>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InteractiveStatCard title="Total Jobs" value={filteredJobs.length} icon="Wrench" gradient="from-blue-600 to-cyan-400" delay={0.1} sub="In period" />
        <InteractiveStatCard title="Completed" value={completedJobs.length} icon="CheckCircle" gradient="from-emerald-500 to-teal-400" delay={0.2} sub="Successfully" />
        <InteractiveStatCard title="Collected" value={`₹${(totalRevenue/1000).toFixed(1)}k`} icon="Banknote" gradient="from-violet-600 to-fuchsia-500" delay={0.3} />
        <InteractiveStatCard title="Pending" value={`₹${(pendingRevenue/1000).toFixed(1)}k`} icon="Hourglass" gradient="from-amber-400 to-orange-500" delay={0.4} />
      </div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex bg-white p-2 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}>
            <span className={`text-lg ${activeTab === tab.id ? 'opacity-100' : 'opacity-50'}`}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Jobs Report Tab */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTab === 'jobs' && (
            <AnimatedCard>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-8 py-6 border-b border-slate-100/80 bg-slate-50/50 gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Jobs Pipeline ({filteredJobs.length})</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status breakdown</p>
                </div>
                <GlowButton icon={Icons.Download} text="Export Data" variant="vivid" onClick={handleExportJobs} className="!py-2.5 w-full sm:w-auto" />
              </div>

              {/* Status breakdown bar */}
              {filteredJobs.length > 0 && (
                <div className="px-8 py-6 border-b border-slate-100/80">
                  <div className="flex h-3 rounded-full overflow-hidden gap-1 mb-4 shadow-inner bg-slate-100">
                    {Object.entries(statusBreakdown).map(([status, count]) => (
                      <div key={status}
                        className={`${statusColors[status] ?? 'bg-slate-300'} transition-all`}
                        style={{ width: `${(count / filteredJobs.length) * 100}%` }}
                        title={`${status}: ${count}`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-5">
                    {Object.entries(statusBreakdown).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusColors[status] ?? 'bg-slate-300'} shadow-sm`} />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{status}: <strong className="text-slate-900 ml-1">{count}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100/80">
                      {['ID', 'Client', 'Device', 'Assigned', 'Status', 'Cost', 'Date'].map(h => (
                        <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {filteredJobs.map(job => {
                      const customer = customers.find(c => c.id === job.customerId);
                      const device = devices.find(d => d.id === job.deviceId);
                      const engineer = users.find(u => u.id === job.assignedEngineerId);
                      return (
                        <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                          <td className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">#{job.id}</td>
                          <td className="px-8 py-5">
                            <p className="text-sm font-black text-slate-900 group-hover:text-violet-600 transition-colors">{customer?.name}</p>
                          </td>
                          <td className="px-8 py-5 text-sm font-bold text-slate-500">{device?.brand}</td>
                          <td className="px-8 py-5 text-sm font-semibold text-slate-600">{engineer?.name ?? <span className="text-rose-400 italic">Unassigned</span>}</td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider">{job.status}</span>
                          </td>
                          <td className="px-8 py-5 text-base font-black text-slate-900">₹{job.estimatedCost.toLocaleString()}</td>
                          <td className="px-8 py-5 text-xs font-bold text-slate-400">{new Date(job.createdAt).toLocaleDateString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredJobs.length === 0 && (
                  <div className="p-16 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">{Icons.Wrench}</div>
                    <p className="text-xl font-black text-slate-900 mb-1">No jobs found</p>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Adjust the date range above</p>
                  </div>
                )}
              </div>
            </AnimatedCard>
          )}

          {activeTab === 'engineers' && (
            <AnimatedCard>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-8 py-6 border-b border-slate-100/80 bg-slate-50/50 gap-4">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Performance Matrix</h2>
                <GlowButton icon={Icons.Download} text="Export Data" variant="vivid" onClick={handleExportEngineers} className="!py-2.5 w-full sm:w-auto" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100/80">
                      {['Engineer', 'Load', 'Completed', 'Pending', 'Turnaround', 'Efficiency Score'].map(h => (
                        <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {engineerStats.sort((a, b) => b.efficiency - a.efficiency).map(eng => (
                      <tr key={eng.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-sm">
                              {eng.name.charAt(0)}
                            </div>
                            <span className="text-base font-black text-slate-900">{eng.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xl font-black text-slate-900">{eng.total}</td>
                        <td className="px-8 py-6 text-xl font-black text-emerald-500">{eng.completed}</td>
                        <td className="px-8 py-6 text-xl font-black text-amber-500">{eng.pending}</td>
                        <td className="px-8 py-6 text-sm font-bold text-slate-500">{eng.avgDays > 0 ? `${eng.avgDays} days` : '—'}</td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <div className={`h-full rounded-full transition-all ${eng.efficiency > 80 ? 'bg-emerald-500' : eng.efficiency > 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${eng.efficiency}%` }} />
                            </div>
                            <span className="text-sm font-black text-slate-900 w-12 text-right">{eng.efficiency}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedCard>
          )}

          {activeTab === 'inventory' && (
            <AnimatedCard>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-8 py-6 border-b border-slate-100/80 bg-slate-50/50 gap-4">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Inventory Valuation</h2>
                <GlowButton icon={Icons.Download} text="Export Data" variant="vivid" onClick={handleExportInventory} className="!py-2.5 w-full sm:w-auto" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100/80">
                      {['Part Name', 'Category', 'Quantity', 'Status', 'Unit Cost', 'Asset Value'].map(h => (
                        <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {inventory.map(item => {
                      const isLow = item.quantity <= item.minStock;
                      return (
                        <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${isLow ? 'bg-rose-50/30' : ''}`}>
                          <td className="px-8 py-6 font-black text-base text-slate-900 group-hover:text-violet-600 transition-colors">{item.name}</td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider">{item.category}</span>
                          </td>
                          <td className={`px-8 py-6 text-2xl font-black tracking-tighter ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantity}</td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${isLow ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                              {isLow ? 'Critical' : 'Healthy'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-sm font-bold text-slate-500">₹{item.unitCost.toLocaleString()}</td>
                          <td className="px-8 py-6 text-lg font-black text-slate-900 tracking-tighter">₹{(item.quantity * item.unitCost).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </AnimatedCard>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <AnimatedCard className="bg-gradient-to-br from-emerald-500 to-teal-400 text-white p-8">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    {Icons.Banknote}
                  </div>
                  <p className="text-xs font-black text-emerald-100 uppercase tracking-widest mb-1">Total Realized</p>
                  <p className="text-4xl font-black tracking-tighter mb-2">₹{totalRevenue.toLocaleString()}</p>
                  <p className="text-sm font-bold text-emerald-100 bg-white/10 w-fit px-3 py-1.5 rounded-lg">{completedJobs.length} completed transactions</p>
                </AnimatedCard>
                <AnimatedCard className="bg-gradient-to-br from-amber-400 to-orange-500 text-white p-8">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    {Icons.Hourglass}
                  </div>
                  <p className="text-xs font-black text-amber-100 uppercase tracking-widest mb-1">Awaiting Collection</p>
                  <p className="text-4xl font-black tracking-tighter mb-2">₹{pendingRevenue.toLocaleString()}</p>
                  <p className="text-sm font-bold text-amber-100 bg-white/10 w-fit px-3 py-1.5 rounded-lg">{filteredJobs.length - completedJobs.length} active invoices</p>
                </AnimatedCard>
                <AnimatedCard className="p-8">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                    {Icons.CheckCircle}
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Avg Ticket Size</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter mb-2">
                    ₹{completedJobs.length > 0 ? Math.round(totalRevenue / completedJobs.length).toLocaleString() : 0}
                  </p>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-3">Per transaction</p>
                </AnimatedCard>
              </div>

              <AnimatedCard>
                <div className="px-8 py-6 border-b border-slate-100/80 bg-slate-50/50">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Revenue Breakdown by Engineer</h2>
                </div>
                <div className="divide-y divide-slate-100/80">
                  {engineers.map(eng => {
                    const engCompleted = completedJobs.filter(j => j.assignedEngineerId === eng.id);
                    const engRevenue = engCompleted.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
                    const pct = totalRevenue > 0 ? Math.round((engRevenue / totalRevenue) * 100) : 0;
                    return (
                      <div key={eng.id} className="flex flex-col sm:flex-row sm:items-center gap-6 px-8 py-6 group hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4 w-64">
                          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-lg font-black text-violet-600 shadow-sm">
                            {eng.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-900">{eng.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{engCompleted.length} transactions</p>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center gap-5">
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-right w-32">
                            <span className="text-xl font-black text-slate-900 tracking-tighter block">₹{engRevenue.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pct}% of total</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AnimatedCard>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};