import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle, Banknote, Hourglass, Users, ChevronRight, Package, X, CalendarDays } from 'lucide-react';
import type { Job, Sale, User, PartRequest } from '../../types';

// ── UI Component Props ───────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: 'teal' | 'cyan' | 'green' | 'orange';
  sub?: string;
  onClick?: () => void;
}

interface DayWiseActivityProps {
  jobs: Job[];
  sales: Sale[];
}

interface DetailModalProps {
  type: 'completed' | 'pending' | 'engineers' | 'parts' | 'revenue';
  onClose: () => void;
  jobs: Job[];
  users: User[];
  partRequests: PartRequest[];
  sales: Sale[];
}

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

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, sub, onClick }) => {
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DayWiseActivity: React.FC<DayWiseActivityProps> = ({ jobs, sales }) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0,0,0,0);

  const days = useMemo(() => {
    const count = viewMode === 'week' ? 7 : 30;
    const result: Date[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0,0,0,0);
      result.push(d);
    }
    return result;
  }, [viewMode]);

  const toKey = (d: Date) => d.toISOString().slice(0, 10);

  const activityMap = useMemo(() => {
    const result: Record<string, { jobs: Job[]; sales: Sale[]; revenue: number }> = {};
    days.forEach(d => {
      result[toKey(d)] = { jobs: [], sales: [], revenue: 0 };
    });

    jobs.forEach(job => {
      const key = job.createdAt.slice(0, 10);
      if (result[key]) {
        result[key].jobs.push(job);
        if (['Completed', 'Delivered'].includes(job.status)) {
          result[key].revenue += (job.actualCost ?? job.estimatedCost ?? 0);
        }
      }
    });

    sales.forEach(sale => {
      const key = sale.createdAt.slice(0, 10);
      if (result[key]) {
        result[key].sales.push(sale);
        result[key].revenue += (sale.totalAmount ?? 0);
      }
    });
    return result;
  }, [days, jobs, sales]);

  const maxJobs = Math.max(1, ...days.map(d => activityMap[toKey(d)]?.jobs.length ?? 0));
  const selectedData = selectedDate ? activityMap[selectedDate] : null;
  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;

  const periodLabel = viewMode === 'week' ? 'This Week' : 'This Month';
  const periodJobs = days.reduce((s, d) => s + (activityMap[toKey(d)]?.jobs.length ?? 0), 0);
  const periodRevenue = days.reduce((s, d) => s + (activityMap[toKey(d)]?.revenue ?? 0), 0);
  const periodSales = days.reduce((s, d) => s + (activityMap[toKey(d)]?.sales.length ?? 0), 0);

  return (
    <Card>
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
                </button>
              );
            })}
          </div>
        </div>

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

            {selectedData && selectedData.jobs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-teal-700 uppercase tracking-wide">Jobs</p>
                {selectedData.jobs.slice(0, 5).map((job: Job) => (
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
              </div>
            ) : (
              <p className="text-[13px] text-teal-600 text-center py-2">No jobs on this day.</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export const AdminDashboard: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const { jobs, users, partRequests, inventory, sales, stats } = useApp();
  const [activeModal, setActiveModal] = useState<any>(null);

  const engineers = users.filter(u => u.role === 'engineer');
  const activeEngineersCount = stats?.activeEngineers ?? engineers.filter(u => u.active).length;
  const totalEngineersCount = stats?.totalEngineers ?? engineers.length;

  const jobStats = {
    total: (stats ? stats.totalCompletedJobs + stats.totalPendingJobs : 0) || jobs.length,
    pending: stats?.totalPendingJobs ?? jobs.filter(j => ['New', 'Assigned', 'In Progress'].includes(j.status)).length,
    completed: stats?.totalCompletedJobs ?? jobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length,
  };

  const revenueDisplay = stats?.totalRevenue 
    ? `₹${(stats.totalRevenue / 1000).toFixed(1)}k`
    : `₹${((jobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).reduce((s, j) => s + (j.actualCost ?? j.estimatedCost ?? 0), 0) + sales.reduce((s, sale) => s + (sale.totalAmount ?? 0), 0)) / 1000).toFixed(1)}k`;

  const pendingPartsCount = stats?.pendingPartsCount ?? partRequests.filter(r => r.status === 'Pending' || r.status === 'AwaitingStock').length;
  const lowStockCount = stats?.lowStockCount ?? inventory.filter(i => i.quantity <= i.minStock).length;

  const jobStatusColors: Record<string, string> = {
    'New': 'border-cyan-500 text-cyan-700 bg-cyan-50',
    'Assigned': 'border-teal-500 text-teal-700 bg-teal-50',
    'In Progress': 'border-orange-500 text-orange-700 bg-orange-50',
    'Completed': 'border-green-500 text-green-700 bg-green-50',
    'Delivered': 'border-green-500 text-green-700 bg-green-50',
  };

  const criticalInventory = inventory.filter(i => i.quantity <= i.minStock);

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Executive Overview" subtitle="Click any metric card to view details" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard title="Total Completed" value={jobStats.completed} icon={CheckCircle} color="green" sub="Success" onClick={() => setActiveModal('completed')} />
        <MetricCard title="Pending Queue" value={jobStats.pending} icon={Hourglass} color="orange" sub="Active" onClick={() => setActiveModal('pending')} />
        <MetricCard title="Active Engineers" value={`${activeEngineersCount}/${totalEngineersCount}`} icon={Users} color="teal" sub="On Roster" onClick={() => setActiveModal('engineers')} />
        <MetricCard title="Pending Parts" value={pendingPartsCount} icon={Package} color="orange" sub={pendingPartsCount > 0 ? "Action Needed" : "All Clear"} onClick={() => setActiveModal('parts')} />
        <MetricCard title="Total Revenue" value={revenueDisplay} icon={Banknote} color="green" sub="All Time" onClick={() => setActiveModal('revenue')} />
      </div>

      <DayWiseActivity jobs={jobs} sales={sales} />

      {criticalInventory.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <div className="px-6 py-4 border-b border-red-200 flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-red-900 flex items-center gap-2">
              <Package size={16} className="text-red-500" /> Low Stock Inventory Alerts
            </h3>
            <span className="text-[11px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-md uppercase tracking-wide">
              {lowStockCount} Items Critical
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
            {criticalInventory.slice(0, 3).map(item => (
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

      {activeModal && (
        <DetailModal
          type={activeModal}
          onClose={() => setActiveModal(null)}
          jobs={jobs}
          users={users}
          partRequests={partRequests}
          sales={sales}
        />
      )}
    </div>
  );
};

// Simple DetailModal inline replacement inside Dashboard component to keep it compileable and clean
const DetailModal: React.FC<DetailModalProps> = ({ type, onClose, jobs, users, partRequests, sales }) => {
  const configs: Record<string, { title: string; accentColor: string }> = {
    completed: { title: 'Completed Jobs', accentColor: 'text-green-600' },
    pending: { title: 'Pending Queue', accentColor: 'text-orange-600' },
    engineers: { title: 'Fleet Roster', accentColor: 'text-teal-600' },
    parts: { title: 'Parts Requests', accentColor: 'text-orange-600' },
    revenue: { title: 'Revenue Overview', accentColor: 'text-green-600' },
  };

  const cfg = configs[type] || { title: 'Overview', accentColor: 'text-teal-600' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h2 className={`text-[18px] font-medium ${cfg.accentColor}`}>{cfg.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <p className="text-[13px] text-gray-500">Currently showing recent logs for {cfg.title.toLowerCase()}. For full paginated registries, please use the sidebar navigation views.</p>
          <div className="divide-y divide-gray-100 mt-4">
            {type === 'completed' && jobs.filter((j: Job) => ['Completed', 'Delivered'].includes(j.status)).map((j: Job) => (
              <div key={j.id} className="py-3 flex justify-between items-center text-[13px]">
                <p className="font-medium text-gray-900 truncate max-w-[300px]">{j.problemDescription}</p>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[11px] font-medium">{j.status}</span>
              </div>
            ))}
            {type === 'pending' && jobs.filter((j: Job) => ['New', 'Assigned', 'In Progress'].includes(j.status)).map((j: Job) => (
              <div key={j.id} className="py-3 flex justify-between items-center text-[13px]">
                <p className="font-medium text-gray-900 truncate max-w-[300px]">{j.problemDescription}</p>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[11px] font-medium">{j.status}</span>
              </div>
            ))}
            {type === 'engineers' && users.filter((u: User) => u.role === 'engineer').map((u: User) => (
              <div key={u.id} className="py-3 flex justify-between items-center text-[13px]">
                <p className="font-medium text-gray-900">{u.name}</p>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.active ? 'Active' : 'Inactive'}</span>
              </div>
            ))}
            {type === 'parts' && partRequests.map((r: PartRequest) => (
              <div key={r.id} className="py-3 flex justify-between items-center text-[13px]">
                <p className="font-medium text-gray-900">{r.partName} (x{r.quantity})</p>
                <span className="text-[11px] text-gray-500">{r.status}</span>
              </div>
            ))}
            {type === 'revenue' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wide">Jobs Revenue</p>
                  <p className="text-[24px] font-bold text-emerald-800 mt-1">₹{jobs.filter((j: Job) => ['Completed', 'Delivered'].includes(j.status)).reduce((s: number, j: Job) => s + (j.actualCost ?? j.estimatedCost ?? 0), 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                  <p className="text-[11px] font-medium text-purple-600 uppercase tracking-wide">Product Sales</p>
                  <p className="text-[24px] font-bold text-purple-800 mt-1">₹{sales.reduce((s: number, sale: Sale) => s + (sale.totalAmount ?? 0), 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
