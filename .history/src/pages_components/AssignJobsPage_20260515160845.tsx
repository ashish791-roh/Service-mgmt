import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge, UrgencyDot, Toast, useToast } from '../components/ui';
import { CheckCircle2, X, ChevronRight, CheckCircle } from 'lucide-react';

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

// ── Engineer History Drawer ─────────────────────────────────────────────────
const EngineerHistoryDrawer = ({ engineer, jobs, customers, devices, onClose }: any) => {
  const [tab, setTab] = useState<'active' | 'all'>('active');
  if (!engineer) return null;

  const engJobs = jobs.filter((j: any) => j.assignedEngineerId === engineer.id);
  const activeJobs = engJobs.filter((j: any) => ['Assigned', 'In Progress'].includes(j.status));
  const completedJobs = engJobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status));
  const overdueJobs = activeJobs.filter((j: any) => {
    const daysOld = Math.floor((Date.now() - new Date(j.createdAt).getTime()) / 86400000);
    return daysOld > 10;
  });
  const totalRevenue = completedJobs.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);

  const displayJobs = tab === 'active' ? activeJobs : engJobs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const jobStatusColors: Record<string, string> = {
    'New':         'border-cyan-400 text-cyan-700 bg-cyan-50',
    'Assigned':    'border-teal-400 text-teal-700 bg-teal-50',
    'In Progress': 'border-orange-400 text-orange-700 bg-orange-50',
    'Completed':   'border-green-400 text-green-700 bg-green-50',
    'Delivered':   'border-green-400 text-green-700 bg-green-50',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-[18px] font-medium border border-cyan-100">
              {engineer.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-[18px] font-medium text-gray-900">{engineer.name}</h2>
              <p className="text-[13px] text-gray-400 mt-0.5">{engineer.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-200 shrink-0">
          {[
            { label: 'Active', value: activeJobs.length, color: 'text-orange-600' },
            { label: 'Completed', value: completedJobs.length, color: 'text-green-600' },
            { label: 'Overdue', value: overdueJobs.length, color: overdueJobs.length > 0 ? 'text-red-600' : 'text-gray-400' },
            { label: 'Revenue', value: `₹${(totalRevenue / 1000).toFixed(1)}k`, color: 'text-teal-600' },
          ].map(s => (
            <div key={s.label} className="px-4 py-3 text-center">
              <p className={`text-[18px] font-medium ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white shrink-0 px-6">
          {[
            { id: 'active' as const, label: `Active (${activeJobs.length})` },
            { id: 'all' as const, label: `All History (${engJobs.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {displayJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <CheckCircle size={32} className="text-gray-300 mb-3" />
              <p className="text-[13px] font-medium text-gray-500">No jobs in this view</p>
            </div>
          ) : displayJobs.map((job: any) => {
            const customer = customers.find((c: any) => c.id === job.customerId);
            const device = devices.find((d: any) => d.id === job.deviceId);
            const daysOld = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000);
            const isOverdue = ['Assigned', 'In Progress'].includes(job.status) && daysOld > 10;
            const style = jobStatusColors[job.status] || 'border-gray-300 text-gray-700 bg-gray-50';
            const borderCls = style.split(' ')[0];
            const badgeCls = style.split(' ').slice(1).join(' ');

            return (
              <div key={job.id} className={`flex flex-col gap-2 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {customer?.name ?? 'Unknown'} · {device?.brand} {device?.model}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${badgeCls}`}>{job.status}</span>
                    {isOverdue && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700">Overdue</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span>{new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                  <span>·</span>
                  <span className={isOverdue ? 'text-red-600 font-semibold' : daysOld > 5 ? 'text-yellow-600' : 'text-gray-500'}>
                    {daysOld}d ago
                  </span>
                  <span>·</span>
                  <span className="font-medium text-gray-700">₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}</span>
                </div>
                {job.repairNotes && (
                  <p className="text-[11px] text-teal-700 bg-teal-50 rounded px-3 py-2 border border-teal-100">📝 {job.repairNotes}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const AssignJobsPage: React.FC = () => {
  const { jobs, customers, devices, users, assignEngineer } = useApp();
  const { toast, show } = useToast();
  const [selectedEngineer, setSelectedEngineer] = useState<any>(null);

  const engineers = users.filter(u => u.role === 'engineer' && u.active);
  const unassigned = jobs.filter(j => j.id && !j.assignedEngineerId && !['Completed', 'Delivered'].includes(j.status));
  // Also show assigned jobs so admin can reassign
  const assigned = jobs.filter(j => j.id && j.assignedEngineerId && !['Completed', 'Delivered'].includes(j.status));

  // Controlled select state: jobId → selected engineerId
  const [selections, setSelections] = useState<Record<string, string>>({});
  // Reassignment reason: jobId → reason text
  const [reasons, setReasons] = useState<Record<string, string>>({});
  // Track which jobs were just assigned (to show success state briefly)
  const [justAssigned, setJustAssigned] = useState<Record<string, boolean>>({});
  // Toggle reassign panel for assigned jobs
  const [reassignOpen, setReassignOpen] = useState<Record<string, boolean>>({});

  const handleAssign = (jobId: string) => {
    const engId = selections[jobId];
    if (!engId) return;
    const reason = reasons[jobId]?.trim() || undefined;
    assignEngineer(jobId, engId, reason);
    setJustAssigned(prev => ({ ...prev, [jobId]: true }));
    setTimeout(() => setJustAssigned(prev => { const n = { ...prev }; delete n[jobId]; return n; }), 1500);
    setSelections(prev => { const n = { ...prev }; delete n[jobId]; return n; });
    setReasons(prev => { const n = { ...prev }; delete n[jobId]; return n; });
    setReassignOpen(prev => { const n = { ...prev }; delete n[jobId]; return n; });
    const eng = engineers.find(e => e.id === engId);
    show(`Job assigned to ${eng?.name ?? 'engineer'} successfully.`);
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader
        title="Workforce Dispatch"
        subtitle={`${unassigned.length} job${unassigned.length !== 1 ? 's' : ''} require assignment — click an engineer card to view their job history`}
      />

      {/* Engineer load overview — now clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {engineers.map((eng) => {
          const active = jobs.filter(j =>
            j.assignedEngineerId === eng.id && ['Assigned', 'In Progress'].includes(j.status)
          ).length;
          const completed = jobs.filter(j =>
            j.assignedEngineerId === eng.id && ['Completed', 'Delivered'].includes(j.status)
          ).length;
          const overdue = jobs.filter(j => {
            if (j.assignedEngineerId !== eng.id) return false;
            if (!['Assigned', 'In Progress'].includes(j.status)) return false;
            return Math.floor((Date.now() - new Date(j.createdAt).getTime()) / 86400000) > 10;
          }).length;

          return (
            <Card
              key={eng.id}
              className="p-4 text-center h-full cursor-pointer hover:border-teal-300 hover:shadow-md transition-all group relative"
              onClick={() => setSelectedEngineer(eng)}
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={14} className="text-teal-500" />
              </div>
              <div className="w-12 h-12 mx-auto rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center text-[18px] font-medium mb-3 border border-cyan-100">
                {eng.name.charAt(0)}
              </div>
              <p className="text-[13px] font-medium text-gray-900 truncate mb-2">{eng.name}</p>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className={`w-2 h-2 rounded-full ${active > 5 ? 'bg-red-500' : active > 3 ? 'bg-amber-500' : 'bg-green-500'}`} />
                <p className={`text-[11px] font-medium uppercase tracking-wide ${active > 5 ? 'text-red-600' : active > 3 ? 'text-amber-600' : 'text-green-600'}`}>
                  {active > 5 ? 'High Load' : active > 3 ? 'Med Load' : 'Optimal'} ({active})
                </p>
              </div>
              {overdue > 0 && (
                <p className="text-[10px] font-medium text-red-500 uppercase tracking-wide">{overdue} Overdue</p>
              )}
              {completed > 0 && (
                <p className="text-[10px] font-medium text-green-600 uppercase tracking-wide">{completed} Done</p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Unassigned job cards */}
      {unassigned.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
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
                    {[...engineers].sort((a, b) => {
                      const loadA = jobs.filter(j => j.assignedEngineerId === a.id && ['Assigned', 'In Progress'].includes(j.status)).length;
                      const loadB = jobs.filter(j => j.assignedEngineerId === b.id && ['Assigned', 'In Progress'].includes(j.status)).length;
                      return loadA - loadB;
                    }).map((e, idx) => {
                      const load = jobs.filter(j =>
                        j.assignedEngineerId === e.id && ['Assigned', 'In Progress'].includes(j.status)
                      ).length;
                      return (
                        <option key={e.id} value={e.id}>
                          {e.name} ({load} active) {idx === 0 ? '— Recommended' : ''}
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

      {/* ── Assigned Jobs — Reassignment Section ─────────────────────── */}
      {assigned.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[15px] font-semibold text-gray-700">Assigned Jobs</h2>
            <span className="text-[11px] font-medium bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">{assigned.length} active</span>
            <p className="text-[12px] text-gray-400">Admin can reassign any active job — all transfers are logged with reason.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assigned.map((job) => {
              const customer = customers.find(c => c.id === job.customerId);
              const device = devices.find(d => d.id === job.deviceId);
              const currentEngineer = users.find(u => u.id === job.assignedEngineerId);
              const selectedEngId = selections[job.id] ?? '';
              const isJustAssigned = justAssigned[job.id];
              const isReassignOpen = reassignOpen[job.id] ?? false;

              return (
                <Card
                  key={job.id}
                  className={`flex flex-col h-full transition-colors ${isJustAssigned ? 'border-green-300 bg-green-50' : 'hover:border-orange-200'}`}
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <UrgencyDot createdAt={job.createdAt} />
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                          #{(job.id ?? '').slice(0, 8)}
                        </span>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>

                    <h3 className="text-[15px] font-medium text-gray-900 mb-0.5">{customer?.name ?? '—'}</h3>
                    <p className="text-[11px] font-medium text-teal-600 mb-3">{device?.brand} {device?.model}</p>

                    <div className="flex items-center gap-2 mb-3 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                      <X size={12} className="text-teal-500 shrink-0" style={{ transform: 'rotate(0)' }} />
                      <p className="text-[12px] font-medium text-teal-800">
                        Engineer: <span className="font-semibold">{currentEngineer?.name ?? '—'}</span>
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-[11px] font-normal text-gray-600 leading-relaxed line-clamp-2">
                        {job.problemDescription}
                      </p>
                    </div>
                  </div>

                  {/* Reassign toggle */}
                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => setReassignOpen(prev => ({ ...prev, [job.id]: !prev[job.id] }))}
                      className="w-full flex items-center justify-between px-4 py-3 text-[12px] font-medium text-orange-700 hover:bg-orange-50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <ChevronRight size={14} className={`transition-transform ${isReassignOpen ? 'rotate-90' : ''}`} />
                        Reassign Engineer
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">Logged with reason</span>
                    </button>

                    {isReassignOpen && (
                      <div className="px-4 pb-4 space-y-2 border-t border-orange-100 bg-orange-50">
                        <div className="pt-3">
                          <select
                            value={selectedEngId}
                            onChange={e => setSelections(prev => ({ ...prev, [job.id]: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-orange-400 transition-colors"
                          >
                            <option value="">Select new engineer...</option>
                            {[...engineers]
                              .filter(e => e.id !== job.assignedEngineerId)
                              .sort((a, b) => {
                                const loadA = jobs.filter(j => j.assignedEngineerId === a.id && ['Assigned', 'In Progress'].includes(j.status)).length;
                                const loadB = jobs.filter(j => j.assignedEngineerId === b.id && ['Assigned', 'In Progress'].includes(j.status)).length;
                                return loadA - loadB;
                              })
                              .map(e => {
                                const load = jobs.filter(j => j.assignedEngineerId === e.id && ['Assigned', 'In Progress'].includes(j.status)).length;
                                return (
                                  <option key={e.id} value={e.id}>{e.name} ({load} active)</option>
                                );
                              })}
                          </select>
                        </div>
                        <textarea
                          rows={2}
                          value={reasons[job.id] ?? ''}
                          onChange={e => setReasons(prev => ({ ...prev, [job.id]: e.target.value }))}
                          placeholder="Reason for reassignment (e.g. Engineer on leave, specialist required)..."
                          className="w-full bg-white text-[12px] border border-gray-200 rounded-lg px-3 py-2 focus:border-orange-400 focus:outline-none resize-none"
                        />
                        <div className="flex justify-end">
                          <Button
                            text="Confirm Reassignment"
                            variant="primary"
                            disabled={!selectedEngId}
                            onClick={() => handleAssign(job.id)}
                            className="text-[12px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Engineer history drawer */}
      {selectedEngineer && (
        <EngineerHistoryDrawer
          engineer={selectedEngineer}
          jobs={jobs}
          customers={customers}
          devices={devices}
          onClose={() => setSelectedEngineer(null)}
        />
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
};