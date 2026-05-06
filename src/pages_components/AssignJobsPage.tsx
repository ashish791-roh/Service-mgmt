import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge, UrgencyDot, Toast, useToast } from '../components/ui';
import { CheckCircle2 } from 'lucide-react';

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ icon: Icon, text, onClick, variant = 'primary', className = "", disabled = false }: any) => {
  const styles: any = {
    primary:       "bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed",
    success:       "bg-green-500 text-white hover:bg-green-600",
    outline:       "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
  };
  return (
    <button disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

const PageHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
  </div>
);

export const AssignJobsPage: React.FC = () => {
  const { jobs, customers, devices, users, assignEngineer } = useApp();
  const { toast, show } = useToast();

  const engineers = users.filter(u => u.role === 'engineer' && u.active);
  const unassigned = jobs.filter(j => j.id && !j.assignedEngineerId && !['Completed', 'Delivered'].includes(j.status));

  // Controlled select state: jobId → selected engineerId
  const [selections, setSelections] = useState<Record<string, string>>({});
  // Track which jobs were just assigned (to show success state briefly)
  const [justAssigned, setJustAssigned] = useState<Record<string, boolean>>({});

  const handleAssign = (jobId: string) => {
    const engId = selections[jobId];
    if (!engId) return;

    assignEngineer(jobId, engId);

    // Show success state on that card briefly
    setJustAssigned(prev => ({ ...prev, [jobId]: true }));
    setTimeout(() => setJustAssigned(prev => { const n = { ...prev }; delete n[jobId]; return n; }), 1500);

    // Clear the selection for that job
    setSelections(prev => { const n = { ...prev }; delete n[jobId]; return n; });

    const eng = engineers.find(e => e.id === engId);
    show(`Job assigned to ${eng?.name ?? 'engineer'} successfully.`);
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader
        title="Workforce Dispatch"
        subtitle={`${unassigned.length} job${unassigned.length !== 1 ? 's' : ''} require assignment`}
      />

      {/* Engineer load overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {engineers.map((eng) => {
          const active = jobs.filter(j =>
            j.assignedEngineerId === eng.id && ['Assigned', 'In Progress'].includes(j.status)
          ).length;
          return (
            <Card key={eng.id} className="p-4 text-center h-full">
              <div className="w-12 h-12 mx-auto rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center text-[18px] font-medium mb-3 border border-cyan-100">
                {eng.name.charAt(0)}
              </div>
              <p className="text-[13px] font-medium text-gray-900 truncate mb-2">{eng.name}</p>
              <div className="flex items-center justify-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${active > 3 ? 'bg-amber-500' : 'bg-green-500'}`} />
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{active} Active</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Unassigned job cards */}
      {unassigned.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <p className="text-[18px] font-medium text-gray-900 mb-1">All jobs are assigned!</p>
          <p className="text-[13px] text-gray-500">There are no unassigned jobs at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {unassigned.map((job) => {
            const customer = customers.find(c => c.id === job.customerId);
            const device = devices.find(d => d.id === job.deviceId);
            const selectedEngId = selections[job.id] ?? '';
            const isJustAssigned = justAssigned[job.id];

            return (
              <Card
                key={job.id}
                className={`flex flex-col h-full transition-colors ${isJustAssigned ? 'border-green-300 bg-green-50' : 'hover:border-teal-300'}`}
              >
                <div className="p-5 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UrgencyDot createdAt={job.createdAt} />
                      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                        #{(job.id ?? '').slice(0, 8)}
                      </span>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>

                  <h3 className="text-[18px] font-medium text-gray-900 mb-1">{customer?.name ?? '—'}</h3>
                  <p className="text-[11px] font-medium text-teal-600 mb-4">
                    {device?.brand} {device?.model}
                  </p>

                  <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                    <p className="text-[11px] font-normal text-gray-600 leading-relaxed line-clamp-3">
                      {job.problemDescription}
                    </p>
                  </div>

                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                    Since {new Date(job.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>

                {/* Assignment controls */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                  <select
                    value={selectedEngId}
                    onChange={e => setSelections(prev => ({ ...prev, [job.id]: e.target.value }))}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 transition-colors"
                  >
                    <option value="">Select engineer...</option>
                    {engineers.map(e => {
                      const load = jobs.filter(j =>
                        j.assignedEngineerId === e.id && ['Assigned', 'In Progress'].includes(j.status)
                      ).length;
                      return (
                        <option key={e.id} value={e.id}>
                          {e.name} ({load} active)
                        </option>
                      );
                    })}
                  </select>

                  <Button
                    text="Assign"
                    variant="primary"
                    disabled={!selectedEngId}
                    onClick={() => handleAssign(job.id)}
                    className="px-4 shrink-0"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
};