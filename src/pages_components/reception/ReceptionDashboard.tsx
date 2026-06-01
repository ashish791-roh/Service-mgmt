import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, UrgencyDot, getJobAgeLevel, SLABadge } from '../../components/ui';
import { Briefcase, AlertCircle, Zap, Users, Settings, ChevronRight, ArrowRight } from 'lucide-react';
import { ReceptionDetailModal } from './components/ReceptionDetailModal';

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className = "" }: CardProps) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number }>;
  colorClass: string;
  sub?: string;
  onClick?: () => void;
}

const MetricCard = ({ title, value, icon: Icon, colorClass, sub, onClick }: MetricCardProps) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group ${onClick ? 'cursor-pointer hover:border-teal-300 hover:shadow-md transition-all' : ''}`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div className="flex items-center gap-2">
        {sub && <span className="bg-rose-100 text-rose-600 text-[11px] font-medium px-2.5 py-1 rounded-md uppercase tracking-wide">{sub}</span>}
        {onClick && (
          <span className="text-[10px] font-medium text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            Details <ChevronRight size={12} />
          </span>
        )}
      </div>
    </div>
    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
    <h3 className="text-[24px] font-medium text-gray-900 leading-none">{value}</h3>
  </div>
);

interface ButtonProps {
  text: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  variant?: 'primary' | 'success' | 'danger' | 'outline' | 'outline_danger';
  className?: string;
  icon?: React.ComponentType<{ size?: number }>;
}

const Button = ({ text, onClick, variant = 'primary', className = "", icon: Icon }: ButtonProps) => {
  const styles: Record<string, string> = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    outline_danger: "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50",
  };
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

type ReceptionModalType = 'total' | 'unassigned' | 'inprogress' | 'customers' | null;

export const ReceptionDashboard: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const { jobs, customers, users, partRequests, currentUser, slaTiers, devices } = useApp();
  const [activeModal, setActiveModal] = useState<ReceptionModalType>(null);
  const showFinancials = currentUser?.role !== 'engineer';
  const pendingParts = partRequests.filter(r => r.status === 'Pending');
  const unassigned = jobs.filter(j => !j.assignedEngineerId);

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Command Center" subtitle="Real-time operations — click any metric to view details" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Jobs" value={jobs.length} icon={Briefcase} colorClass="bg-cyan-50 text-cyan-600 border border-cyan-200" onClick={() => setActiveModal('total')} />
        <MetricCard title="Unassigned" value={unassigned.length} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600 border border-rose-200" sub="Action Needed" onClick={() => setActiveModal('unassigned')} />
        <MetricCard title="In Progress" value={jobs.filter(j => j.status === 'In Progress').length} icon={Zap} colorClass="bg-amber-50 text-amber-600 border border-amber-200" onClick={() => setActiveModal('inprogress')} />
        <MetricCard title="Customers" value={customers.length} icon={Users} colorClass="bg-green-50 text-green-600 border border-green-200" onClick={() => setActiveModal('customers')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-[18px] font-medium text-gray-900">Live Activity Feed</h2>
              <button onClick={() => onNavigate('jobs')} className="text-[13px] font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View All <ArrowRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {jobs.slice(0, 6).map((job) => {
                const customer = customers.find(c => c.id === job.customerId);
                const engineer = users.find(u => u.id === job.assignedEngineerId);
                const device = devices.find(d => d.id === job.deviceId);
                const ageLevel = getJobAgeLevel(job.createdAt, job.status, device?.type);
                const rowBorder = ageLevel === 'red' ? 'border-l-4 border-red-400' : ageLevel === 'yellow' ? 'border-l-4 border-amber-400' : 'border-l-4 border-emerald-400';
                return (
                  <div key={job.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${rowBorder}`}>
                    <UrgencyDot createdAt={job.createdAt} status={job.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate mb-0.5">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500 truncate">{job.problemDescription}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <StatusBadge status={job.status} />
                      <SLABadge createdAt={job.createdAt} status={job.status} deviceType={device?.type} tiers={slaTiers} compact />
                      <p className="text-[11px] font-medium text-gray-400 mt-0.5 uppercase tracking-wide">{engineer ? engineer.name : '— Unassigned —'}</p>
                    </div>
                    {showFinancials && (
                      <span className="text-[13px] font-medium text-gray-900 ml-4 w-20 text-right">₹{(job.estimatedCost ?? 0).toLocaleString()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {unassigned.length > 0 && (
            <Card className="bg-rose-50 border-rose-200">
              <div className="px-5 py-4 flex items-center gap-3 border-b border-rose-200/50">
                <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-sm">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-[18px] font-medium text-rose-900">Urgent Assignments</h3>
                  <p className="text-[11px] font-medium text-rose-500 uppercase tracking-wide">{unassigned.length} Jobs Waiting</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {unassigned.slice(0, 3).map(job => {
                  const customer = customers.find(c => c.id === job.customerId);
                  return (
                    <div key={job.id} className="bg-white rounded-lg p-4 shadow-sm border border-rose-100">
                      <p className="text-[13px] font-medium text-gray-900 mb-1">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500 line-clamp-1 mb-3">{job.problemDescription}</p>
                      <Button text="Assign Now" variant="primary" onClick={() => onNavigate('assign')} className="w-full" />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {pendingParts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm mb-3">
                  <Settings size={24} />
                </div>
                <h3 className="text-[18px] font-medium text-amber-900 mb-1">Parts Approval</h3>
                <p className="text-[13px] font-medium text-amber-700 mb-4">{pendingParts.length} requests pending review</p>
                <Button text="Review Requests" variant="primary" onClick={() => onNavigate('parts')} className="w-full" />
              </div>
            </Card>
          )}
        </div>
      </div>

      <ReceptionDetailModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
        jobs={jobs}
        customers={customers}
        users={users}
        onNavigate={onNavigate}
      />
    </div>
  );
};
