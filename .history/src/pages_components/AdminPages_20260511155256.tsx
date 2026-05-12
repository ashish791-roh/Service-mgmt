import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Toggle, Toast, useToast } from '../components/ui';
import type { Role } from '../types';
import { Wrench, CheckCircle, Banknote, Hourglass, Users, UserPlus, ChevronRight, Package, X, Pencil, Trash2 } from 'lucide-react';

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

const MetricCard = ({ title, value, icon: Icon, color, sub, onClick }: any) => {
  const colorMap: Record<string, string> = {
    teal: "text-teal-500 bg-teal-50",
    cyan: "text-cyan-500 bg-cyan-50",
    green: "text-green-500 bg-green-50",
    orange: "text-orange-500 bg-orange-50",
  };
  const bgClass = colorMap[color] || colorMap.teal;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border border-gray-200 relative overflow-hidden flex flex-col gap-4 ${onClick ? 'cursor-pointer hover:border-teal-300 hover:shadow-md transition-all group' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="flex items-center gap-2">
          {sub && <span className="bg-gray-100 text-gray-500 text-[11px] font-medium px-2 py-1 rounded-lg">{sub}</span>}
          {onClick && (
            <span className="text-[10px] font-medium text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Details <ChevronRight size={12} />
            </span>
          )}
        </div>
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <h3 className="text-[18px] font-medium text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );
};

const GlowButton = ({ icon: Icon, text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: Record<string, string> = {
    primary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    vivid: "bg-teal-500 text-white hover:bg-teal-600",
    success: "bg-green-500 text-white hover:bg-green-600",
  };
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant] || styles.primary} ${className}`}>
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

// ── Detail Modal (slide-in drawer) ───────────────────────────────────────────
type ModalType = 'total' | 'pending' | 'completed' | 'clients' | 'engineers' | 'parts' | 'revenue' | null;

const DetailModal = ({
  type, onClose, jobs, users, customers, partRequests, sales
}: {
  type: ModalType;
  onClose: () => void;
  jobs: any[];
  users: any[];
  customers: any[];
  partRequests: any[];
  sales: any[];
}) => {
  if (!type) return null;

  const engineers = users.filter((u: any) => u.role === 'engineer');

  const jobStatusColors: Record<string, string> = {
    'New': 'border-cyan-400 text-cyan-700 bg-cyan-50',
    'Assigned': 'border-teal-400 text-teal-700 bg-teal-50',
    'In Progress': 'border-orange-400 text-orange-700 bg-orange-50',
    'Completed': 'border-green-400 text-green-700 bg-green-50',
    'Delivered': 'border-green-400 text-green-700 bg-green-50',
  };

  const configs: Record<NonNullable<ModalType>, { title: string; subtitle: string; accentColor: string }> = {
    total:     { title: 'All Jobs',            subtitle: 'Complete job registry',        accentColor: 'text-cyan-600' },
    pending:   { title: 'Pending Queue',        subtitle: 'Jobs awaiting completion',     accentColor: 'text-orange-600' },
    completed: { title: 'Completed Jobs',       subtitle: 'Successfully resolved jobs',  accentColor: 'text-green-600' },
    clients:   { title: 'Client Base',          subtitle: 'Registered customers',        accentColor: 'text-teal-600' },
    engineers: { title: 'Engineer Roster',      subtitle: 'Team capacity & performance', accentColor: 'text-teal-600' },
    parts:     { title: 'Pending Parts',        subtitle: 'Parts requests awaiting approval', accentColor: 'text-orange-600' },
    revenue:   { title: 'Revenue Overview',     subtitle: 'Billing & earnings summary',  accentColor: 'text-green-600' },
  };

  const cfg = configs[type];

  // ── Content per card type ────────────────────────────────────────
  const renderContent = () => {
    // TOTAL JOBS — show all jobs with full detail
    if (type === 'total') {
      return (
        <div className="divide-y divide-gray-100">
          {jobs.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No jobs yet.</p>}
          {jobs.map((job: any) => {
            const customer = customers.find((c: any) => c.id === job.customerId);
            const engineer = engineers.find((e: any) => e.id === job.assignedEngineerId);
            const style = jobStatusColors[job.status] || 'border-gray-300 text-gray-700 bg-gray-50';
            const borderCls = style.split(' ')[0];
            const badgeCls = style.split(' ').slice(1).join(' ');
            const daysOld = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000);
            return (
              <div key={job.id} className={`flex flex-col gap-2 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {customer?.name ?? 'Unknown'} · {engineer?.name ?? <span className="text-orange-500">Unassigned</span>}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${badgeCls}`}>{job.status}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span>Created {new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                  <span>·</span>
                  <span className={daysOld > 10 ? 'text-red-500 font-medium' : daysOld > 5 ? 'text-yellow-600 font-medium' : 'text-green-600'}>
                    {daysOld}d ago
                  </span>
                  <span>·</span>
                  <span className="text-gray-700 font-medium">₹{job.estimatedCost.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // PENDING JOBS
    if (type === 'pending') {
      const pendingJobs = jobs.filter((j: any) => ['New', 'Assigned', 'In Progress'].includes(j.status));
      return (
        <div className="divide-y divide-gray-100">
          {pendingJobs.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No pending jobs. 🎉</p>}
          {pendingJobs.map((job: any) => {
            const customer = customers.find((c: any) => c.id === job.customerId);
            const engineer = engineers.find((e: any) => e.id === job.assignedEngineerId);
            const daysOld = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000);
            const urgency = daysOld > 10 ? { label: 'Critical', cls: 'bg-red-100 text-red-700' }
              : daysOld > 5 ? { label: 'Overdue', cls: 'bg-yellow-100 text-yellow-700' }
              : { label: 'On Track', cls: 'bg-green-100 text-green-700' };
            const style = jobStatusColors[job.status] || 'border-gray-300 text-gray-700 bg-gray-50';
            const borderCls = style.split(' ')[0];
            const badgeCls = style.split(' ').slice(1).join(' ');
            return (
              <div key={job.id} className={`flex flex-col gap-2 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {customer?.name ?? 'Unknown'} · {engineer?.name ?? <span className="text-orange-500 font-medium">Unassigned</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${badgeCls}`}>{job.status}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${urgency.cls}`}>{urgency.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span>Since {new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                  <span>·</span>
                  <span className={daysOld > 10 ? 'text-red-600 font-semibold' : daysOld > 5 ? 'text-yellow-600 font-medium' : 'text-gray-600'}>
                    {daysOld} day{daysOld !== 1 ? 's' : ''} pending
                  </span>
                  <span>·</span>
                  <span className="font-medium text-gray-700">₹{job.estimatedCost.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // COMPLETED JOBS
    if (type === 'completed') {
      const completedJobs = jobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status));
      const totalRevenue = completedJobs.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
      return (
        <>
          <div className="px-6 py-4 bg-green-50 border-b border-green-100">
            <p className="text-[11px] font-medium text-green-600 uppercase tracking-wide">Total Earned from Completed Jobs</p>
            <p className="text-[22px] font-medium text-green-700 mt-0.5">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {completedJobs.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No completed jobs yet.</p>}
            {completedJobs.map((job: any) => {
              const customer = customers.find((c: any) => c.id === job.customerId);
              const engineer = engineers.find((e: any) => e.id === job.assignedEngineerId);
              const style = jobStatusColors[job.status] || 'border-gray-300 text-gray-700 bg-gray-50';
              const borderCls = style.split(' ')[0];
              const badgeCls = style.split(' ').slice(1).join(' ');
              return (
                <div key={job.id} className={`flex flex-col gap-2 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {customer?.name ?? 'Unknown'} · {engineer?.name ?? 'Unknown'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${badgeCls}`}>{job.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    <span>{new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                    {job.completedAt && <><span>·</span><span>Done {new Date(job.completedAt).toLocaleDateString('en-IN')}</span></>}
                    <span>·</span>
                    <span className="text-green-700 font-medium">₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    }

    // CLIENT BASE
    if (type === 'clients') {
      return (
        <div className="divide-y divide-gray-100">
          {customers.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No customers yet.</p>}
          {customers.map((c: any) => {
            const clientJobs = jobs.filter((j: any) => j.customerId === c.id);
            const active = clientJobs.filter((j: any) => ['New', 'Assigned', 'In Progress'].includes(j.status)).length;
            const done = clientJobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status)).length;
            return (
              <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-[14px] shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{c.phone} · {c.address}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-medium text-gray-700">{clientJobs.length} job{clientJobs.length !== 1 ? 's' : ''}</p>
                  <p className="text-[11px] text-gray-400">{active > 0 ? <span className="text-orange-500">{active} active</span> : ''}{active > 0 && done > 0 ? ' · ' : ''}{done > 0 ? <span className="text-green-600">{done} done</span> : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // ENGINEER ROSTER
    if (type === 'engineers') {
      return (
        <div className="divide-y divide-gray-100">
          {engineers.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No engineers registered.</p>}
          {engineers.map((eng: any) => {
            const engJobs = jobs.filter((j: any) => j.assignedEngineerId === eng.id);
            const completed = engJobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status)).length;
            const active = engJobs.filter((j: any) => ['Assigned', 'In Progress'].includes(j.status)).length;
            const pending = engJobs.filter((j: any) => j.status === 'New').length;
            const pct = engJobs.length > 0 ? Math.round((completed / engJobs.length) * 100) : 0;

            // Avg completion time (in days)
            const completedWithDate = engJobs.filter((j: any) => j.completedAt && j.createdAt);
            const avgDays = completedWithDate.length > 0
              ? Math.round(completedWithDate.reduce((s: number, j: any) =>
                s + (new Date(j.completedAt).getTime() - new Date(j.createdAt).getTime()) / 86400000, 0
              ) / completedWithDate.length)
              : null;

            return (
              <div key={eng.id} className={`flex flex-col gap-3 px-6 py-5 border-l-4 ${eng.active ? 'border-green-400' : 'border-gray-300'} hover:bg-gray-50 transition-colors`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium text-[14px] shrink-0">
                      {eng.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">{eng.name}</p>
                      <p className="text-[11px] text-gray-500">{eng.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${eng.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {eng.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="font-medium text-gray-700 shrink-0">{pct}%</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-[11px] font-medium">{active} active</span>
                  <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 text-[11px] font-medium">{completed} completed</span>
                  {pending > 0 && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium">{pending} new</span>}
                  {avgDays !== null && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium">avg {avgDays}d/job</span>}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // PENDING PARTS
    if (type === 'parts') {
      const pendingParts = partRequests.filter((r: any) => r.status === 'Pending');
      const allParts = partRequests;
      return (
        <>
          <div className="flex divide-x divide-gray-100 border-b border-gray-100">
            {[
              { label: 'Pending', count: allParts.filter((r: any) => r.status === 'Pending').length, cls: 'text-orange-600' },
              { label: 'Approved', count: allParts.filter((r: any) => r.status === 'Approved').length, cls: 'text-green-600' },
              { label: 'Rejected', count: allParts.filter((r: any) => r.status === 'Rejected').length, cls: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="flex-1 px-6 py-4 text-center">
                <p className={`text-[20px] font-medium ${s.cls}`}>{s.count}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-2 bg-gray-50">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Pending Approval</p>
            </div>
            {pendingParts.length === 0 && <p className="px-6 py-6 text-[13px] text-gray-400 text-center">No pending part requests.</p>}
            {pendingParts.map((r: any) => {
              const eng = engineers.find((e: any) => e.id === r.engineerId);
              const job = jobs.find((j: any) => j.id === r.jobId);
              return (
                <div key={r.id} className="flex items-start gap-4 px-6 py-4 border-l-4 border-orange-400 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900">{r.partName}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Qty: {r.quantity} · {eng?.name ?? 'Unknown Engineer'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">Reason: {r.reason}</p>
                    {job && <p className="text-[11px] text-teal-600 mt-0.5 truncate">Job: {job.problemDescription}</p>}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-orange-100 text-orange-700 shrink-0">Pending</span>
                </div>
              );
            })}
          </div>
        </>
      );
    }

    // REVENUE OVERVIEW
    if (type === 'revenue') {
      const jobsRevenue = jobs.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
      const salesRevenue = sales.reduce((s: number, sale: any) => s + sale.totalAmount, 0);
      const allRevenue = jobsRevenue + salesRevenue;
      const completedRevenue = jobs
        .filter((j: any) => ['Completed', 'Delivered'].includes(j.status))
        .reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
      const pendingRevenue = jobs
        .filter((j: any) => ['New', 'Assigned', 'In Progress'].includes(j.status))
        .reduce((s: number, j: any) => s + j.estimatedCost, 0);

      const revenueByEngineer = engineers.map((eng: any) => {
        const engJobs = jobs.filter((j: any) => j.assignedEngineerId === eng.id && ['Completed', 'Delivered'].includes(j.status));
        return { name: eng.name, revenue: engJobs.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0) };
      }).sort((a: any, b: any) => b.revenue - a.revenue);

      const maxRevenue = revenueByEngineer[0]?.revenue || 1;

      return (
        <>
          {/* Top 3 summary numbers — now includes product sales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-gray-100 border-b border-gray-100">
            {[
              { label: 'Est. Total', value: `₹${(allRevenue / 1000).toFixed(1)}k`, cls: 'text-gray-900' },
              { label: 'Collected (Jobs)', value: `₹${(completedRevenue / 1000).toFixed(1)}k`, cls: 'text-green-600' },
              { label: 'Pending (Jobs)', value: `₹${(pendingRevenue / 1000).toFixed(1)}k`, cls: 'text-orange-500' },
            ].map(s => (
              <div key={s.label} className="px-6 py-4 text-center">
                <p className={`text-[20px] font-medium ${s.cls}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue source breakdown */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 space-y-2">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">Revenue Breakdown by Source</p>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> Service Jobs
              </span>
              <span className="text-[13px] font-medium text-gray-900">₹{jobsRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Product Sales
              </span>
              <span className="text-[13px] font-medium text-gray-900">₹{salesRevenue.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-gray-800">Combined Total</span>
              <span className="text-[14px] font-bold text-teal-700">₹{allRevenue.toLocaleString()}</span>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Revenue by Engineer</p>
          </div>
          <div className="divide-y divide-gray-100">
            {revenueByEngineer.map((eng: any) => (
              <div key={eng.name} className="flex items-center gap-4 px-6 py-4">
                <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-[12px] shrink-0">
                  {eng.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <p className="text-[12px] font-medium text-gray-900 truncate">{eng.name}</p>
                    <p className="text-[12px] font-medium text-gray-700 shrink-0">₹{eng.revenue.toLocaleString()}</p>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.round((eng.revenue / maxRevenue) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {revenueByEngineer.length === 0 && <p className="px-6 py-6 text-[13px] text-gray-400 text-center">No revenue data yet.</p>}
          </div>

          {/* Last 5 billed jobs */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">Last 5 Billed Jobs</p>
            <div className="space-y-2">
              {jobs
                .filter((j: any) => ['Completed', 'Delivered'].includes(j.status))
                .slice(0, 5)
                .map((j: any) => {
                  const customer = customers.find((c: any) => c.id === j.customerId);
                  return (
                    <div key={j.id} className="flex justify-between items-center">
                      <span className="text-[12px] text-gray-700 truncate flex-1">{customer?.name ?? 'Unknown'} — {j.problemDescription}</span>
                      <span className="text-[12px] font-medium text-green-700 shrink-0 ml-3">₹{(j.actualCost ?? j.estimatedCost).toLocaleString()}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Last 5 product sales */}
          {sales.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">Last 5 Product Sales</p>
              <div className="space-y-2">
                {[...sales]
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((sale: any) => (
                    <div key={sale.id} className="flex justify-between items-center">
                      <span className="text-[12px] text-gray-700 truncate flex-1">
                        {sale.companyName || sale.contactName} · {sale.items?.length ?? 0} item{sale.items?.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[12px] font-medium text-purple-700 shrink-0 ml-3">₹{sale.totalAmount.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
          <div>
            <h2 className={`text-[18px] font-medium text-gray-900`}>{cfg.title}</h2>
            <p className={`text-[13px] font-normal mt-0.5 ${cfg.accentColor}`}>{cfg.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// ── AdminDashboard ────────────────────────────────────────────────────────────
export const AdminDashboard: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const { jobs, users, customers, partRequests, inventory, sales } = useApp();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const engineers = users.filter(u => u.role === 'engineer');
  const activeEngineers = engineers.filter(u => u.active);
  const pendingParts = partRequests.filter(r => r.status === 'Pending');

  const jobStats = {
    total: jobs.length,
    pending: jobs.filter(j => ['New', 'Assigned', 'In Progress'].includes(j.status)).length,
    completed: jobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length,
  };

  const jobStatusColors: Record<string, string> = {
    'New': 'border-cyan-500 text-cyan-700 bg-cyan-50',
    'Assigned': 'border-teal-500 text-teal-700 bg-teal-50',
    'In Progress': 'border-orange-500 text-orange-700 bg-orange-50',
    'Completed': 'border-green-500 text-green-700 bg-green-50',
    'Delivered': 'border-green-500 text-green-700 bg-green-50',
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Executive Overview" subtitle="Click any metric card to view details" />

      {/* Primary KPI Cards Grid — all clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Volume"    value={jobStats.total}      icon={Wrench}       color="cyan"   sub="All Jobs" onClick={() => setActiveModal('total')} />
        <MetricCard title="Pending Queue"   value={jobStats.pending}    icon={Hourglass}    color="orange" sub="Active"   onClick={() => setActiveModal('pending')} />
        <MetricCard title="Total Completed" value={jobStats.completed}  icon={CheckCircle}  color="green"  sub="Success"  onClick={() => setActiveModal('completed')} />
        <MetricCard title="Client Base"     value={customers.length}    icon={Users}        color="teal"               onClick={() => setActiveModal('clients')} />
      </div>

      {/* Secondary KPI Cards — all clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Active Engineers"   value={`${activeEngineers.length}/${engineers.length}`} icon={Users}    color="teal"   onClick={() => setActiveModal('engineers')} />
        <MetricCard title="Pending Parts"      value={pendingParts.length}                             icon={Package}  color="orange" sub={pendingParts.length > 0 ? "Action Needed" : ""} onClick={() => setActiveModal('parts')} />
        <MetricCard title="Est. Total Revenue" value={`₹${((jobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0) + sales.reduce((s, sale) => s + sale.totalAmount, 0)) / 1000).toFixed(1)}k`} icon={Banknote} color="green" onClick={() => setActiveModal('revenue')} />
      </div>

      {inventory && inventory.filter(i => i.quantity <= i.minStock).length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <div className="px-6 py-4 border-b border-red-200 flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-red-900 flex items-center gap-2">
              <Package size={16} className="text-red-500" /> Low Stock Inventory Alerts
            </h3>
            <span className="text-[11px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-md uppercase tracking-wide">
              {inventory.filter(i => i.quantity <= i.minStock).length} Items Critical
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
            {inventory.filter(i => i.quantity <= i.minStock).slice(0, 3).map(item => (
              <div key={item.id} className="bg-white border border-red-100 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[13px] font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-[15px] font-bold text-red-600">{item.quantity}</p>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span className="uppercase tracking-wide">{item.category}</span>
                  <span>Min: {item.minStock}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Recent Activity</h3>
            <button onClick={() => onNavigate('jobs')} className="text-[11px] font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {jobs.slice(0, 5).map((job) => {
              const statusStyle = jobStatusColors[job.status] || 'border-gray-300 text-gray-700 bg-gray-50';
              const statusBorder = statusStyle.split(' ')[0];
              const statusBadge = statusStyle.split(' ').slice(1).join(' ');

              return (
                <div key={job.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${statusBorder}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                    <p className="text-[11px] font-normal text-gray-500 mt-1">{new Date(job.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-[11px] font-medium ${statusBadge}`}>
                    {job.status}
                  </div>
                  <span className="text-[13px] font-medium text-gray-900">₹{job.estimatedCost.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Engineer Performance */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Fleet Efficiency</h3>
            <button onClick={() => setActiveModal('engineers')} className="text-[11px] font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
              Full Roster <ChevronRight size={16} />
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {engineers.map((eng) => {
              const engJobs = jobs.filter(j => j.assignedEngineerId === eng.id);
              const completed = engJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length;
              const active = engJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status)).length;
              const pct = engJobs.length > 0 ? Math.round((completed / engJobs.length) * 100) : 0;
              return (
                <div key={eng.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors border-l-4 ${eng.active ? 'border-green-500' : 'border-gray-300'}`}>
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium text-[13px] shrink-0">
                    {eng.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[13px] font-medium text-gray-900">{eng.name}</p>
                      <span className="text-[11px] font-medium text-gray-900">{pct}% Score</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-cyan-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-[11px] font-normal text-gray-500">{active} active • {completed} completed</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[11px] font-medium shrink-0 ${eng.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {eng.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Detail Drawer Modal */}
      {activeModal && (
        <DetailModal
          type={activeModal}
          onClose={() => setActiveModal(null)}
          jobs={jobs}
          users={users}
          customers={customers}
          partRequests={partRequests}
          sales={sales}
        />
      )}
    </div>
  );
};


export const UserManagement: React.FC = () => {
  const { users, addUser, toggleUserActive, updateUser, deleteUser, currentUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<null | typeof users[0]>(null);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);
  const { toast, show } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'engineer' as Role });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'engineer' as Role, password: '' });

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) { show('Fill all fields', 'error'); return; }
    if (form.password.length < 6) { show('Password must be at least 6 characters', 'error'); return; }
    const result = await addUser({ ...form, active: true, joinedAt: new Date().toISOString().split('T')[0] });
    if (result.ok) {
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'engineer' });
      show('User created successfully!');
    } else {
      show(result.error ?? 'Failed to create user', 'error');
    }
  };

  const openEdit = (user: typeof users[0]) => {
    setEditUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role, password: '' });
  };

  const handleEdit = async () => {
    if (!editUser) return;
    if (!editForm.name || !editForm.email) { show('Name and email are required', 'error'); return; }
    const payload: any = { name: editForm.name, email: editForm.email, role: editForm.role };
    if (editForm.password) payload.password = editForm.password;
    const result = await updateUser(editUser.id, payload);
    if (result.ok) {
      setEditUser(null);
      show('User updated successfully!', 'success');
    } else {
      show(result.error ?? 'Failed to update user', 'error');
    }
  };

  const handleDelete = async (userId: string) => {
    const result = await deleteUser(userId);
    setShowDeleteId(null);
    if (result.ok) {
      show('User deleted successfully!', 'success');
    } else {
      show(result.error ?? 'Failed to delete user', 'error');
    }
  };

  const roleColors: Record<string, string> = {
    admin:     'bg-teal-100 text-teal-700',
    reception: 'bg-pink-100 text-pink-700',
    engineer:  'bg-blue-100 text-blue-700',
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader 
        title="Access Control" 
        subtitle={`${users.length} registered system identities`} 
        action={<GlowButton icon={UserPlus} text="Deploy New User" variant="vivid" onClick={() => setShowModal(true)} />}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Identity', 'Clearance', 'Contact', 'Enrolled', 'Status', 'Access', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                  <td className={`px-6 py-4 border-l-4 ${user.active ? 'border-green-500' : 'border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-[13px] ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium text-[13px] text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-medium ${roleColors[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-normal text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 text-[11px] font-normal text-gray-500">{new Date(user.joinedAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 px-2 py-1 rounded text-[11px] font-medium ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {user.active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Toggle checked={user.active} onChange={async () => {
                      if (currentUser?.id === user.id) { show('You cannot deactivate your own account', 'error'); return; }
                      const result = await toggleUserActive(user.id);
                      if (result.ok) {
                        show(`${user.name} ${user.active ? 'deactivated' : 'activated'}`, user.active ? 'error' : 'success');
                      } else {
                        show(result.error ?? 'Failed to update user status', 'error');
                      }
                    }} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                        title="Edit user"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (currentUser?.id === user.id) { show('You cannot delete your own account', 'error'); return; }
                          setShowDeleteId(user.id);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentUser?.id === user.id ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                        title={currentUser?.id === user.id ? 'Cannot delete your own account' : 'Delete user'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Deploy User</h2>
                <p className="text-[13px] font-normal text-teal-500 mt-1">Generate new credentials</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Sharma"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@fixhub.com"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors">
                  <option value="engineer">Engineer</option>
                  <option value="reception">Reception/Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <GlowButton text="Create User" variant="vivid" onClick={handleAdd} className="flex-1" />
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Edit User</h2>
                <p className="text-[13px] font-normal text-teal-500 mt-1">Update credentials for {editUser.name}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Full Name *</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Email *</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">New Password <span className="text-gray-400 normal-case font-normal">(leave blank to keep current)</span></label>
                <input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Role *</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors">
                  <option value="engineer">Engineer</option>
                  <option value="reception">Reception/Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <GlowButton text="Save Changes" variant="vivid" onClick={handleEdit} className="flex-1" />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl border border-gray-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h2 className="text-[18px] font-medium text-gray-900 mb-2">Delete User?</h2>
            <p className="text-[13px] font-normal text-gray-500 mb-6">
              This action cannot be undone. The user account will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteId(null)} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(showDeleteId)} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
};