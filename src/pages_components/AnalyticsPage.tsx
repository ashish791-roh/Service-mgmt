import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Wrench, CheckCircle, Banknote, Users, Activity, Target,
  ChevronRight, TrendingUp,
} from 'lucide-react';
import { TimePeriod, AnalyticsModalType, AnalyticsDetailDrawer } from './analytics/AnalyticsDetailDrawer';
import { MonthWiseAnalytics } from './analytics/MonthWiseAnalytics';
import { ChartsSection } from './analytics/ChartsSection';
import type { Job, Sale } from '../types';

// ── Small reusable components ─────────────────────────────────────────────────

const PageHeader = ({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Card = ({
  children, className = '', onClick,
}: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${onClick ? 'cursor-pointer hover:border-teal-300 hover:shadow-md transition-all' : ''} ${className}`}
  >
    {children}
  </div>
);

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  color: string;
  sub?: string;
  onClick?: () => void;
}

const MetricCard = ({ title, value, icon: Icon, color, sub, onClick }: MetricCardProps) => {
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

// ── Time Period Helpers ───────────────────────────────────────────────────────

function getStartDate(period: TimePeriod): Date | null {
  if (period === 'overall') return null;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function filterJobsByPeriod(jobs: Job[], period: TimePeriod): Job[] {
  const start = getStartDate(period);
  if (!start) return jobs;
  return jobs.filter(j => new Date(j.createdAt) >= start);
}

function filterSalesByPeriod(sales: Sale[], period: TimePeriod): Sale[] {
  const start = getStartDate(period);
  if (!start) return sales;
  return sales.filter(s => new Date(s.createdAt) >= start);
}

export const AnalyticsPage: React.FC = () => {
  const {
    jobs: rawJobs,
    users: rawUsers,
    customers: rawCustomers,
    partRequests: rawPartRequests,
    devices: rawDevices,
    sales: rawSales,
    inventory: rawInventory,
    isHQ,
    branches,
    selectedBranchId,
    setSelectedBranchId
  } = useApp();

  const jobs = useMemo(() => selectedBranchId === 'all' ? rawJobs : rawJobs.filter(x => x.branchId === selectedBranchId), [rawJobs, selectedBranchId]);
  const users = useMemo(() => selectedBranchId === 'all' ? rawUsers : rawUsers.filter(x => x.branchId === selectedBranchId), [rawUsers, selectedBranchId]);
  const customers = useMemo(() => selectedBranchId === 'all' ? rawCustomers : rawCustomers.filter(x => x.branchId === selectedBranchId), [rawCustomers, selectedBranchId]);
  const partRequests = useMemo(() => selectedBranchId === 'all' ? rawPartRequests : rawPartRequests.filter(x => x.branchId === selectedBranchId), [rawPartRequests, selectedBranchId]);
  const devices = useMemo(() => selectedBranchId === 'all' ? rawDevices : rawDevices.filter(x => x.branchId === selectedBranchId), [rawDevices, selectedBranchId]);
  const sales = useMemo(() => selectedBranchId === 'all' ? rawSales : rawSales.filter(x => x.branchId === selectedBranchId), [rawSales, selectedBranchId]);
  const inventory = useMemo(() => selectedBranchId === 'all' ? rawInventory : rawInventory.filter(x => x.branchId === selectedBranchId), [rawInventory, selectedBranchId]);

  const [activeModal, setActiveModal] = useState<AnalyticsModalType>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('overall');
  const engineers = useMemo(() => users.filter(u => u.role === 'engineer'), [users]);


  // ── Filtered data ────────────────────────────────────────────────────────
  const filteredJobs = useMemo(() => filterJobsByPeriod(jobs, timePeriod), [jobs, timePeriod]);
  const filteredSales = useMemo(() => filterSalesByPeriod(sales ?? [], timePeriod), [sales, timePeriod]);

  // ── Revenue — single source of truth ─────────────────────────────────────
  const jobRevenue = useMemo(
    () => filteredJobs
      .filter(j => ['Completed', 'Delivered'].includes(j.status))
      .reduce((s, j) => s + (j.actualCost ?? j.estimatedCost ?? 0), 0),
    [filteredJobs],
  );

  const salesRevenue = useMemo(
    () => filteredSales.reduce((s, sale) => s + (sale.totalAmount ?? 0), 0),
    [filteredSales],
  );

  const totalRevenue = jobRevenue + salesRevenue;

  const statusBreakdown = useMemo(() => ['New', 'Assigned', 'In Progress', 'Completed', 'Delivered'].map(s => ({
    status: s,
    count: filteredJobs.filter(j => j.status === s).length,
    pct: Math.round((filteredJobs.filter(j => j.status === s).length / Math.max(filteredJobs.length, 1)) * 100),
  })), [filteredJobs]);

  const statusColors: Record<string, string> = {
    'New': 'bg-cyan-200',
    'Assigned': 'bg-teal-400',
    'In Progress': 'bg-orange-400',
    'Completed': 'bg-green-500',
    'Delivered': 'bg-teal-600',
  };

  const periodLabels: Record<TimePeriod, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    'overall': 'All Time',
  };

  const periodOptions: { key: TimePeriod; label: string }[] = [
    { key: '7d',      label: 'Last 7 Days' },
    { key: '30d',     label: 'Last 30 Days' },
    { key: '90d',     label: 'Last 90 Days' },
    { key: 'overall', label: 'Overall' },
  ];

  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(1)}k`;

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Platform Analytics" subtitle="Click any card to drill into the data" />

      {/* ── Branch Selector for HQ ── */}
      {isHQ && (
        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
          <span className="text-[13px] font-medium text-gray-700">Physical Branch:</span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-[13px] rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2.5"
          >
            <option value="all">All Branches (HQ Consolidated)</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.id.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      )}


      {/* ── Time Period Filter ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-gray-500 shrink-0">
          <TrendingUp size={15} className="text-teal-500" />
          <span className="text-[13px] font-medium text-gray-600">Period</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {periodOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setTimePeriod(opt.key)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                timePeriod === opt.key
                  ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto text-right">
          <p className="text-[11px] text-gray-400">Showing data for</p>
          <p className="text-[13px] font-medium text-teal-600">{periodLabels[timePeriod]}</p>
        </div>
      </div>

      {/* ── KPI Cards — 4 cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={fmt(totalRevenue)}
          icon={Banknote}
          color="green"
          sub={periodLabels[timePeriod]}
          onClick={() => setActiveModal('revenue')}
        />
        <MetricCard
          title="Total Jobs"
          value={filteredJobs.length}
          icon={Wrench}
          color="cyan"
          sub={periodLabels[timePeriod]}
          onClick={() => setActiveModal('volume')}
        />
        <MetricCard
          title="Client Base"
          value={customers.length}
          icon={Users}
          color="teal"
          sub="All time"
          onClick={() => setActiveModal('clients')}
        />
        <MetricCard
          title="Parts Approved"
          value={partRequests.filter(r => r.status === 'Approved').length}
          icon={CheckCircle}
          color="orange"
          onClick={() => setActiveModal('parts')}
        />
      </div>

      {/* ── Revenue Breakdown — jobs + sales ─────────────────────── */}
      <Card>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
            <Banknote className="text-green-500" size={16} /> Revenue Breakdown
          </h3>
          <span className="text-[11px] text-gray-400">{periodLabels[timePeriod]}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-6 bg-teal-50/30">
            <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mb-1">Total Revenue</p>
            <p className="text-[28px] font-medium text-teal-700">₹{totalRevenue.toLocaleString()}</p>
            <p className="text-[11px] text-teal-600/70 mt-1">Jobs + Direct Sales</p>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Wrench size={13} className="text-teal-500" />
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">From Job Repairs</p>
            </div>
            <p className="text-[24px] font-medium text-teal-600">₹{jobRevenue.toLocaleString()}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              {filteredJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length} completed jobs
              {totalRevenue > 0 && (
                <span className="ml-2 text-teal-500 font-medium">
                  ({Math.round((jobRevenue / totalRevenue) * 100)}%)
                </span>
              )}
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Users size={13} className="text-blue-500" />
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">From Direct Sales</p>
            </div>
            <p className="text-[24px] font-medium text-blue-600">₹{salesRevenue.toLocaleString()}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              {filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''}
              {totalRevenue > 0 && (
                <span className="ml-2 text-blue-500 font-medium">
                  ({Math.round((salesRevenue / totalRevenue) * 100)}%)
                </span>
              )}
            </p>
          </div>
        </div>

        {(() => {
          const pipeline = filteredJobs
            .filter(j => ['New', 'Assigned', 'In Progress'].includes(j.status))
            .reduce((s, j) => s + (j.estimatedCost ?? 0), 0);
          return pipeline > 0 ? (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-orange-50/40">
              <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-orange-400" />
                Pipeline (estimated from active jobs)
              </span>
              <span className="text-[13px] font-medium text-orange-600">+₹{pipeline.toLocaleString()}</span>
            </div>
          ) : null;
        })()}
      </Card>

      {/* ── Workflow + Key Metrics ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    {s.status}: <strong className="text-gray-900 ml-1">{s.count}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

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
              {
                label: 'Completion Rate',
                value: `${filteredJobs.length > 0 ? Math.round((filteredJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length / filteredJobs.length) * 100) : 0}%`,
                color: 'text-green-600',
              },
              {
                label: 'Avg. Ticket Size',
                value: `₹${filteredJobs.length > 0 ? Math.round(filteredJobs.reduce((s, j) => s + j.estimatedCost, 0) / filteredJobs.length).toLocaleString() : 0}`,
                color: 'text-teal-600',
              },
              {
                label: 'Parts Approval',
                value: `${partRequests.length > 0 ? Math.round((partRequests.filter(r => r.status === 'Approved').length / partRequests.length) * 100) : 0}%`,
                color: 'text-cyan-600',
              },
              {
                label: 'Active Engineers',
                value: `${users.filter(u => u.role === 'engineer' && u.active).length}/${engineers.length}`,
                color: 'text-orange-600',
              },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{m.label}</span>
                <span className={`text-[13px] font-medium ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Engineer Leaderboard + Device Breakdown ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card onClick={() => setActiveModal('leaderboard')}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Engineer Leaderboard</h3>
            <span className="text-[11px] font-medium text-teal-500 flex items-center gap-0.5">
              Full View <ChevronRight size={12} />
            </span>
          </div>
          <div className="divide-y divide-gray-200">
            {engineers.map((eng) => {
              const engJobs = filteredJobs.filter(j => j.assignedEngineerId === eng.id);
              const completed = engJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
              const pending = engJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status));
              const avgTime = completed.reduce((s, j) => {
                const endTime = j.completedAt ? new Date(j.completedAt).getTime() : new Date(j.updatedAt).getTime();
                return s + (endTime - new Date(j.createdAt).getTime());
              }, 0) / (completed.length || 1);
              return {
                ...eng,
                total: engJobs.length,
                completed: completed.length,
                pending: pending.length,
                avgDays: completed.length > 0 ? Math.round(avgTime / 86400000) : 0,
              };
            }).sort((a, b) => b.completed - a.completed).map((eng, i) => (
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
            {engineers.length === 0 && (
              <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No engineers registered.</p>
            )}
          </div>
        </Card>

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
                          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide group-hover:text-gray-900 transition-colors">{type}</span>
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

      {/* ── Charts & Insights section ─────────────────────────────── */}
      <ChartsSection
        jobs={filteredJobs}
        sales={filteredSales}
        partRequests={partRequests}
        inventory={inventory ?? []}
        period={timePeriod}
        periodLabel={periodLabels[timePeriod]}
      />

      {/* ── Month-wise Analytics ──────────────────────────────────── */}
      <MonthWiseAnalytics jobs={jobs} />

      {/* Detail Drawer */}
      {activeModal && (
        <AnalyticsDetailDrawer
          type={activeModal}
          onClose={() => setActiveModal(null)}
          jobs={filteredJobs}
          users={users}
          customers={customers}
          partRequests={partRequests}
          devices={devices}
        />
      )}
    </div>
  );
};