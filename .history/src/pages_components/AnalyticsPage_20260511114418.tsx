import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wrench, CheckCircle, Banknote, Users, Activity, Target, X, ChevronRight } from 'lucide-react';

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Card = ({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${onClick ? 'cursor-pointer hover:border-teal-300 hover:shadow-md transition-all' : ''} ${className}`}
  >
    {children}
  </div>
);

const MetricCard = ({ title, value, icon: Icon, color, sub, onClick }: any) => {
  const colorMap: Record<string, string> = {
    teal: 'text-teal-500 bg-teal-50',
    cyan: 'text-cyan-500 bg-cyan-50',
    green: 'text-green-500 bg-green-50',
    orange: 'text-orange-500 bg-orange-50',
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

// ── Types ─────────────────────────────────────────────────────────────────────
type ModalType =
  | 'revenue'
  | 'volume'
  | 'clients'
  | 'parts'
  | 'workflow'
  | 'keymetrics'
  | 'leaderboard'
  | 'devices'
  | null;

// ── Detail Drawer ─────────────────────────────────────────────────────────────
const DetailModal = ({
  type, onClose, jobs, users, customers, partRequests, devices,
}: {
  type: ModalType;
  onClose: () => void;
  jobs: any[];
  users: any[];
  customers: any[];
  partRequests: any[];
  devices: any[];
}) => {
  if (!type) return null;

  const engineers = users.filter((u: any) => u.role === 'engineer');

  const statusColors: Record<string, string> = {
    'New': 'border-cyan-400 text-cyan-700 bg-cyan-50',
    'Assigned': 'border-teal-400 text-teal-700 bg-teal-50',
    'In Progress': 'border-orange-400 text-orange-700 bg-orange-50',
    'Completed': 'border-green-400 text-green-700 bg-green-50',
    'Delivered': 'border-green-400 text-green-700 bg-green-50',
  };

  const statusBarColors: Record<string, string> = {
    'New': 'bg-cyan-200',
    'Assigned': 'bg-teal-400',
    'In Progress': 'bg-orange-400',
    'Completed': 'bg-green-500',
    'Delivered': 'bg-teal-600',
  };

  const configs: Record<NonNullable<ModalType>, { title: string; subtitle: string; accentColor: string }> = {
    revenue:     { title: 'Revenue Breakdown',       subtitle: 'Earnings from completed jobs',         accentColor: 'text-green-600' },
    volume:      { title: 'Job Volume Detail',        subtitle: 'All jobs across all statuses',         accentColor: 'text-cyan-600' },
    clients:     { title: 'Client Directory',         subtitle: 'All registered customers',             accentColor: 'text-teal-600' },
    parts:       { title: 'Parts Requests',           subtitle: 'Approved, pending & rejected',         accentColor: 'text-orange-600' },
    workflow:    { title: 'Workflow Distribution',    subtitle: 'Jobs broken down by status',           accentColor: 'text-teal-600' },
    keymetrics:  { title: 'Key Metrics Detail',       subtitle: 'Detailed performance indicators',      accentColor: 'text-cyan-600' },
    leaderboard: { title: 'Engineer Leaderboard',     subtitle: 'Performance & completion stats',       accentColor: 'text-teal-600' },
    devices:     { title: 'Hardware Distribution',   subtitle: 'All registered devices by type',       accentColor: 'text-orange-600' },
  };

  const cfg = configs[type];

  const renderContent = () => {

    // ── REVENUE ───────────────────────────────────────────────────
    if (type === 'revenue') {
      const completed = jobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status));
      const totalRevenue = completed.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
      const pendingRevenue = jobs
        .filter((j: any) => ['New', 'Assigned', 'In Progress'].includes(j.status))
        .reduce((s: number, j: any) => s + j.estimatedCost, 0);
      const avgTicket = completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0;

      const byEngineer = engineers.map((eng: any) => {
        const engCompleted = completed.filter((j: any) => j.assignedEngineerId === eng.id);
        return { name: eng.name, count: engCompleted.length, revenue: engCompleted.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0) };
      }).sort((a: any, b: any) => b.revenue - a.revenue);
      const maxRev = byEngineer[0]?.revenue || 1;

      return (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-gray-100 border-b border-gray-100">
            {[
              { label: 'Collected', value: `₹${(totalRevenue / 1000).toFixed(1)}k`, cls: 'text-green-600' },
              { label: 'Pending', value: `₹${(pendingRevenue / 1000).toFixed(1)}k`, cls: 'text-orange-500' },
              { label: 'Avg Ticket', value: `₹${avgTicket.toLocaleString()}`, cls: 'text-teal-600' },
            ].map(s => (
              <div key={s.label} className="px-6 py-4 text-center">
                <p className={`text-[20px] font-medium ${s.cls}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* By engineer */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Revenue by Engineer</p>
          </div>
          <div className="divide-y divide-gray-100">
            {byEngineer.map((eng: any) => (
              <div key={eng.name} className="flex items-center gap-4 px-6 py-4">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-[13px] shrink-0">
                  {eng.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <p className="text-[12px] font-medium text-gray-900 truncate">{eng.name}</p>
                    <p className="text-[12px] font-medium text-gray-700 shrink-0">₹{eng.revenue.toLocaleString()}</p>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.round((eng.revenue / maxRev) * 100)}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{eng.count} job{eng.count !== 1 ? 's' : ''} completed</p>
                </div>
              </div>
            ))}
            {byEngineer.length === 0 && <p className="px-6 py-6 text-[13px] text-gray-400 text-center">No revenue data yet.</p>}
          </div>

          {/* Job list */}
          <div className="px-6 py-3 bg-gray-50 border-t border-b border-gray-100">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">All Billed Jobs</p>
          </div>
          <div className="divide-y divide-gray-100">
            {completed.map((j: any) => {
              const customer = customers.find((c: any) => c.id === j.customerId);
              const engineer = engineers.find((e: any) => e.id === j.assignedEngineerId);
              return (
                <div key={j.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors border-l-4 border-green-400">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-900 truncate">{j.problemDescription}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{customer?.name ?? 'Unknown'} · {engineer?.name ?? 'Unknown'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-medium text-green-700">₹{(j.actualCost ?? j.estimatedCost).toLocaleString()}</p>
                    <p className="text-[11px] text-gray-400">{new Date(j.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              );
            })}
            {completed.length === 0 && <p className="px-6 py-6 text-[13px] text-gray-400 text-center">No billed jobs yet.</p>}
          </div>
        </>
      );
    }

    // ── VOLUME ────────────────────────────────────────────────────
    if (type === 'volume') {
      const statuses = ['New', 'Assigned', 'In Progress', 'Completed', 'Delivered'];
      return (
        <>
          <div className="flex divide-x divide-gray-100 border-b border-gray-100 flex-wrap">
            {statuses.map(s => {
              const count = jobs.filter((j: any) => j.status === s).length;
              return (
                <div key={s} className="flex-1 min-w-[80px] px-4 py-4 text-center">
                  <p className="text-[18px] font-medium text-gray-900">{count}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{s}</p>
                </div>
              );
            })}
          </div>
          <div className="divide-y divide-gray-100">
            {jobs.map((j: any) => {
              const customer = customers.find((c: any) => c.id === j.customerId);
              const engineer = engineers.find((e: any) => e.id === j.assignedEngineerId);
              const style = statusColors[j.status] || 'border-gray-300 text-gray-700 bg-gray-50';
              const borderCls = style.split(' ')[0];
              const badgeCls = style.split(' ').slice(1).join(' ');
              const daysOld = Math.floor((Date.now() - new Date(j.createdAt).getTime()) / 86400000);
              return (
                <div key={j.id} className={`flex flex-col gap-1.5 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-medium text-gray-900 truncate flex-1">{j.problemDescription}</p>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${badgeCls}`}>{j.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                    <span>{customer?.name ?? 'Unknown'}</span>
                    <span>·</span>
                    <span>{engineer?.name ?? <span className="text-orange-500">Unassigned</span>}</span>
                    <span>·</span>
                    <span className={daysOld > 10 ? 'text-red-500 font-medium' : daysOld > 5 ? 'text-yellow-600' : 'text-gray-500'}>{daysOld}d ago</span>
                    <span>·</span>
                    <span className="font-medium text-gray-700">₹{j.estimatedCost.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
            {jobs.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No jobs yet.</p>}
          </div>
        </>
      );
    }

    // ── CLIENTS ───────────────────────────────────────────────────
    if (type === 'clients') {
      const sorted = [...customers].sort((a: any, b: any) => {
        const aj = jobs.filter((j: any) => j.customerId === a.id).length;
        const bj = jobs.filter((j: any) => j.customerId === b.id).length;
        return bj - aj;
      });
      return (
        <>
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            <div className="px-6 py-4 text-center">
              <p className="text-[20px] font-medium text-teal-600">{customers.length}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Total Customers</p>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-[20px] font-medium text-orange-500">
                {customers.filter((c: any) => jobs.some((j: any) => j.customerId === c.id && ['New','Assigned','In Progress'].includes(j.status))).length}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">With Active Jobs</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {sorted.map((c: any) => {
              const clientJobs = jobs.filter((j: any) => j.customerId === c.id);
              const active = clientJobs.filter((j: any) => ['New', 'Assigned', 'In Progress'].includes(j.status)).length;
              const done = clientJobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status)).length;
              const spent = clientJobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status))
                .reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
              return (
                <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-[14px] shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{c.phone} · {c.address}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-[12px] font-medium text-gray-700">{clientJobs.length} job{clientJobs.length !== 1 ? 's' : ''}</p>
                    <p className="text-[11px] text-gray-400">
                      {active > 0 ? <span className="text-orange-500">{active} active</span> : ''}
                      {active > 0 && done > 0 ? ' · ' : ''}
                      {done > 0 ? <span className="text-green-600">{done} done</span> : ''}
                    </p>
                    {spent > 0 && <p className="text-[11px] font-medium text-green-700">₹{spent.toLocaleString()}</p>}
                  </div>
                </div>
              );
            })}
            {customers.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No customers yet.</p>}
          </div>
        </>
      );
    }

    // ── PARTS ─────────────────────────────────────────────────────
    if (type === 'parts') {
      const statuses = ['Pending', 'Approved', 'Rejected'] as const;
      const statusStyle: Record<string, string> = {
        Pending: 'border-orange-400 bg-orange-50 text-orange-700',
        Approved: 'border-green-400 bg-green-50 text-green-700',
        Rejected: 'border-red-400 bg-red-50 text-red-700',
      };
      return (
        <>
          <div className="flex divide-x divide-gray-100 border-b border-gray-100">
            {statuses.map(s => {
              const count = partRequests.filter((r: any) => r.status === s).length;
              const cls = s === 'Pending' ? 'text-orange-600' : s === 'Approved' ? 'text-green-600' : 'text-red-500';
              return (
                <div key={s} className="flex-1 px-6 py-4 text-center">
                  <p className={`text-[20px] font-medium ${cls}`}>{count}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{s}</p>
                </div>
              );
            })}
          </div>
          {statuses.map(s => {
            const filtered = partRequests.filter((r: any) => r.status === s);
            if (filtered.length === 0) return null;
            return (
              <div key={s}>
                <div className="px-6 py-2 bg-gray-50 border-y border-gray-100">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{s}</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {filtered.map((r: any) => {
                    const eng = engineers.find((e: any) => e.id === r.engineerId);
                    const job = jobs.find((j: any) => j.id === r.jobId);
                    const style = statusStyle[r.status] || '';
                    const borderCls = style.split(' ')[0];
                    const badgeCls = style.split(' ').slice(1).join(' ');
                    return (
                      <div key={r.id} className={`flex items-start gap-4 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-900">{r.partName}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">Qty: {r.quantity} · {eng?.name ?? 'Unknown'}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate">Reason: {r.reason}</p>
                          {job && <p className="text-[11px] text-teal-600 mt-0.5 truncate">Job: {job.problemDescription}</p>}
                          <p className="text-[10px] text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${badgeCls}`}>{r.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {partRequests.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No part requests yet.</p>}
        </>
      );
    }

    // ── WORKFLOW ──────────────────────────────────────────────────
    if (type === 'workflow') {
      const statuses = ['New', 'Assigned', 'In Progress', 'Completed', 'Delivered'];
      const statusBreakdown = statuses.map(s => ({
        status: s,
        count: jobs.filter((j: any) => j.status === s).length,
        pct: Math.round((jobs.filter((j: any) => j.status === s).length / Math.max(jobs.length, 1)) * 100),
        jobs: jobs.filter((j: any) => j.status === s),
      }));
      return (
        <>
          {/* Stacked bar */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5 bg-gray-100">
              {statusBreakdown.filter(s => s.count > 0).map(s => (
                <div key={s.status} style={{ width: `${s.pct}%` }}
                  className={`${statusBarColors[s.status]} flex items-center justify-center`}
                  title={`${s.status}: ${s.count}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {statusBreakdown.map(s => (
                <div key={s.status} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusBarColors[s.status]}`} />
                  <span className="text-[11px] font-medium text-gray-600">{s.status}: <strong className="text-gray-900">{s.count}</strong> ({s.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
          {/* Per-status job lists */}
          {statusBreakdown.map(s => {
            if (s.count === 0) return null;
            const style = statusColors[s.status] || 'border-gray-300 text-gray-700 bg-gray-50';
            const borderCls = style.split(' ')[0];
            return (
              <div key={s.status}>
                <div className="px-6 py-2 bg-gray-50 border-y border-gray-100 flex items-center justify-between">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{s.status}</p>
                  <span className="text-[11px] font-medium text-gray-700">{s.count} job{s.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {s.jobs.map((j: any) => {
                    const customer = customers.find((c: any) => c.id === j.customerId);
                    const engineer = engineers.find((e: any) => e.id === j.assignedEngineerId);
                    const daysOld = Math.floor((Date.now() - new Date(j.createdAt).getTime()) / 86400000);
                    return (
                      <div key={j.id} className={`flex items-center gap-4 px-6 py-3 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-gray-900 truncate">{j.problemDescription}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{customer?.name ?? 'Unknown'} · {engineer?.name ?? <span className="text-orange-500">Unassigned</span>}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-medium text-gray-700">₹{j.estimatedCost.toLocaleString()}</p>
                          <p className={`text-[10px] mt-0.5 ${daysOld > 10 ? 'text-red-500 font-medium' : daysOld > 5 ? 'text-yellow-600' : 'text-gray-400'}`}>{daysOld}d</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      );
    }

    // ── KEY METRICS ───────────────────────────────────────────────
    if (type === 'keymetrics') {
      const completedJobs = jobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status));
      const completionRate = jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0;
      const avgTicket = jobs.length > 0 ? Math.round(jobs.reduce((s: number, j: any) => s + j.estimatedCost, 0) / jobs.length) : 0;
      const partsApprovalRate = partRequests.length > 0 ? Math.round((partRequests.filter((r: any) => r.status === 'Approved').length / partRequests.length) * 100) : 0;
      const activeEngineers = engineers.filter((e: any) => e.active).length;

      // Avg repair time from all completed jobs
      const repairTimes = completedJobs
        .filter((j: any) => j.completedAt || j.updatedAt)
        .map((j: any) => {
          const end = j.completedAt ? new Date(j.completedAt).getTime() : new Date(j.updatedAt).getTime();
          return (end - new Date(j.createdAt).getTime()) / 86400000;
        });
      const avgRepairDays = repairTimes.length > 0 ? Math.round(repairTimes.reduce((a: number, b: number) => a + b, 0) / repairTimes.length) : 0;

      // Jobs created per month (last 6 months)
      const now = new Date();
      const monthly = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const month = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
        const count = jobs.filter((j: any) => {
          const jd = new Date(j.createdAt);
          return jd.getFullYear() === d.getFullYear() && jd.getMonth() === d.getMonth();
        }).length;
        return { month, count };
      });
      const maxMonthly = Math.max(...monthly.map(m => m.count), 1);

      return (
        <>
          {/* Metric rows */}
          <div className="divide-y divide-gray-100 border-b border-gray-100">
            {[
              { label: 'Completion Rate', value: `${completionRate}%`, sub: `${completedJobs.length} of ${jobs.length} jobs resolved`, barPct: completionRate, barColor: 'bg-green-500' },
              { label: 'Avg. Ticket Size', value: `₹${avgTicket.toLocaleString()}`, sub: `Across all ${jobs.length} jobs`, barPct: Math.min(Math.round((avgTicket / 10000) * 100), 100), barColor: 'bg-teal-500' },
              { label: 'Parts Approval Rate', value: `${partsApprovalRate}%`, sub: `${partRequests.filter((r: any) => r.status === 'Approved').length} of ${partRequests.length} requests`, barPct: partsApprovalRate, barColor: 'bg-cyan-500' },
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

          {/* Monthly bar chart */}
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
    }

    // ── LEADERBOARD ───────────────────────────────────────────────
    if (type === 'leaderboard') {
      const engineerStats = engineers.map((eng: any) => {
        const engJobs = jobs.filter((j: any) => j.assignedEngineerId === eng.id);
        const completed = engJobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status));
        const pending = engJobs.filter((j: any) => ['Assigned', 'In Progress'].includes(j.status));
        const avgTime = completed.reduce((s: number, j: any) => {
          const end = j.completedAt ? new Date(j.completedAt).getTime() : new Date(j.updatedAt).getTime();
          return s + (end - new Date(j.createdAt).getTime());
        }, 0) / (completed.length || 1);
        const revenue = completed.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
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
      }).sort((a: any, b: any) => b.completed - a.completed);

      return (
        <div className="divide-y divide-gray-100">
          {engineerStats.map((eng: any, i: number) => {
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
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${eng.efficiency}%` }} />
                  </div>
                  <span className="text-[11px] font-medium text-gray-700 shrink-0">{eng.efficiency}% efficiency</span>
                </div>
                {/* Stats chips */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 text-[11px] font-medium">{eng.completed} completed</span>
                  <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-[11px] font-medium">{eng.pending} pending</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium">{eng.total} total</span>
                  {eng.avgDays > 0 && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium">avg {eng.avgDays}d/job</span>}
                  {eng.revenue > 0 && <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[11px] font-medium">₹{eng.revenue.toLocaleString()} earned</span>}
                </div>
                {/* Recent jobs */}
                {eng.recentJobs.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-gray-100">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Recent jobs</p>
                    {eng.recentJobs.map((j: any) => {
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
    }

    // ── DEVICES ───────────────────────────────────────────────────
    if (type === 'devices') {
      const deviceBarColors: Record<string, string> = {
        'Smartphone': 'bg-cyan-500',
        'Laptop': 'bg-teal-500',
        'Tablet': 'bg-green-500',
        'Desktop': 'bg-orange-500',
      };
      const typeCounts = devices.reduce<Record<string, any[]>>((acc, d: any) => {
        if (!acc[d.type]) acc[d.type] = [];
        acc[d.type].push(d);
        return acc;
      }, {});
      const total = Math.max(devices.length, 1);
      const entries = Object.entries(typeCounts).sort((a, b) => b[1].length - a[1].length);

      // Brand breakdown
      const brandCounts = devices.reduce<Record<string, number>>((acc, d: any) => {
        acc[d.brand] = (acc[d.brand] ?? 0) + 1;
        return acc;
      }, {});
      const brandEntries = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const maxBrand = brandEntries[0]?.[1] || 1;

      return (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            <div className="px-6 py-4 text-center">
              <p className="text-[20px] font-medium text-orange-500">{devices.length}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Total Devices</p>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-[20px] font-medium text-teal-600">{entries.length}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Device Types</p>
            </div>
          </div>

          {/* Type breakdown bars */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-4">By Type</p>
            <div className="space-y-3">
              {entries.map(([type, devs]) => {
                const pct = Math.round((devs.length / total) * 100);
                const color = deviceBarColors[type] ?? 'bg-gray-400';
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-gray-700">{type}</span>
                      <span className="text-[12px] font-medium text-gray-900">{devs.length} unit{devs.length !== 1 ? 's' : ''} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brand distribution */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-4">Top Brands</p>
            <div className="space-y-2.5">
              {brandEntries.map(([brand, count]) => (
                <div key={brand} className="flex items-center gap-3">
                  <span className="text-[12px] text-gray-700 w-24 shrink-0 truncate">{brand}</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-400 rounded-full" style={{ width: `${Math.round((count / maxBrand) * 100)}%` }} />
                  </div>
                  <span className="text-[12px] font-medium text-gray-700 w-6 text-right shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* All devices list */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">All Devices</p>
          </div>
          <div className="divide-y divide-gray-100">
            {devices.map((d: any) => {
              const customer = customers.find((c: any) => c.id === d.customerId);
              const color = deviceBarColors[d.type] ?? 'bg-gray-400';
              return (
                <div key={d.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className={`w-2 h-8 rounded-full shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-900 truncate">{d.brand} {d.model}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{d.type} · {customer?.name ?? 'Unknown'}</p>
                  </div>
                  {d.serialNumber && <span className="text-[10px] text-gray-400 shrink-0 font-mono">{d.serialNumber}</span>}
                </div>
              );
            })}
            {devices.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No devices registered yet.</p>}
          </div>
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
            <h2 className="text-[18px] font-medium text-gray-900">{cfg.title}</h2>
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

// ── AnalyticsPage ─────────────────────────────────────────────────────────────
export const AnalyticsPage: React.FC = () => {
  const { jobs, users, customers, partRequests, devices } = useApp();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
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
      const endTime = j.completedAt ? new Date(j.completedAt).getTime() : new Date(j.updatedAt).getTime();
      return s + (endTime - new Date(j.createdAt).getTime());
    }, 0) / (completed.length || 1);
    const pending = engJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status));
    return {
      ...eng,
      total: engJobs.length,
      completed: completed.length,
      pending: pending.length,
      avgDays: completed.length > 0 ? Math.round(avgTime / 86400000) : 0,
    };
  });

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Platform Analytics" subtitle="Click any card or chart to drill into the data" />

      {/* KPI Cards Grid — all clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Revenue"  value={`₹${(totalRevenue/1000).toFixed(1)}k`}                        icon={Banknote}     color="green"  sub="Realized"  onClick={() => setActiveModal('revenue')} />
        <MetricCard title="Total Volume"   value={jobs.length}                                                   icon={Wrench}       color="cyan"   sub="All Time"  onClick={() => setActiveModal('volume')} />
        <MetricCard title="Client Base"    value={customers.length}                                              icon={Users}        color="teal"   sub="Active"    onClick={() => setActiveModal('clients')} />
        <MetricCard title="Parts Approved" value={partRequests.filter(r => r.status === 'Approved').length}      icon={CheckCircle}  color="orange"              onClick={() => setActiveModal('parts')} />
      </div>

      {/* Revenue Forecast Widget */}
      {(() => {
        const completedJobs = jobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
        const pendingJobs = jobs.filter(j => ['New', 'Assigned', 'In Progress'].includes(j.status));
        const realized = completedJobs.reduce((sum, j) => sum + (j.actualCost ?? j.estimatedCost ?? 0), 0);
        const pipeline = pendingJobs.reduce((sum, j) => sum + (j.estimatedCost ?? 0), 0);
        const projected = realized + pipeline;
        return (
          <Card className="mb-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
                <Banknote className="text-green-500" size={16} /> Revenue Forecast
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="p-6">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Realized Revenue</p>
                <p className="text-[24px] font-medium text-green-600">₹{realized.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400 mt-1">{completedJobs.length} completed jobs</p>
              </div>
              <div className="p-6">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Pipeline (Estimated)</p>
                <p className="text-[24px] font-medium text-orange-500">₹{pipeline.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400 mt-1">{pendingJobs.length} active jobs</p>
              </div>
              <div className="p-6 bg-teal-50/30">
                <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mb-1">Projected Total</p>
                <p className="text-[24px] font-medium text-teal-700">₹{projected.toLocaleString()}</p>
                <p className="text-[11px] text-teal-600/70 mt-1">If all pipeline closes</p>
              </div>
            </div>
          </Card>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Status Breakdown — clickable */}
        <Card className="lg:col-span-2" onClick={() => setActiveModal('workflow')}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
              <Activity className="text-teal-500" size={16} /> Workflow Distribution
            </h3>
            <span className="text-[11px] font-medium text-teal-500 flex items-center gap-0.5">
              Details <ChevronRight size={12} />
            </span>
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

        {/* Key Metrics — clickable */}
        <Card onClick={() => setActiveModal('keymetrics')}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
              <Target className="text-cyan-500" size={16} /> Key Metrics
            </h3>
            <span className="text-[11px] font-medium text-teal-500 flex items-center gap-0.5">
              Details <ChevronRight size={12} />
            </span>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'Completion Rate', value: `${jobs.length > 0 ? Math.round((jobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length / jobs.length) * 100) : 0}%`, color: 'text-green-600' },
              { label: 'Avg. Ticket Size', value: `₹${jobs.length > 0 ? Math.round(jobs.reduce((s, j) => s + j.estimatedCost, 0) / jobs.length).toLocaleString() : 0}`, color: 'text-teal-600' },
              { label: 'Parts Approval', value: `${partRequests.length > 0 ? Math.round((partRequests.filter(r => r.status === 'Approved').length / partRequests.length) * 100) : 0}%`, color: 'text-cyan-600' },
              { label: 'Active Engineers', value: `${users.filter(u => u.role === 'engineer' && u.active).length}/${engineers.length}`, color: 'text-orange-600' },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{m.label}</span>
                <span className={`text-[13px] font-medium ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engineer Leaderboard — clickable */}
        <Card onClick={() => setActiveModal('leaderboard')}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Engineer Leaderboard</h3>
            <span className="text-[11px] font-medium text-teal-500 flex items-center gap-0.5">
              Full View <ChevronRight size={12} />
            </span>
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
                  <p className="text-[11px] font-normal text-gray-500 mt-1">
                    {eng.pending > 0 ? `${eng.pending} pending · ` : ''}{eng.avgDays > 0 ? `Avg ${eng.avgDays} day${eng.avgDays !== 1 ? 's' : ''} per repair` : 'No completions yet'}
                  </p>
                </div>
                <div className="text-right pl-4">
                  <span className="text-[18px] font-medium text-gray-900 block">{eng.total > 0 ? `${Math.round((eng.completed / eng.total) * 100)}` : '0'}<span className="text-[11px] text-gray-500 ml-1">%</span></span>
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Efficiency</span>
                </div>
              </div>
            ))}
            {engineerStats.length === 0 && (
              <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No engineers registered.</p>
            )}
          </div>
        </Card>

        {/* Device Breakdown — clickable */}
        <Card onClick={() => setActiveModal('devices')}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Hardware Distribution</h3>
            <span className="text-[11px] font-medium text-teal-500 flex items-center gap-0.5">
              Full View <ChevronRight size={12} />
            </span>
          </div>
          <div className="p-6">
            {(() => {
              const deviceColors: Record<string, string> = {
                'Smartphone': 'bg-cyan-500',
                'Laptop': 'bg-teal-500',
                'Tablet': 'bg-green-500',
                'Desktop': 'bg-orange-500',
              };
              const typeCounts = devices.reduce<Record<string, number>>((acc, d) => {
                acc[d.type] = (acc[d.type] ?? 0) + 1;
                return acc;
              }, {});
              const total = Math.max(devices.length, 1);
              const entries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
              if (entries.length === 0) {
                return <p className="text-[13px] text-gray-400 text-center py-4">No device data yet</p>;
              }
              return (
                <div className="space-y-4">
                  {entries.map(([type, count]) => {
                    const pct = Math.round((count / total) * 100);
                    const color = deviceColors[type] ?? 'bg-gray-400';
                    return (
                      <div key={type} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide group-hover:text-gray-900 transition-colors">{type}</span>
                          <span className="text-[13px] font-medium text-gray-900">{count} unit{count !== 1 ? 's' : ''} · {pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-2 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide text-center">{devices.length} total device{devices.length !== 1 ? 's' : ''} registered</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>
      </div>

      {/* Detail Drawer */}
      {activeModal && (
        <DetailModal
          type={activeModal}
          onClose={() => setActiveModal(null)}
          jobs={jobs}
          users={users}
          customers={customers}
          partRequests={partRequests}
          devices={devices}
        />
      )}
    </div>
  );
};