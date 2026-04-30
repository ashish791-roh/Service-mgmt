import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard, Modal, FormSelect, FormTextarea, FormInput, StatusBadge, UrgencyDot, PartStatusBadge, EmptyState, Toast, useToast } from '../components/ui';
import type { JobStatus } from '../types';

export const EngineerDashboard: React.FC = () => {
  const { currentUser, jobs, notifications, markNotificationRead, customers, devices } = useApp();
  if (!currentUser) return null;

  const myJobs = jobs.filter(j => j.assignedEngineerId === currentUser.id);
  const myNotifs = notifications.filter(n => n.userId === currentUser.id && !n.read);
  const active = myJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status));
  const completed = myJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">My Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back, {currentUser.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Active Jobs" value={active.length} icon="⚙️" color="text-amber-600" sub="In progress" />
        <StatCard label="Completed" value={completed.length} icon="✅" color="text-emerald-600" />
        <StatCard label="Notifications" value={myNotifs.length} icon="🔔" color="text-red-600" sub="Unread" />
      </div>

      {myNotifs.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
          <h3 className="font-bold text-indigo-700 flex items-center gap-2">🔔 New Notifications</h3>
          {myNotifs.map(n => (
            <div key={n.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-indigo-100">
              <p className="text-sm text-slate-700">{n.message}</p>
              <button onClick={() => markNotificationRead(n.id)} className="text-xs text-indigo-500 hover:underline font-semibold ml-4 shrink-0">Mark read</button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-50 font-bold text-slate-800">My Active Jobs</div>
        {active.length === 0 ? (
          <EmptyState icon="🎉" title="No active jobs" desc="All caught up! Check back for new assignments." />
        ) : (
          <div className="divide-y divide-slate-50">
            {active.map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              const device = devices.find(d => d.id === job.deviceId);
              return (
                <div key={job.id} className="flex items-center gap-4 px-6 py-3.5">
                  <UrgencyDot createdAt={job.createdAt} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">{customer?.name} — {device?.brand} {device?.model}</p>
                    <p className="text-xs text-slate-400 truncate">{job.problemDescription}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const MyJobsPage: React.FC = () => {
  const { currentUser, jobs, customers, devices, partRequests, updateJobStatus, addPartRequest } = useApp();
  const { toast, show } = useToast();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [showPartModal, setShowPartModal] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{ status: string; notes: string }>({ status: '', notes: '' });
  const [partForm, setPartForm] = useState({ partName: '', quantity: '1', reason: '' });

  if (!currentUser) return null;
  const myJobs = jobs.filter(j => j.assignedEngineerId === currentUser.id);

  const JOB_STATUSES: JobStatus[] = ['Assigned', 'In Progress', 'Completed'];

  const handleStatusUpdate = (jobId: string) => {
    if (!statusUpdate.status) { show('Select a status', 'error'); return; }
    updateJobStatus(jobId, statusUpdate.status as JobStatus, statusUpdate.notes);
    setSelectedJob(null);
    show('Job status updated!');
  };

  const handlePartRequest = (jobId: string) => {
    if (!partForm.partName || !partForm.reason) { show('Fill all fields', 'error'); return; }
    if (!currentUser) return;
    addPartRequest({ jobId, engineerId: currentUser.id, ...partForm, quantity: parseInt(partForm.quantity) });
    setShowPartModal(null);
    setPartForm({ partName: '', quantity: '1', reason: '' });
    show('Part request submitted!');
  };

  const statusColors: Record<string, string> = {
    New: 'border-l-slate-400',
    Assigned: 'border-l-blue-400',
    'In Progress': 'border-l-amber-400',
    Completed: 'border-l-emerald-400',
    Delivered: 'border-l-purple-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">My Jobs</h1>
        <p className="text-slate-500 text-sm mt-1">{myJobs.length} assigned jobs</p>
      </div>

      {myJobs.length === 0 && <EmptyState icon="📋" title="No jobs assigned yet" desc="You'll see your jobs here once they're assigned to you." />}

      <div className="space-y-4">
        {myJobs.map(job => {
          const customer = customers.find(c => c.id === job.customerId);
          const device = devices.find(d => d.id === job.deviceId);
          const myPartReqs = partRequests.filter(r => r.jobId === job.id);

          return (
            <div key={job.id} className={`bg-white rounded-2xl border border-slate-100 shadow-sm border-l-4 ${statusColors[job.status] ?? ''} overflow-hidden`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <UrgencyDot createdAt={job.createdAt} />
                      <span className="text-xs font-mono text-slate-400">#{job.id}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <h3 className="font-bold text-slate-800">{customer?.name}</h3>
                    <p className="text-sm text-slate-500">📱 {customer?.phone} · {device?.brand} {device?.model} ({device?.type})</p>
                    <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg p-3">{job.problemDescription}</p>
                    {job.repairNotes && (
                      <p className="text-sm text-indigo-600 mt-2 bg-indigo-50 rounded-lg p-3">📝 {job.repairNotes}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">Registered: {new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!['Completed', 'Delivered'].includes(job.status) && (
                      <button onClick={() => { setSelectedJob(job.id); setStatusUpdate({ status: job.status, notes: job.repairNotes ?? '' }); }}
                        className="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-xl transition">
                        Update Status
                      </button>
                    )}
                    {!['Completed', 'Delivered'].includes(job.status) && (
                      <button onClick={() => setShowPartModal(job.id)}
                        className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl border border-amber-200 transition">
                        Request Part
                      </button>
                    )}
                  </div>
                </div>

                {myPartReqs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Part Requests</p>
                    <div className="flex flex-wrap gap-2">
                      {myPartReqs.map(r => (
                        <div key={r.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 text-xs border border-slate-100">
                          <span className="font-medium text-slate-700">{r.partName}</span>
                          <span className="text-slate-400">×{r.quantity}</span>
                          <PartStatusBadge status={r.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedJob && (
        <Modal title="Update Job Status" onClose={() => setSelectedJob(null)}>
          <div className="space-y-4">
            <FormSelect label="New Status" value={statusUpdate.status} onChange={e => setStatusUpdate(s => ({ ...s, status: e.target.value }))}
              options={JOB_STATUSES.map(s => ({ value: s, label: s }))} placeholder="Select status…" />
            <FormTextarea label="Repair Notes (optional)" value={statusUpdate.notes} onChange={e => setStatusUpdate(s => ({ ...s, notes: e.target.value }))}
              placeholder="Add notes about the repair..." rows={4} />
            <div className="flex gap-3">
              <button onClick={() => setSelectedJob(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => handleStatusUpdate(selectedJob)} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">Update</button>
            </div>
          </div>
        </Modal>
      )}

      {showPartModal && (
        <Modal title="Request a Part" onClose={() => setShowPartModal(null)}>
          <div className="space-y-4">
            <FormInput label="Part Name *" value={partForm.partName} onChange={e => setPartForm(f => ({ ...f, partName: e.target.value }))} placeholder="e.g. LCD Screen Panel 15 inch" />
            <FormInput label="Quantity *" type="number" min="1" value={partForm.quantity} onChange={e => setPartForm(f => ({ ...f, quantity: e.target.value }))} placeholder="1" />
            <FormTextarea label="Reason *" value={partForm.reason} onChange={e => setPartForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Why is this part needed?" rows={3} />
            <div className="flex gap-3">
              <button onClick={() => setShowPartModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => handlePartRequest(showPartModal)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">Submit Request</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
};
