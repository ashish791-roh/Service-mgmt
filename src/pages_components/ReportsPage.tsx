import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wrench, CheckCircle, Banknote, Hourglass, Download, User, Box, X } from 'lucide-react';

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

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const MetricCard = ({ title, value, icon: Icon, colorClass, sub, onClick }: any) => (
  <div
    onClick={onClick}
    className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group cursor-pointer hover:border-teal-400 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={20} />
      </div>
      {sub && <span className="bg-gray-100 text-gray-500 text-[11px] font-medium px-2.5 py-1 rounded-md uppercase tracking-wide">{sub}</span>}
    </div>
    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
    <h3 className="text-[24px] font-medium text-gray-900 leading-none">{value}</h3>
    <p className="text-[10px] text-teal-500 font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wide">
      Click to view details →
    </p>
  </div>
);

const Button = ({ icon: Icon, text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: any = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
  };
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

// Modal Component
const Modal = ({ isOpen, onClose, title, subtitle, children, onExport }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div>
            <h2 className="text-[18px] font-medium text-gray-900">{title}</h2>
            {subtitle && <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {onExport && (
              <Button icon={Download} text="Export CSV" variant="outline" onClick={onExport} />
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const statusBadgeColors: Record<string, string> = {
  New: 'bg-gray-100 text-gray-600',
  Assigned: 'bg-cyan-100 text-cyan-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Delivered: 'bg-teal-100 text-teal-700',
};

const statusBarColors: Record<string, string> = {
  New: 'bg-gray-300', Assigned: 'bg-cyan-400',
  'In Progress': 'bg-amber-400', Completed: 'bg-green-500', Delivered: 'bg-teal-500',
};

type ModalType = 'totalJobs' | 'completed' | 'collected' | 'pending' | null;

export const ReportsPage: React.FC = () => {
  const { jobs, customers, users, devices, inventory } = useApp();
  const [dateFrom, setDateFrom] = useState('2026-04-01');
  const [dateTo, setDateTo] = useState('2026-04-30');
  const [activeTab, setActiveTab] = useState<'jobs' | 'engineers' | 'inventory' | 'revenue'>('jobs');
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const engineers = users.filter(u => u.role === 'engineer');

  const filteredJobs = jobs.filter(j => {
    const d = new Date(j.createdAt);
    return d >= new Date(dateFrom) && d <= new Date(dateTo + 'T23:59:59');
  });

  const completedJobs = filteredJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
  const pendingJobs = filteredJobs.filter(j => !['Completed', 'Delivered'].includes(j.status));
  const totalRevenue = completedJobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
  const pendingRevenue = pendingJobs.reduce((s, j) => s + j.estimatedCost, 0);

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

  const handleExportJobs = () => {
    const data = filteredJobs.map(j => {
      const customer = customers.find(c => c.id === j.customerId);
      const device = devices.find(d => d.id === j.deviceId);
      const engineer = users.find(u => u.id === j.assignedEngineerId);
      return {
        'Job ID': j.id, 'Customer': customer?.name ?? '', 'Phone': customer?.phone ?? '',
        'Device': `${device?.brand} ${device?.model}`, 'Problem': j.problemDescription,
        'Engineer': engineer?.name ?? 'Unassigned', 'Status': j.status,
        'Estimated Cost': j.estimatedCost, 'Actual Cost': j.actualCost ?? '',
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
    { id: 'jobs' as const, label: 'Jobs Report', icon: Wrench },
    { id: 'engineers' as const, label: 'Engineer Performance', icon: User },
    { id: 'inventory' as const, label: 'Inventory', icon: Box },
    { id: 'revenue' as const, label: 'Revenue', icon: Banknote },
  ];

  // Shared job table used inside modals
  const JobTable = ({ jobList }: { jobList: typeof filteredJobs }) => (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['ID', 'Client', 'Device', 'Assigned Engineer', 'Status', 'Cost', 'Date'].map(h => (
              <th key={h} className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {jobList.map(job => {
            const customer = customers.find(c => c.id === job.customerId);
            const device = devices.find(d => d.id === job.deviceId);
            const engineer = users.find(u => u.id === job.assignedEngineerId);
            return (
              <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase"># {job.id}</td>
                <td className="px-4 py-3">
                  <p className="text-[13px] font-medium text-gray-900">{customer?.name}</p>
                  <p className="text-[11px] text-gray-400">{customer?.phone}</p>
                </td>
                <td className="px-4 py-3 text-[13px] text-gray-600">{device?.brand} {device?.model}</td>
                <td className="px-4 py-3 text-[13px] text-gray-600">
                  {engineer?.name ?? <span className="text-rose-400 italic">Unassigned</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide ${statusBadgeColors[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] font-medium text-gray-900">₹{job.estimatedCost.toLocaleString()}</td>
                <td className="px-4 py-3 text-[11px] text-gray-500">{new Date(job.createdAt).toLocaleDateString('en-IN')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {jobList.length === 0 && (
        <div className="p-10 text-center text-gray-400">
          <Wrench size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-[13px]">No jobs found</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Business Intelligence" subtitle="Export and analyze performance data" />

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h3 className="text-[18px] font-medium text-gray-900">Reporting Period</h3>
          <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mt-1">Select date range</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-lg border border-gray-200 w-full sm:w-auto">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide pl-2">From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-white px-3 py-2 rounded-md border border-gray-200 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-teal-500 transition-colors" />
          </div>
          <span className="text-gray-300 font-medium hidden sm:block">→</span>
          <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-lg border border-gray-200 w-full sm:w-auto">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide pl-2">To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-white px-3 py-2 rounded-md border border-gray-200 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-teal-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Summary Stats — all 4 cards clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Jobs" value={filteredJobs.length} icon={Wrench}
          colorClass="bg-cyan-50 text-cyan-600 border border-cyan-200" sub="In period"
          onClick={() => setOpenModal('totalJobs')} />
        <MetricCard title="Completed" value={completedJobs.length} icon={CheckCircle}
          colorClass="bg-green-50 text-green-600 border border-green-200" sub="Successfully"
          onClick={() => setOpenModal('completed')} />
        <MetricCard title="Collected" value={`₹${(totalRevenue / 1000).toFixed(1)}k`} icon={Banknote}
          colorClass="bg-teal-50 text-teal-600 border border-teal-200"
          onClick={() => setOpenModal('collected')} />
        <MetricCard title="Pending" value={`₹${(pendingRevenue / 1000).toFixed(1)}k`} icon={Hourglass}
          colorClass="bg-amber-50 text-amber-600 border border-amber-200"
          onClick={() => setOpenModal('pending')} />
      </div>

      {/* ── Modal: Total Jobs ── */}
      <Modal
        isOpen={openModal === 'totalJobs'}
        onClose={() => setOpenModal(null)}
        title={`Total Jobs — ${filteredJobs.length} jobs`}
        subtitle={`${dateFrom} → ${dateTo}`}
        onExport={() => {
          const data = filteredJobs.map(j => {
            const customer = customers.find(c => c.id === j.customerId);
            const device = devices.find(d => d.id === j.deviceId);
            const engineer = users.find(u => u.id === j.assignedEngineerId);
            return { 'Job ID': j.id, 'Customer': customer?.name ?? '', 'Device': `${device?.brand} ${device?.model}`,
              'Engineer': engineer?.name ?? 'Unassigned', 'Status': j.status,
              'Cost': j.estimatedCost, 'Created': new Date(j.createdAt).toLocaleDateString('en-IN') };
          });
          exportToCSV(data as Record<string, unknown>[], `total_jobs_${dateFrom}_${dateTo}.csv`);
        }}
      >
        {filteredJobs.length > 0 && (
          <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">Status Breakdown</p>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-3 bg-gray-200">
              {Object.entries(statusBreakdown).map(([status, count]) => (
                <div key={status} className={`${statusBarColors[status] ?? 'bg-gray-300'}`}
                  style={{ width: `${(count / filteredJobs.length) * 100}%` }} title={`${status}: ${count}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusBarColors[status] ?? 'bg-gray-300'}`} />
                  <span className="text-[11px] font-medium text-gray-600">{status}: <strong className="text-gray-900">{count}</strong></span>
                </div>
              ))}
            </div>
          </div>
        )}
        <JobTable jobList={filteredJobs} />
      </Modal>

      {/* ── Modal: Completed Jobs ── */}
      <Modal
        isOpen={openModal === 'completed'}
        onClose={() => setOpenModal(null)}
        title={`Completed Jobs — ${completedJobs.length} jobs`}
        subtitle="Delivered & completed"
        onExport={() => {
          const data = completedJobs.map(j => {
            const customer = customers.find(c => c.id === j.customerId);
            const device = devices.find(d => d.id === j.deviceId);
            const engineer = users.find(u => u.id === j.assignedEngineerId);
            return { 'Job ID': j.id, 'Customer': customer?.name ?? '', 'Device': `${device?.brand} ${device?.model}`,
              'Engineer': engineer?.name ?? '', 'Status': j.status,
              'Amount': j.actualCost ?? j.estimatedCost,
              'Completed At': j.completedAt ? new Date(j.completedAt).toLocaleDateString('en-IN') : '—' };
          });
          exportToCSV(data as Record<string, unknown>[], `completed_jobs_${dateFrom}_${dateTo}.csv`);
        }}
      >
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 rounded-xl p-4 border border-green-100 text-center">
            <p className="text-[24px] font-medium text-green-600">{completedJobs.length}</p>
            <p className="text-[11px] font-medium text-green-700 uppercase tracking-wide mt-1">Total Completed</p>
          </div>
          <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 text-center">
            <p className="text-[24px] font-medium text-teal-600">₹{(totalRevenue / 1000).toFixed(1)}k</p>
            <p className="text-[11px] font-medium text-teal-700 uppercase tracking-wide mt-1">Revenue Collected</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
            <p className="text-[24px] font-medium text-gray-900">
              ₹{completedJobs.length > 0 ? Math.round(totalRevenue / completedJobs.length).toLocaleString() : 0}
            </p>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-1">Avg Ticket Size</p>
          </div>
        </div>
        <JobTable jobList={completedJobs} />
      </Modal>

      {/* ── Modal: Collected Revenue ── */}
      <Modal
        isOpen={openModal === 'collected'}
        onClose={() => setOpenModal(null)}
        title={`Revenue Collected — ₹${totalRevenue.toLocaleString()}`}
        subtitle="Realized revenue from completed jobs"
        onExport={() => {
          const data = completedJobs.map(j => {
            const customer = customers.find(c => c.id === j.customerId);
            const engineer = users.find(u => u.id === j.assignedEngineerId);
            return { 'Job ID': j.id, 'Customer': customer?.name ?? '', 'Engineer': engineer?.name ?? '',
              'Amount': j.actualCost ?? j.estimatedCost,
              'Date': j.completedAt ? new Date(j.completedAt).toLocaleDateString('en-IN') : '—' };
          });
          exportToCSV(data as Record<string, unknown>[], `revenue_collected_${dateFrom}_${dateTo}.csv`);
        }}
      >
        <div className="mb-6">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">Revenue by Engineer</p>
          <div className="space-y-3">
            {engineers.map(eng => {
              const engCompleted = completedJobs.filter(j => j.assignedEngineerId === eng.id);
              const engRevenue = engCompleted.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
              const pct = totalRevenue > 0 ? Math.round((engRevenue / totalRevenue) * 100) : 0;
              return (
                <div key={eng.id} className="flex items-center gap-4 bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center text-[13px] font-medium flex-shrink-0">
                    {eng.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{eng.name}</p>
                      <span className="text-[13px] font-medium text-gray-900 ml-3 flex-shrink-0">₹{engRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-medium text-gray-500 w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Job ID', 'Customer', 'Engineer', 'Amount', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {completedJobs.map(job => {
                const customer = customers.find(c => c.id === job.customerId);
                const engineer = users.find(u => u.id === job.assignedEngineerId);
                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase"># {job.id}</td>
                    <td className="px-4 py-3 text-[13px] font-medium text-gray-900">{customer?.name}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">{engineer?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[13px] font-medium text-green-600">₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">
                      {job.completedAt ? new Date(job.completedAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* ── Modal: Pending Revenue ── */}
      <Modal
        isOpen={openModal === 'pending'}
        onClose={() => setOpenModal(null)}
        title={`Pending Queue — ₹${pendingRevenue.toLocaleString()}`}
        subtitle="Jobs awaiting completion & collection"
        onExport={() => {
          const data = pendingJobs.map(j => {
            const customer = customers.find(c => c.id === j.customerId);
            const device = devices.find(d => d.id === j.deviceId);
            const engineer = users.find(u => u.id === j.assignedEngineerId);
            return { 'Job ID': j.id, 'Customer': customer?.name ?? '', 'Device': `${device?.brand} ${device?.model}`,
              'Engineer': engineer?.name ?? 'Unassigned', 'Status': j.status,
              'Estimated Value': j.estimatedCost, 'Created': new Date(j.createdAt).toLocaleDateString('en-IN') };
          });
          exportToCSV(data as Record<string, unknown>[], `pending_jobs_${dateFrom}_${dateTo}.csv`);
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {['New', 'Assigned', 'In Progress'].map(status => {
            const count = pendingJobs.filter(j => j.status === status).length;
            const value = pendingJobs.filter(j => j.status === status).reduce((s, j) => s + j.estimatedCost, 0);
            const bgMap: Record<string, string> = { New: 'bg-gray-50 border-gray-200', Assigned: 'bg-cyan-50 border-cyan-100', 'In Progress': 'bg-amber-50 border-amber-100' };
            const textMap: Record<string, string> = { New: 'text-gray-700', Assigned: 'text-cyan-700', 'In Progress': 'text-amber-700' };
            return (
              <div key={status} className={`rounded-xl p-4 border ${bgMap[status]} text-center`}>
                <p className={`text-[22px] font-medium ${textMap[status]}`}>{count}</p>
                <p className={`text-[11px] font-medium uppercase tracking-wide mt-0.5 ${textMap[status]}`}>{status}</p>
                <p className="text-[12px] text-gray-500 mt-1">₹{value.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
        <JobTable jobList={pendingJobs} />
      </Modal>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}>
            <tab.icon size={16} className={activeTab === tab.id ? 'text-gray-900' : 'text-gray-400'} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports Content */}
      <div className="transition-opacity duration-200">
        {activeTab === 'jobs' && (
          <Card>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 gap-4">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Jobs Pipeline ({filteredJobs.length})</h2>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-1">Status breakdown</p>
              </div>
              <Button icon={Download} text="Export Data" variant="primary" onClick={handleExportJobs} className="w-full sm:w-auto" />
            </div>
            {filteredJobs.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3 bg-gray-100">
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className={`${statusBarColors[status] ?? 'bg-gray-300'} transition-all`}
                      style={{ width: `${(count / filteredJobs.length) * 100}%` }} title={`${status}: ${count}`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusBarColors[status] ?? 'bg-gray-300'}`} />
                      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{status}: <strong className="text-gray-900 ml-0.5">{count}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['ID', 'Client', 'Device', 'Assigned', 'Status', 'Cost', 'Date'].map(h => (
                      <th key={h} className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.map(job => {
                    const customer = customers.find(c => c.id === job.customerId);
                    const device = devices.find(d => d.id === job.deviceId);
                    const engineer = users.find(u => u.id === job.assignedEngineerId);
                    return (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">#{job.id}</td>
                        <td className="px-6 py-4"><p className="text-[13px] font-medium text-gray-900">{customer?.name}</p></td>
                        <td className="px-6 py-4 text-[13px] font-normal text-gray-600">{device?.brand}</td>
                        <td className="px-6 py-4 text-[13px] font-normal text-gray-600">{engineer?.name ?? <span className="text-rose-400 italic">Unassigned</span>}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[11px] font-medium uppercase tracking-wide">{job.status}</span>
                        </td>
                        <td className="px-6 py-4 text-[13px] font-medium text-gray-900">₹{job.estimatedCost.toLocaleString()}</td>
                        <td className="px-6 py-4 text-[11px] font-normal text-gray-500">{new Date(job.createdAt).toLocaleDateString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredJobs.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400"><Wrench size={24} /></div>
                  <p className="text-[13px] font-medium text-gray-900 mb-1">No jobs found</p>
                  <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">Adjust the date range above</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'engineers' && (
          <Card>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 gap-4">
              <h2 className="text-[18px] font-medium text-gray-900">Performance Matrix</h2>
              <Button icon={Download} text="Export Data" variant="primary" onClick={handleExportEngineers} className="w-full sm:w-auto" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Engineer', 'Load', 'Completed', 'Pending', 'Turnaround', 'Efficiency Score'].map(h => (
                      <th key={h} className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {engineerStats.sort((a, b) => b.efficiency - a.efficiency).map(eng => (
                    <tr key={eng.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-[13px] font-medium border border-teal-100">
                            {eng.name.charAt(0)}
                          </div>
                          <span className="text-[13px] font-medium text-gray-900">{eng.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[18px] font-medium text-gray-900">{eng.total}</td>
                      <td className="px-6 py-4 text-[18px] font-medium text-green-500">{eng.completed}</td>
                      <td className="px-6 py-4 text-[18px] font-medium text-amber-500">{eng.pending}</td>
                      <td className="px-6 py-4 text-[11px] font-normal text-gray-500">{eng.avgDays > 0 ? `${eng.avgDays} days` : '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${eng.efficiency > 80 ? 'bg-green-500' : eng.efficiency > 50 ? 'bg-amber-400' : 'bg-rose-500'}`}
                              style={{ width: `${eng.efficiency}%` }} />
                          </div>
                          <span className="text-[11px] font-medium text-gray-900 w-8 text-right">{eng.efficiency}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'inventory' && (
          <Card>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 gap-4">
              <h2 className="text-[18px] font-medium text-gray-900">Inventory Valuation</h2>
              <Button icon={Download} text="Export Data" variant="primary" onClick={handleExportInventory} className="w-full sm:w-auto" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Part Name', 'Category', 'Quantity', 'Status', 'Unit Cost', 'Asset Value'].map(h => (
                      <th key={h} className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inventory.map(item => {
                    const isLow = item.quantity <= item.minStock;
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isLow ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-6 py-4 text-[13px] font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[11px] font-medium uppercase tracking-wide">{item.category}</span>
                        </td>
                        <td className={`px-6 py-4 text-[18px] font-medium ${isLow ? 'text-rose-600' : 'text-gray-900'}`}>{item.quantity}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide ${isLow ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
                            {isLow ? 'Critical' : 'Healthy'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[11px] font-normal text-gray-500">₹{item.unitCost.toLocaleString()}</td>
                        <td className="px-6 py-4 text-[13px] font-medium text-gray-900">₹{(item.quantity * item.unitCost).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-teal-500 text-white p-6 border-transparent">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4"><Banknote size={20} /></div>
                <p className="text-[11px] font-medium text-teal-100 uppercase tracking-wide mb-1">Total Realized</p>
                <p className="text-[24px] font-medium mb-2">₹{totalRevenue.toLocaleString()}</p>
                <p className="text-[11px] font-medium text-teal-100 bg-white/10 w-fit px-2.5 py-1 rounded-md">{completedJobs.length} completed transactions</p>
              </Card>
              <Card className="bg-amber-500 text-white p-6 border-transparent">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4"><Hourglass size={20} /></div>
                <p className="text-[11px] font-medium text-amber-100 uppercase tracking-wide mb-1">Awaiting Collection</p>
                <p className="text-[24px] font-medium mb-2">₹{pendingRevenue.toLocaleString()}</p>
                <p className="text-[11px] font-medium text-amber-100 bg-white/10 w-fit px-2.5 py-1 rounded-md">{filteredJobs.length - completedJobs.length} active invoices</p>
              </Card>
              <Card className="p-6">
                <div className="w-10 h-10 bg-teal-50 text-teal-600 border border-teal-100 rounded-lg flex items-center justify-center mb-4"><CheckCircle size={20} /></div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Avg Ticket Size</p>
                <p className="text-[24px] font-medium text-gray-900 mb-2">
                  ₹{completedJobs.length > 0 ? Math.round(totalRevenue / completedJobs.length).toLocaleString() : 0}
                </p>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-2">Per transaction</p>
              </Card>
            </div>
            <Card>
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-[18px] font-medium text-gray-900">Revenue Breakdown by Engineer</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {engineers.map(eng => {
                  const engCompleted = completedJobs.filter(j => j.assignedEngineerId === eng.id);
                  const engRevenue = engCompleted.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
                  const pct = totalRevenue > 0 ? Math.round((engRevenue / totalRevenue) * 100) : 0;
                  return (
                    <div key={eng.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 w-64">
                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-[13px] font-medium text-teal-600 border border-teal-100">
                          {eng.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">{eng.name}</p>
                          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{engCompleted.length} transactions</p>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-right w-24">
                          <span className="text-[13px] font-medium text-gray-900 block">₹{engRevenue.toLocaleString()}</span>
                          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{pct}% of total</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};