import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wrench, CheckCircle, Bell, Clipboard, Package, Activity, X } from 'lucide-react';
import type { JobStatus } from '../types';

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

const MetricCard = ({ title, value, icon: Icon, color, sub }: any) => {
  const colorMap: Record<string, string> = {
    teal: "text-teal-500 bg-teal-50",
    cyan: "text-cyan-500 bg-cyan-50",
    green: "text-green-500 bg-green-50",
    orange: "text-orange-500 bg-orange-50",
  };
  const bgClass = colorMap[color] || colorMap.teal;

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 relative overflow-hidden flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        {sub && <span className="bg-gray-100 text-gray-500 text-[11px] font-medium px-2 py-1 rounded-lg">{sub}</span>}
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <h3 className="text-[18px] font-medium text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );
};

const Button = ({ text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: any = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    warning: "bg-orange-500 text-white hover:bg-orange-600",
  };
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
      {text}
    </button>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'New': 'bg-cyan-50 text-cyan-700 border-l-2 border-cyan-500',
    'Assigned': 'bg-teal-50 text-teal-700 border-l-2 border-teal-500',
    'In Progress': 'bg-orange-50 text-orange-700 border-l-2 border-orange-500',
    'Completed': 'bg-green-50 text-green-700 border-l-2 border-green-500',
    'Delivered': 'bg-gray-100 text-gray-600 border-l-2 border-gray-400',
  };
  const style = styles[status] || 'bg-gray-50 text-gray-600 border-l-2 border-gray-400';
  return (
    <span className={`px-3 py-1 rounded-r text-[11px] font-medium uppercase tracking-wide inline-block ${style}`}>
      {status}
    </span>
  );
};

const PartStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'Pending': 'bg-orange-50 text-orange-700 border border-orange-200',
    'Approved': 'bg-teal-50 text-teal-700 border border-teal-200',
    'Rejected': 'bg-red-50 text-red-700 border border-red-200',
  };
  const style = styles[status] || 'bg-gray-50 text-gray-600 border border-gray-200';
  return (
    <span className={`px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide inline-block ${style}`}>
      {status}
    </span>
  );
};

export const EngineerDashboard: React.FC = () => {
  const { currentUser, jobs, notifications, markNotificationRead, customers, devices } = useApp();
  if (!currentUser) return null;

  const myJobs = jobs.filter(j => j.assignedEngineerId === currentUser.id);
  const myNotifs = notifications.filter(n => n.userId === currentUser.id && !n.read);
  const active = myJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status));
  const completed = myJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Workspace Overview" subtitle={`Welcome back, ${currentUser.name}`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Active Repairs" value={active.length} icon={Wrench} color="cyan" sub="In Pipeline" />
        <MetricCard title="Completed" value={completed.length} icon={CheckCircle} color="green" sub="Total" />
        <MetricCard title="Alerts" value={myNotifs.length} icon={Bell} color="orange" sub="Unread" />
      </div>

      {myNotifs.length > 0 && (
        <Card className="bg-orange-50 border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <h3 className="text-[13px] font-medium text-gray-900">Recent Alerts</h3>
          </div>
          <div className="space-y-2">
            {myNotifs.map((n) => (
              <div key={n.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-orange-100">
                <p className="text-[13px] font-normal text-gray-700">{n.message}</p>
                <button onClick={() => markNotificationRead(n.id)} className="text-[11px] bg-orange-100 text-orange-700 px-3 py-1 rounded-md hover:bg-orange-200 font-medium uppercase tracking-wide ml-4 shrink-0 transition-colors">
                  Mark read
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-[13px] font-medium text-gray-900">Active Job Pipeline</h2>
        </div>
        {active.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
              <CheckCircle size={24} />
            </div>
            <p className="text-[13px] font-medium text-gray-900 mb-1">Queue Empty</p>
            <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">You are completely caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {active.map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              const device = devices.find(d => d.id === job.deviceId);
              return (
                <div key={job.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-transparent hover:border-teal-500">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded">#{job.id}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-[13px] font-medium text-gray-900 mb-0.5">{customer?.name}</p>
                    <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide mb-2">{device?.brand} {device?.model}</p>
                    <p className="text-[13px] font-normal text-gray-600 max-w-2xl">{job.problemDescription}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export const MyJobsPage: React.FC = () => {
  const { currentUser, jobs, customers, devices, partRequests, updateJobStatus, addPartRequest } = useApp();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [showPartModal, setShowPartModal] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{ status: string; notes: string }>({ status: '', notes: '' });
  const [partForm, setPartForm] = useState({ partName: '', quantity: '1', reason: '' });

  if (!currentUser) return null;
  const myJobs = jobs.filter(j => j.assignedEngineerId === currentUser.id);

  const JOB_STATUSES: JobStatus[] = ['Assigned', 'In Progress', 'Completed'];

  const handleStatusUpdate = (jobId: string) => {
    if (!statusUpdate.status) { alert('Select a status'); return; }
    updateJobStatus(jobId, statusUpdate.status as JobStatus, statusUpdate.notes);
    setSelectedJob(null);
  };

  const handlePartRequest = (jobId: string) => {
    if (!partForm.partName || !partForm.reason) { alert('Fill all fields'); return; }
    addPartRequest({ jobId, engineerId: currentUser.id, ...partForm, quantity: parseInt(partForm.quantity) });
    setShowPartModal(null);
    setPartForm({ partName: '', quantity: '1', reason: '' });
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Job Queue" subtitle="Manage repairs and order parts" />

      {myJobs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Clipboard size={24} />
          </div>
          <p className="text-[18px] font-medium text-gray-900 mb-1">No jobs assigned</p>
          <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">Jobs will appear here once dispatched.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {myJobs.map((job) => {
            const customer = customers.find(c => c.id === job.customerId);
            const device = devices.find(d => d.id === job.deviceId);
            const myPartReqs = partRequests.filter(r => r.jobId === job.id);
            const isCompleted = ['Completed', 'Delivered'].includes(job.status);
            
            return (
              <Card key={job.id} className="flex flex-col">
                <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4 bg-gray-50/50">
                  <div className="w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide bg-gray-200 px-2 py-1 rounded">#{job.id}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-[18px] font-medium text-gray-900">{customer?.name}</h3>
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">📞 {customer?.phone}</span>
                    </div>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{device?.brand} {device?.model} • {device?.type}</p>
                  </div>
                </div>

                <div className="p-5 flex-1 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Activity size={12} /> Issue Description
                    </p>
                    <p className="text-[13px] font-normal text-gray-700">{job.problemDescription}</p>
                  </div>
                  
                  {job.repairNotes && (
                    <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                      <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mb-1">Repair Notes</p>
                      <p className="text-[13px] font-normal text-teal-900">{job.repairNotes}</p>
                    </div>
                  )}

                  {myPartReqs.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Package size={12} /> Parts Ordered
                      </p>
                      <div className="flex flex-col gap-2">
                        {myPartReqs.map(r => (
                          <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                            <span className="font-medium text-[13px] text-gray-700">{r.partName} <span className="text-gray-400 ml-1">×{r.quantity}</span></span>
                            <PartStatusBadge status={r.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 bg-gray-50 border-t border-gray-200 flex gap-3">
                  {!isCompleted ? (
                    <>
                      <Button text="Update Status" variant="primary" onClick={() => { setSelectedJob(job.id); setStatusUpdate({ status: job.status, notes: job.repairNotes ?? '' }); }} className="flex-1" />
                      <Button text="Order Part" variant="warning" onClick={() => setShowPartModal(job.id)} className="flex-1" />
                    </>
                  ) : (
                    <div className="w-full text-center py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide bg-gray-200 rounded-lg">
                      Job Concluded
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-[18px] font-medium text-gray-900">Update Status</h2>
              <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">New Status *</label>
                <select 
                  value={statusUpdate.status} onChange={e => setStatusUpdate(s => ({ ...s, status: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500"
                >
                  <option value="" disabled>Select phase...</option>
                  {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Repair Notes (Optional)</label>
                <textarea 
                  value={statusUpdate.notes} onChange={e => setStatusUpdate(s => ({ ...s, notes: e.target.value }))}
                  placeholder="Log technical details or issues..." rows={4}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-normal text-gray-700 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button text="Cancel" variant="outline" onClick={() => setSelectedJob(null)} className="w-full" />
              <Button text="Save Update" variant="success" onClick={() => handleStatusUpdate(selectedJob)} className="w-full" />
            </div>
          </div>
        </div>
      )}

      {showPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-[18px] font-medium text-gray-900">Order Parts</h2>
              <button onClick={() => setShowPartModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Part Name *</label>
                <input value={partForm.partName} onChange={e => setPartForm(f => ({ ...f, partName: e.target.value }))} placeholder="e.g. iPhone 13 Screen Assembly"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Quantity *</label>
                <input type="number" min="1" value={partForm.quantity} onChange={e => setPartForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Reason / Diagnostics *</label>
                <textarea value={partForm.reason} onChange={e => setPartForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why is this component required?" rows={3}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-normal text-gray-700 focus:outline-none focus:border-orange-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button text="Cancel" variant="outline" onClick={() => setShowPartModal(null)} className="w-full" />
              <Button text="Submit Request" variant="warning" onClick={() => handlePartRequest(showPartModal)} className="w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
