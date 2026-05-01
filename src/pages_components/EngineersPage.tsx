import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Modal, StatusBadge, PartStatusBadge, Toast, useToast } from '../components/ui';
import type { JobStatus } from '../types';

// ── Icons ────────────────────────────────────────────────────────
const Icons = {
  Tool: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  CheckCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Bell: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Clipboard: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  Box: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
};

// ── Shared UI Components ─────────────────────────────────────────
const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight leading-tight">{title}</h1>
      <p className="text-sm font-bold text-violet-500 uppercase tracking-widest mt-2">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </motion.div>
);

const AnimatedCard = ({ children, delay = 0, className = "" }: any) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className={`bg-white rounded-[2rem] border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)] hover:border-violet-100 transition-all duration-300 overflow-hidden ${className}`}>
    {children}
  </motion.div>
);

const InteractiveStatCard = ({ title, value, icon, gradient, delay, sub }: any) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay, ease: "easeOut" }} whileHover={{ scale: 1.02 }} className="relative bg-white rounded-3xl p-5 border border-slate-100 shadow-sm overflow-hidden group cursor-pointer">
    <div className={`absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl group-hover:scale-150 group-hover:opacity-20 transition-all duration-500`} />
    <div className="flex justify-between items-start mb-4 relative z-10">
      <motion.div whileHover={{ rotate: 10, scale: 1.1 }} className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>
        {Icons[icon as keyof typeof Icons]}
      </motion.div>
      {sub && <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">{sub}</span>}
    </div>
    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <div className="flex items-end gap-3 relative z-10">
      <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{value}</h3>
    </div>
  </motion.div>
);

const GlowButton = ({ icon, text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: any = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_8px_16px_rgba(0,0,0,0.15)]",
    vivid: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_12px_25px_rgba(139,92,246,0.4)]",
    warning: "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_8px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_12px_25px_rgba(245,158,11,0.4)]",
  };
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick} className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all ${styles[variant]} ${className}`}>
      {icon && <span className="text-lg">{icon}</span>}
      {text}
    </motion.button>
  );
};

// ── EngineerDashboard ────────────────────────────────────────────
export const EngineerDashboard: React.FC = () => {
  const { currentUser, jobs, notifications, markNotificationRead, customers, devices } = useApp();
  if (!currentUser) return null;

  const myJobs = jobs.filter(j => j.assignedEngineerId === currentUser.id);
  const myNotifs = notifications.filter(n => n.userId === currentUser.id && !n.read);
  const active = myJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status));
  const completed = myJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Workspace Overview" subtitle={`Welcome back, ${currentUser.name}`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InteractiveStatCard title="Active Repairs" value={active.length} icon="Tool" gradient="from-blue-600 to-cyan-400" delay={0.1} sub="In Pipeline" />
        <InteractiveStatCard title="Completed" value={completed.length} icon="CheckCircle" gradient="from-emerald-500 to-teal-400" delay={0.2} sub="Total" />
        <InteractiveStatCard title="Alerts" value={myNotifs.length} icon="Bell" gradient="from-rose-500 to-orange-400" delay={0.3} sub="Unread" />
      </div>

      <AnimatePresence>
        {myNotifs.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <AnimatedCard delay={0.4} className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-100 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
                  {Icons.Bell}
                </div>
                <h3 className="text-lg font-black text-violet-900 tracking-tight">Recent Alerts</h3>
              </div>
              <div className="space-y-3">
                {myNotifs.map((n, i) => (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + (i * 0.1) }} key={n.id} 
                    className="flex items-center justify-between bg-white rounded-2xl px-5 py-4 shadow-sm border border-violet-100/50">
                    <p className="text-sm font-bold text-slate-700">{n.message}</p>
                    <button onClick={() => markNotificationRead(n.id)} className="text-[10px] bg-violet-100 text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-500 hover:text-white font-black uppercase tracking-widest ml-4 shrink-0 transition-colors">
                      Mark read
                    </button>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatedCard delay={0.5}>
        <div className="px-8 py-6 border-b border-slate-100/80 bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Job Pipeline</h2>
        </div>
        {active.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 text-3xl">🎉</div>
            <p className="text-xl font-black text-slate-900 mb-1">Queue Empty</p>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">You are completely caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {active.map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              const device = devices.find(d => d.id === job.deviceId);
              return (
                <div key={job.id} className="flex flex-col sm:flex-row sm:items-center gap-6 px-8 py-6 hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md">#{job.id}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-base font-black text-slate-900 group-hover:text-violet-600 transition-colors mb-1">{customer?.name}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{device?.brand} {device?.model}</p>
                    <p className="text-sm font-semibold text-slate-600 max-w-2xl">{job.problemDescription}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AnimatedCard>
    </div>
  );
};

// ── MyJobsPage ───────────────────────────────────────────────────
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
    show('Job status updated successfully!');
  };

  const handlePartRequest = (jobId: string) => {
    if (!partForm.partName || !partForm.reason) { show('Fill all fields', 'error'); return; }
    addPartRequest({ jobId, engineerId: currentUser.id, ...partForm, quantity: parseInt(partForm.quantity) });
    setShowPartModal(null);
    setPartForm({ partName: '', quantity: '1', reason: '' });
    show('Part request submitted for approval!');
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Job Queue" subtitle="Manage repairs and order parts" />

      {myJobs.length === 0 ? (
        <AnimatedCard className="p-16 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 shadow-inner">
            {Icons.Clipboard}
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight mb-2">No jobs assigned</p>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Jobs will appear here once dispatched.</p>
        </AnimatedCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AnimatePresence>
            {myJobs.map((job, i) => {
              const customer = customers.find(c => c.id === job.customerId);
              const device = devices.find(d => d.id === job.deviceId);
              const myPartReqs = partRequests.filter(r => r.jobId === job.id);
              
              const isCompleted = ['Completed', 'Delivered'].includes(job.status);
              
              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-[2rem] border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)] hover:border-violet-100 transition-all duration-300 overflow-hidden flex flex-col">
                  
                  {/* Card Header */}
                  <div className="p-6 border-b border-slate-50 flex items-start justify-between gap-4 bg-slate-50/30">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md">#{job.id}</span>
                        <StatusBadge status={job.status} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">{customer?.name}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{device?.brand} {device?.model} • {device?.type}</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        {Icons.Activity} Issue Description
                      </p>
                      <p className="text-sm font-semibold text-slate-700">{job.problemDescription}</p>
                    </div>
                    
                    {job.repairNotes && (
                      <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100/50">
                        <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1.5">Repair Notes</p>
                        <p className="text-sm font-semibold text-violet-900">{job.repairNotes}</p>
                      </div>
                    )}

                    {/* Part Requests */}
                    {myPartReqs.length > 0 && (
                      <div className="pt-2 border-t border-slate-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          {Icons.Box} Parts Ordered
                        </p>
                        <div className="flex flex-col gap-2">
                          {myPartReqs.map(r => (
                            <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100/50">
                              <span className="font-bold text-sm text-slate-700">{r.partName} <span className="text-slate-400 ml-1">×{r.quantity}</span></span>
                              <PartStatusBadge status={r.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                    {!isCompleted ? (
                      <>
                        <GlowButton text="Update Status" variant="vivid" onClick={() => { setSelectedJob(job.id); setStatusUpdate({ status: job.status, notes: job.repairNotes ?? '' }); }} className="flex-1 !py-3 !text-[11px] uppercase tracking-wider" />
                        <GlowButton text="Order Part" variant="warning" onClick={() => setShowPartModal(job.id)} className="flex-1 !py-3 !text-[11px] uppercase tracking-wider" />
                      </>
                    ) : (
                      <div className="w-full text-center py-2 text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-100 rounded-xl">
                        Job Concluded
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Update Status Modal */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Update Status</h2>
                  <p className="text-sm font-bold text-violet-500 uppercase tracking-widest mt-1">Log progress</p>
                </div>
                <button onClick={() => setSelectedJob(null)} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors font-bold text-xl">✕</button>
              </div>

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">New Status *</label>
                  <select 
                    value={statusUpdate.status} onChange={e => setStatusUpdate(s => ({ ...s, status: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all appearance-none"
                  >
                    <option value="" disabled>Select phase...</option>
                    {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Repair Notes (Optional)</label>
                  <textarea 
                    value={statusUpdate.notes} onChange={e => setStatusUpdate(s => ({ ...s, notes: e.target.value }))}
                    placeholder="Log technical details or issues..." rows={4}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-700 focus:outline-none focus:border-violet-500 focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-10 relative z-10">
                <GlowButton text="Cancel" variant="primary" onClick={() => setSelectedJob(null)} className="px-8 !bg-slate-100 !text-slate-700 hover:!bg-slate-200 shadow-none" />
                <GlowButton text="Save Update" variant="vivid" onClick={() => handleStatusUpdate(selectedJob)} className="flex-1" />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Request Part Modal */}
        {showPartModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Order Parts</h2>
                  <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mt-1">Submit logistics request</p>
                </div>
                <button onClick={() => setShowPartModal(null)} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors font-bold text-xl">✕</button>
              </div>

              <div className="space-y-5 relative z-10">
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Part Name *</label>
                  <input value={partForm.partName} onChange={e => setPartForm(f => ({ ...f, partName: e.target.value }))} placeholder="e.g. iPhone 13 Screen Assembly"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Quantity *</label>
                  <input type="number" min="1" value={partForm.quantity} onChange={e => setPartForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Reason / Diagnostics *</label>
                  <textarea value={partForm.reason} onChange={e => setPartForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why is this component required?" rows={3}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-700 focus:outline-none focus:border-amber-500 focus:bg-white transition-all resize-none" />
                </div>
              </div>

              <div className="flex gap-4 mt-10 relative z-10">
                <GlowButton text="Cancel" variant="primary" onClick={() => setShowPartModal(null)} className="px-8 !bg-slate-100 !text-slate-700 hover:!bg-slate-200 shadow-none" />
                <GlowButton text="Submit Request" variant="warning" onClick={() => handlePartRequest(showPartModal)} className="flex-1" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && <Toast {...toast} />}
    </div>
  );
};
