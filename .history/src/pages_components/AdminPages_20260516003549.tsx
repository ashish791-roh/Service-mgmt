import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Toggle, Toast, useToast } from '../components/ui';
import type { Role } from '../types';
import { Wrench, CheckCircle, Banknote, Hourglass, Users, UserPlus, ChevronRight, Package, X, Pencil, Trash2, Shield, Search, Filter, ChevronLeft, Download, RefreshCw, Clock, User, Database, AlertCircle, CalendarDays, TrendingUp, Activity } from 'lucide-react';

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
  type, onClose, jobs, users, customers, partRequests, inventory, sales
}: {
  type: ModalType;
  onClose: () => void;
  jobs: any[];
  users: any[];
  customers: any[];
  partRequests: any[];
  inventory: any[];
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
    clients:   { title: 'Client Database',          subtitle: 'Registered customers',        accentColor: 'text-teal-600' },
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

    // CLIENT DATABASE
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
      const pendingParts = partRequests.filter((r: any) => r.status === 'Pending' || r.status === 'AwaitingStock');
      const allParts = partRequests;
      return (
        <>
          <div className="flex divide-x divide-gray-100 border-b border-gray-100">
            {[
              { label: 'Pending',        count: allParts.filter((r: any) => r.status === 'Pending').length,        cls: 'text-orange-600' },
              { label: 'Awaiting Stock', count: allParts.filter((r: any) => r.status === 'AwaitingStock').length,  cls: 'text-purple-600' },
              { label: 'Approved',       count: allParts.filter((r: any) => r.status === 'Approved').length,       cls: 'text-green-600' },
              { label: 'Rejected',       count: allParts.filter((r: any) => r.status === 'Rejected').length,       cls: 'text-red-500' },
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
              const isAwaiting = r.status === 'AwaitingStock';
              // Determine inventory status for alert
              const invStatus: string = r.inventoryStatus ?? (() => {
                const item = inventory.find((i: any) => i.name.toLowerCase() === r.partName.toLowerCase());
                if (!item) return 'not_found';
                if (item.quantity <= 0) return 'out_of_stock';
                if (item.quantity < (item.minStock ?? 5) || item.quantity < r.quantity) return 'low_stock';
                return 'available';
              })();
              return (
                <div key={r.id} className={`flex items-start gap-4 px-6 py-4 border-l-4 hover:bg-gray-50 transition-colors ${isAwaiting ? 'border-purple-400 bg-purple-50/40' : 'border-orange-400'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900">{r.partName}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Qty: {r.quantity} · {eng?.name ?? 'Unknown Engineer'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">Reason: {r.reason}</p>
                    {job && <p className="text-[11px] text-teal-600 mt-0.5 truncate">Job: {job.problemDescription}</p>}
                    {/* ── Inventory alert ── */}
                    {isAwaiting && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-700">
                        ⏳ Waiting for stock — auto-releases when restocked
                      </span>
                    )}
                    {!isAwaiting && invStatus === 'out_of_stock' && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-100 text-rose-700">
                        ⚠ Out of stock
                      </span>
                    )}
                    {!isAwaiting && invStatus === 'low_stock' && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-700">
                        ⚠ Low stock{r.inventoryQuantity !== undefined ? ` (${r.inventoryQuantity} available)` : ''}
                      </span>
                    )}
                    {!isAwaiting && invStatus === 'not_found' && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500">
                        ℹ Not in inventory
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${isAwaiting ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                    {isAwaiting ? 'Awaiting Stock' : 'Pending'}
                  </span>
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

// ── DayWiseActivity ───────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DayWiseActivity: React.FC<{ jobs: any[]; sales: any[] }> = ({ jobs, sales }) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a map: dateStr → { jobs, revenue }
  const activityMap = React.useMemo(() => {
    const map: Record<string, { jobs: any[]; revenue: number; sales: any[] }> = {};
    for (const job of jobs) {
      const d = job.createdAt.slice(0, 10);
      if (!map[d]) map[d] = { jobs: [], revenue: 0, sales: [] };
      map[d].jobs.push(job);
      map[d].revenue += job.actualCost ?? job.estimatedCost;
    }
    for (const sale of sales) {
      const d = sale.createdAt.slice(0, 10);
      if (!map[d]) map[d] = { jobs: [], revenue: 0, sales: [] };
      map[d].sales.push(sale);
      map[d].revenue += sale.totalAmount;
    }
    return map;
  }, [jobs, sales]);

  // Generate the days to show
  const days = React.useMemo(() => {
    const result: Date[] = [];
    if (viewMode === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        result.push(d);
      }
    } else {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        result.push(d);
      }
    }
    return result;
  }, [viewMode]);

  const toKey = (d: Date) => d.toISOString().slice(0, 10);

  const maxJobs = Math.max(1, ...days.map(d => (activityMap[toKey(d)]?.jobs.length ?? 0)));

  const selectedData = selectedDate ? activityMap[selectedDate] : null;
  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;

  // Period summary numbers — always based on the currently visible days
  const periodLabel = viewMode === 'week' ? 'This Week' : 'This Month';
  const periodJobs = days.reduce((s, d) => s + (activityMap[toKey(d)]?.jobs.length ?? 0), 0);
  const periodRevenue = days.reduce((s, d) => s + (activityMap[toKey(d)]?.revenue ?? 0), 0);
  const periodSales = days.reduce((s, d) => s + (activityMap[toKey(d)]?.sales.length ?? 0), 0);

  return (
    <Card>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-teal-500" />
          <h3 className="text-[13px] font-medium text-gray-900">Date & Day-wise Activity</h3>
          <span className="text-[11px] font-medium bg-teal-100 text-teal-700 px-2 py-0.5 rounded-md uppercase tracking-wide ml-1">
            {today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
          {(['week', 'month'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setViewMode(m); setSelectedDate(null); }}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                viewMode === m ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {m === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Period quick stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 text-center">
            <p className="text-[22px] font-bold text-cyan-700">{periodJobs}</p>
            <p className="text-[11px] font-medium text-cyan-600 uppercase tracking-wide mt-0.5">Jobs {periodLabel}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
            <p className="text-[22px] font-bold text-green-700">₹{(periodRevenue / 1000).toFixed(1)}k</p>
            <p className="text-[11px] font-medium text-green-600 uppercase tracking-wide mt-0.5">Revenue {periodLabel}</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
            <p className="text-[22px] font-bold text-purple-700">{periodSales}</p>
            <p className="text-[11px] font-medium text-purple-600 uppercase tracking-wide mt-0.5">Sales {periodLabel}</p>
          </div>
        </div>

        {/* Bar chart — day by day */}
        <div>
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">Jobs per Day</p>
          <div className={`grid gap-2 ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-10 sm:grid-cols-15'}`}
            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
          >
            {days.map((d) => {
              const key = toKey(d);
              const data = activityMap[key];
              const count = data?.jobs.length ?? 0;
              const isToday = key === toKey(today);
              const isSelected = key === selectedDate;
              const heightPct = count === 0 ? 8 : Math.max(16, Math.round((count / maxJobs) * 80));
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(isSelected ? null : key)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isSelected
                          ? 'bg-teal-600'
                          : isToday
                          ? 'bg-teal-400'
                          : count === 0
                          ? 'bg-gray-100'
                          : 'bg-cyan-200 group-hover:bg-cyan-300'
                      }`}
                      style={{ height: heightPct }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? 'text-teal-600' : 'text-gray-400'}`}>
                    {viewMode === 'week' ? DAY_NAMES[d.getDay()] : d.getDate()}
                  </span>
                  {viewMode === 'week' && (
                    <span className={`text-[9px] ${isToday ? 'text-teal-500 font-semibold' : 'text-gray-300'}`}>
                      {d.getDate()} {MONTH_NAMES[d.getMonth()]}
                    </span>
                  )}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-teal-600' : 'text-gray-600'}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Click any bar to see day details</p>
        </div>

        {/* Selected Day Detail */}
        {selectedDate && selectedDateObj && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-teal-900">
                  {selectedDateObj.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-[12px] text-teal-600 mt-0.5">
                  {(selectedData?.jobs.length ?? 0)} jobs · ₹{((selectedData?.revenue ?? 0)).toLocaleString()} revenue · {(selectedData?.sales.length ?? 0)} sales
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="text-teal-400 hover:text-teal-700">
                <X size={16} />
              </button>
            </div>

            {/* Jobs on this day */}
            {selectedData && selectedData.jobs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-teal-700 uppercase tracking-wide">Jobs</p>
                {selectedData.jobs.slice(0, 5).map((job: any) => (
                  <div key={job.id} className="bg-white border border-teal-100 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wide">
                        {job.status} · {new Date(job.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 shrink-0">₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}</span>
                  </div>
                ))}
                {selectedData.jobs.length > 5 && (
                  <p className="text-[12px] text-teal-600 font-medium text-center">+{selectedData.jobs.length - 5} more jobs</p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-teal-600 text-center py-2">No jobs on this day.</p>
            )}

            {/* Sales on this day */}
            {selectedData && selectedData.sales.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-purple-700 uppercase tracking-wide">Product Sales</p>
                {selectedData.sales.slice(0, 3).map((sale: any) => (
                  <div key={sale.id} className="bg-white border border-purple-100 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{sale.companyName || sale.contactName}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wide">
                        #{sale.saleNumber} · {sale.items?.length ?? 0} items
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 shrink-0">₹{sale.totalAmount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// ── AdminDashboard ────────────────────────────────────────────────────────────
export const AdminDashboard: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const { jobs, users, customers, partRequests, inventory, sales } = useApp();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const engineers = users.filter(u => u.role === 'engineer');
  const activeEngineers = engineers.filter(u => u.active);
  const pendingParts = partRequests.filter(r => r.status === 'Pending' || r.status === 'AwaitingStock');

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

      {/* KPI Cards — all 5 in one unified responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard title="Total Completed"   value={jobStats.completed}                                                                                                                                                                                      icon={CheckCircle} color="green"  sub="Success"       onClick={() => setActiveModal('completed')} />
        <MetricCard title="Pending Queue"     value={jobStats.pending}                                                                                                                                                                                        icon={Hourglass}   color="orange" sub="Active"        onClick={() => setActiveModal('pending')} />
        <MetricCard title="Active Engineers"  value={`${activeEngineers.length}/${engineers.length}`}                                                                                                                                                         icon={Users}       color="teal"   sub="On Roster"    onClick={() => setActiveModal('engineers')} />
        <MetricCard title="Pending Parts"     value={pendingParts.length}                                                                                                                                                                                     icon={Package}     color="orange" sub={pendingParts.length > 0 ? "Action Needed" : "All Clear"} onClick={() => setActiveModal('parts')} />
        <MetricCard title="Est. Total Revenue" value={`₹${((jobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0) + sales.reduce((s, sale) => s + sale.totalAmount, 0)) / 1000).toFixed(1)}k`} icon={Banknote} color="green" sub="All Time"   onClick={() => setActiveModal('revenue')} />
      </div>

      {/* Date & Day-wise Activity */}
      <DayWiseActivity jobs={jobs} sales={sales} />

      {inventory && inventory.filter(i => i.quantity <= i.minStock).length > 0 && (        <Card className="bg-red-50 border-red-200">
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
          inventory={inventory}
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
// ═══════════════════════════════════════════════════════════════════════════
// Audit Log Page — full system audit trail (admin-only)
// ═══════════════════════════════════════════════════════════════════════════

interface AuditLogRow {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string | null;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  meta: string | null;
}

const ENTITY_COLORS: Record<string, string> = {
  job:         'bg-blue-100 text-blue-700',
  customer:    'bg-teal-100 text-teal-700',
  payment:     'bg-green-100 text-green-700',
  user:        'bg-purple-100 text-purple-700',
  inventory:   'bg-orange-100 text-orange-700',
  partRequest: 'bg-yellow-100 text-yellow-700',
};

const ACTION_COLORS: Record<string, string> = {
  create:  'bg-emerald-100 text-emerald-700',
  update:  'bg-sky-100 text-sky-700',
  delete:  'bg-red-100 text-red-700',
  approve: 'bg-green-100 text-green-700',
  reject:  'bg-rose-100 text-rose-700',
};

const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-amber-100 text-amber-700',
  reception: 'bg-teal-100 text-teal-700',
  engineer:  'bg-cyan-100 text-cyan-700',
};

function auditBadge(map: Record<string, string>, value: string, fallback = 'bg-gray-100 text-gray-600') {
  const cls = map[value] ?? fallback;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {value}
    </span>
  );
}

function formatValue(raw: string | null): string {
  if (raw === null || raw === undefined) return '—';
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return JSON.stringify(parsed, null, 1);
    return String(parsed);
  } catch {
    return raw;
  }
}

function formatTs(ts: string): { date: string; time: string } {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
  };
}

function exportToCsv(rows: AuditLogRow[]) {
  const headers = ['Timestamp','User','Role','Action','Entity','EntityId','Field','OldValue','NewValue','Meta'];
  const escape = (v: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      escape(r.timestamp),
      escape(r.userName),
      escape(r.userRole),
      escape(r.action),
      escape(r.entity),
      escape(r.entityId),
      escape(r.field),
      escape(r.oldValue),
      escape(r.newValue),
      escape(r.meta),
    ].join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const AuditLogPage: React.FC = () => {
  const PAGE_SIZE = 50;

  const [rows, setRows]         = useState<AuditLogRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters
  const [search,   setSearch]   = useState('');
  const [entity,   setEntity]   = useState('');
  const [action,   setAction]   = useState('');
  const [userRole, setUserRole] = useState('');
  const [from,     setFrom]     = useState('');
  const [to,       setTo]       = useState('');

  const fetchLogs = React.useCallback(async (pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit',  String(PAGE_SIZE));
      params.set('offset', String(pg * PAGE_SIZE));
      if (search)   params.set('search', search);
      if (entity)   params.set('entity', entity);
      if (action)   params.set('action', action);
      if (from)     params.set('from', new Date(from).toISOString());
      if (to)       params.set('to', new Date(to + 'T23:59:59').toISOString());

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load');
      const data = await res.json();

      // client-side role filter (not exposed as server param)
      let filtered: AuditLogRow[] = data.rows;
      if (userRole) filtered = filtered.filter((r: AuditLogRow) => r.userRole === userRole);

      setRows(filtered);
      setTotal(data.total);
      setOffset(pg * PAGE_SIZE);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [search, entity, action, userRole, from, to]);

  React.useEffect(() => { fetchLogs(0); }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE);

  const handleApply = () => fetchLogs(0);
  const handleReset = () => {
    setSearch(''); setEntity(''); setAction(''); setUserRole(''); setFrom(''); setTo('');
    setTimeout(() => fetchLogs(0), 0);
  };

  const inputCls = "bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-teal-500 transition-colors";
  const selectCls = inputCls;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-amber-500" />
            <h1 className="text-[18px] font-medium text-gray-900">System Audit Log</h1>
          </div>
          <p className="text-[12px] text-gray-500">Immutable record of every write action — who changed what, from what value to what value, and when.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] text-gray-400 font-medium">{total.toLocaleString()} entries</span>
          <button
            onClick={() => exportToCsv(rows)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={() => fetchLogs(currentPage)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-[12px] font-medium hover:bg-teal-700 transition-colors"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-gray-400" />
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className={`${inputCls} pl-8 w-full`}
              placeholder="Search user, entity, value…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApply()}
            />
          </div>
          {/* Entity */}
          <select className={`${selectCls} w-full`} value={entity} onChange={e => setEntity(e.target.value)}>
            <option value="">All entities</option>
            {['job','customer','payment','user','inventory','partRequest'].map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          {/* Action */}
          <select className={`${selectCls} w-full`} value={action} onChange={e => setAction(e.target.value)}>
            <option value="">All actions</option>
            {['create','update','delete','approve','reject'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {/* Role */}
          <select className={`${selectCls} w-full`} value={userRole} onChange={e => setUserRole(e.target.value)}>
            <option value="">All roles</option>
            {['admin','reception','engineer'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {/* From */}
          <input type="date" className={`${inputCls} w-full`} value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
          {/* To */}
          <input type="date" className={`${inputCls} w-full`} value={to} onChange={e => setTo(e.target.value)} />
          <div className="flex gap-2 col-span-1">
            <button
              onClick={handleApply}
              className="flex-1 px-3 py-2 rounded-lg bg-teal-600 text-white text-[12px] font-medium hover:bg-teal-700 transition-colors"
            >Apply</button>
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >Reset</button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl px-4 py-3">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <RefreshCw size={28} className="animate-spin opacity-50" />
            <p className="text-[13px]">Loading audit entries…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Database size={36} className="opacity-30" />
            <p className="text-[13px]">No audit entries match your filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Timestamp','Actor','Action','Entity','Entity ID','Field','Old Value','New Value'].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const { date, time } = formatTs(row.timestamp);
                    const isExp = expanded === row.id;
                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${isExp ? 'bg-amber-50/40' : ''}`}
                          onClick={() => setExpanded(isExp ? null : row.id)}
                        >
                          {/* Timestamp */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} className="text-gray-400 shrink-0" />
                              <div>
                                <div className="text-[12px] font-medium text-gray-700">{time}</div>
                                <div className="text-[10px] text-gray-400">{date}</div>
                              </div>
                            </div>
                          </td>
                          {/* Actor */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <User size={11} className="text-gray-400 shrink-0" />
                              <div>
                                <div className="text-[12px] font-medium text-gray-800 max-w-[120px] truncate">{row.userName}</div>
                                <div className="mt-0.5">{auditBadge(ROLE_COLORS, row.userRole)}</div>
                              </div>
                            </div>
                          </td>
                          {/* Action */}
                          <td className="px-4 py-3">{auditBadge(ACTION_COLORS, row.action)}</td>
                          {/* Entity */}
                          <td className="px-4 py-3">{auditBadge(ENTITY_COLORS, row.entity)}</td>
                          {/* Entity ID */}
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-gray-500 font-mono max-w-[80px] truncate block" title={row.entityId ?? ''}>
                              {row.entityId ? row.entityId.slice(0, 8) + '…' : '—'}
                            </span>
                          </td>
                          {/* Field */}
                          <td className="px-4 py-3">
                            <span className="text-[12px] font-medium text-gray-700">{row.field ?? '—'}</span>
                          </td>
                          {/* Old Value */}
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-red-600 bg-red-50 rounded px-1.5 py-0.5 font-mono max-w-[120px] truncate block" title={formatValue(row.oldValue)}>
                              {row.oldValue !== null ? formatValue(row.oldValue).slice(0, 40) : '—'}
                            </span>
                          </td>
                          {/* New Value */}
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-green-700 bg-green-50 rounded px-1.5 py-0.5 font-mono max-w-[120px] truncate block" title={formatValue(row.newValue)}>
                              {row.newValue !== null ? formatValue(row.newValue).slice(0, 40) : '—'}
                            </span>
                          </td>
                          {/* Expand */}
                          <td className="px-4 py-3">
                            <ChevronRight size={14} className={`text-gray-400 transition-transform ${isExp ? 'rotate-90' : ''}`} />
                          </td>
                        </tr>
                        {/* Expanded detail row */}
                        {isExp && (
                          <tr className="bg-amber-50/30 border-b border-amber-100">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[12px]">
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Entity ID</p>
                                  <p className="font-mono text-gray-700 break-all">{row.entityId ?? '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Old Value</p>
                                  <pre className="font-mono text-red-700 bg-red-50 rounded p-2 text-[11px] whitespace-pre-wrap break-all max-h-32 overflow-auto">{formatValue(row.oldValue)}</pre>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Full New Value</p>
                                  <pre className="font-mono text-green-700 bg-green-50 rounded p-2 text-[11px] whitespace-pre-wrap break-all max-h-32 overflow-auto">{formatValue(row.newValue)}</pre>
                                </div>
                                {row.meta && (
                                  <div className="sm:col-span-3">
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Metadata</p>
                                    <pre className="font-mono text-gray-600 bg-gray-100 rounded p-2 text-[11px] whitespace-pre-wrap break-all max-h-32 overflow-auto">{formatValue(row.meta)}</pre>
                                  </div>
                                )}
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Actor ID</p>
                                  <p className="font-mono text-gray-600 break-all">{row.userId}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Timestamp (UTC)</p>
                                  <p className="font-mono text-gray-600">{row.timestamp}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {rows.map(row => {
                const { date, time } = formatTs(row.timestamp);
                const isExp = expanded === row.id;
                return (
                  <div
                    key={row.id}
                    className={`p-4 cursor-pointer transition-colors ${isExp ? 'bg-amber-50/40' : 'hover:bg-gray-50'}`}
                    onClick={() => setExpanded(isExp ? null : row.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {auditBadge(ACTION_COLORS, row.action)}
                        {auditBadge(ENTITY_COLORS, row.entity)}
                        {auditBadge(ROLE_COLORS, row.userRole)}
                      </div>
                      <ChevronRight size={14} className={`text-gray-400 transition-transform shrink-0 mt-0.5 ${isExp ? 'rotate-90' : ''}`} />
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-gray-600 mb-1">
                      <span className="font-medium">{row.userName}</span>
                      {row.field && <span className="text-gray-400">· <span className="font-mono text-gray-700">{row.field}</span></span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <Clock size={10} />{date} {time}
                    </div>
                    {isExp && (
                      <div className="mt-3 space-y-2 text-[11px]">
                        {row.field && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-gray-400 mb-0.5 uppercase text-[9px] tracking-wider">Old</p>
                              <pre className="font-mono text-red-700 bg-red-50 rounded p-1.5 whitespace-pre-wrap break-all">{formatValue(row.oldValue)}</pre>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-0.5 uppercase text-[9px] tracking-wider">New</p>
                              <pre className="font-mono text-green-700 bg-green-50 rounded p-1.5 whitespace-pre-wrap break-all">{formatValue(row.newValue)}</pre>
                            </div>
                          </div>
                        )}
                        {row.meta && (
                          <div>
                            <p className="text-gray-400 mb-0.5 uppercase text-[9px] tracking-wider">Meta</p>
                            <pre className="font-mono text-gray-600 bg-gray-100 rounded p-1.5 whitespace-pre-wrap break-all">{formatValue(row.meta)}</pre>
                          </div>
                        )}
                        <p className="font-mono text-gray-400 text-[10px]">ID: {row.entityId ?? '—'}</p>
                        <p className="font-mono text-gray-400 text-[10px]">{row.timestamp}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-[12px] text-gray-500">
            Showing <span className="font-medium text-gray-800">{offset + 1}–{Math.min(offset + rows.length, total)}</span> of <span className="font-medium text-gray-800">{total.toLocaleString()}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 0}
              onClick={() => fetchLogs(currentPage - 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="text-[12px] text-gray-500 px-1">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages - 1}
              onClick={() => fetchLogs(currentPage + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};