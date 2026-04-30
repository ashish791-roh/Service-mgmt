import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/ui';
import type { JobStatus } from '../types';

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

export const ReportsPage: React.FC = () => {
  const { jobs, customers, users, devices, partRequests, inventory } = useApp();
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
    New: 'bg-slate-400', Assigned: 'bg-blue-400',
    'In Progress': 'bg-amber-400', Completed: 'bg-emerald-500', Delivered: 'bg-purple-400',
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
    { id: 'jobs' as const, label: 'Jobs Report', icon: '🔧' },
    { id: 'engineers' as const, label: 'Engineer Performance', icon: '👨‍🔧' },
    { id: 'inventory' as const, label: 'Inventory', icon: '📦' },
    { id: 'revenue' as const, label: 'Revenue', icon: '💰' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Export and analyze business data</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Date Range Filter</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 font-medium">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 font-medium">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <span className="text-sm text-slate-400">{filteredJobs.length} jobs in range</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jobs in Range" value={filteredJobs.length} icon="🔧" color="text-slate-800" />
        <StatCard label="Completed" value={completedJobs.length} icon="✅" color="text-emerald-600" />
        <StatCard label="Revenue Collected" value={`₹${totalRevenue.toLocaleString()}`} icon="💰" color="text-emerald-600" />
        <StatCard label="Pending Revenue" value={`₹${pendingRevenue.toLocaleString()}`} icon="⏳" color="text-amber-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 flex-wrap">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === tab.id ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Jobs Report Tab */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Jobs Report ({filteredJobs.length})</h2>
            <button onClick={handleExportJobs}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5">
              ↓ Export CSV
            </button>
          </div>

          {/* Status breakdown bar */}
          {filteredJobs.length > 0 && (
            <div className="px-6 py-4 border-b border-slate-50">
              <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-3">
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <div key={status}
                    className={`${statusColors[status] ?? 'bg-slate-300'} flex items-center justify-center`}
                    style={{ width: `${(count / filteredJobs.length) * 100}%` }}
                    title={`${status}: ${count}`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status] ?? 'bg-slate-300'}`} />
                    <span className="text-xs text-slate-600">{status}: <strong>{count}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                {['Job ID', 'Customer', 'Device', 'Engineer', 'Status', 'Est. Cost', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredJobs.map(job => {
                const customer = customers.find(c => c.id === job.customerId);
                const device = devices.find(d => d.id === job.deviceId);
                const engineer = users.find(u => u.id === job.assignedEngineerId);
                const statusStyle: Record<string, string> = {
                  New: 'bg-slate-100 text-slate-600', Assigned: 'bg-blue-50 text-blue-600',
                  'In Progress': 'bg-amber-50 text-amber-700', Completed: 'bg-emerald-50 text-emerald-700',
                  Delivered: 'bg-purple-50 text-purple-700',
                };
                return (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">#{job.id}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{customer?.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{device?.brand} {device?.model}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{engineer?.name ?? <span className="text-red-400 italic">Unassigned</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle[job.status]}`}>{job.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">₹{job.estimatedCost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(job.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredJobs.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="font-semibold">No jobs in selected date range</p>
            </div>
          )}
        </div>
      )}

      {/* Engineer Performance Tab */}
      {activeTab === 'engineers' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Engineer Performance</h2>
            <button onClick={handleExportEngineers}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5">
              ↓ Export CSV
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                {['Engineer', 'Total Jobs', 'Completed', 'Pending', 'Avg. Days', 'Efficiency'].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {engineerStats.sort((a, b) => b.efficiency - a.efficiency).map(eng => (
                <tr key={eng.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                        {eng.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{eng.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-700">{eng.total}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-emerald-600">{eng.completed}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-amber-600">{eng.pending}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{eng.avgDays > 0 ? `${eng.avgDays}d` : '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${eng.efficiency}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">{eng.efficiency}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {engineerStats.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-3xl mb-2">👨‍🔧</p>
              <p className="font-semibold">No engineers found</p>
            </div>
          )}
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Inventory Status</h2>
            <button onClick={handleExportInventory}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5">
              ↓ Export CSV
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                {['Item', 'Category', 'Stock', 'Min Stock', 'Unit Cost', 'Total Value', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {inventory.map(item => {
                const isLow = item.quantity <= item.minStock;
                return (
                  <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isLow ? 'bg-red-50/30' : ''}`}>
                    <td className="px-5 py-3 font-semibold text-sm text-slate-700">{item.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{item.category}</td>
                    <td className={`px-5 py-3 text-sm font-bold ${isLow ? 'text-red-600' : 'text-slate-700'}`}>{item.quantity}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{item.minStock}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">₹{item.unitCost.toLocaleString()}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-700">₹{(item.quantity * item.unitCost).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isLow ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {isLow ? '⚠ Low Stock' : '✓ OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Collected</p>
              <p className="text-3xl font-black text-emerald-600">₹{totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{completedJobs.length} completed jobs</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Pending Revenue</p>
              <p className="text-3xl font-black text-amber-600">₹{pendingRevenue.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{filteredJobs.length - completedJobs.length} active jobs</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Avg. Job Value</p>
              <p className="text-3xl font-black text-indigo-600">
                ₹{completedJobs.length > 0 ? Math.round(totalRevenue / completedJobs.length).toLocaleString() : 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">Per completed job</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50">
              <h2 className="font-bold text-slate-800">Revenue Breakdown by Engineer</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {engineers.map(eng => {
                const engCompleted = completedJobs.filter(j => j.assignedEngineerId === eng.id);
                const engRevenue = engCompleted.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
                const pct = totalRevenue > 0 ? Math.round((engRevenue / totalRevenue) * 100) : 0;
                return (
                  <div key={eng.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-600">
                      {eng.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700">{eng.name}</p>
                      <p className="text-xs text-slate-400">{engCompleted.length} jobs completed</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-bold text-slate-700 w-24 text-right">₹{engRevenue.toLocaleString()}</span>
                      <span className="text-xs text-slate-400 w-8">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};