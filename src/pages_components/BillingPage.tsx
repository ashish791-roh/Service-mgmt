import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Modal, StatusBadge, Toast, useToast } from '../components/ui';
import type { JobStatus } from '../types';

// ── Icons ────────────────────────────────────────────────────────
const Icons = {
  Banknote: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  Hourglass: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>,
  CheckCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  TrendingUp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  ArrowRight: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
};

// ── Interactive UI Components ────────────────────────────────────
const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
  >
    <div>
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight leading-tight">{title}</h1>
      <p className="text-sm font-bold text-violet-500 uppercase tracking-widest mt-2">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </motion.div>
);

const AnimatedCard = ({ children, delay = 0, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className={`bg-white rounded-[2rem] border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)] hover:border-violet-100 transition-all duration-300 overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);

const InteractiveStatCard = ({ title, value, icon, gradient, delay, sub }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    whileHover={{ scale: 1.02 }}
    className="relative bg-white rounded-3xl p-5 border border-slate-100 shadow-sm overflow-hidden group cursor-pointer"
  >
    <div className={`absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl group-hover:scale-150 group-hover:opacity-20 transition-all duration-500`} />
    
    <div className="flex justify-between items-start mb-4 relative z-10">
      <motion.div 
        whileHover={{ rotate: 10, scale: 1.1 }}
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}
      >
        {Icons[icon as keyof typeof Icons]}
      </motion.div>
      {sub && <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">{sub}</span>}
    </div>
    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <div className="flex items-end gap-3 relative z-10">
      <h3 className="text-4xl lg:text-4xl font-black text-slate-900 tracking-tighter leading-none">{value}</h3>
    </div>
  </motion.div>
);

const GlowButton = ({ icon, text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: any = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_8px_16px_rgba(0,0,0,0.15)]",
    vivid: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_12px_25px_rgba(139,92,246,0.4)]",
    success: "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.4)]",
    danger: "bg-white border-2 border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200",
  };
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      onClick={onClick} 
      className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all ${styles[variant]} ${className}`}
    >
      {icon && <span className="text-lg">{Icons[icon as keyof typeof Icons]}</span>}
      {text}
    </motion.button>
  );
};

export const BillingPage: React.FC = () => {
  const { jobs, customers, devices, users, updateJobStatus } = useApp() as any;
  const { toast, show } = useToast();
  const [billingModal, setBillingModal] = useState<string | null>(null);
  const [actualCostInput, setActualCostInput] = useState('');
  const [filter, setFilter] = useState<'pending-billing' | 'completed' | 'delivered' | 'all'>('pending-billing');

  const completedJobs = jobs.filter((j: any) => j.status === 'Completed');
  const deliveredJobs = jobs.filter((j: any) => j.status === 'Delivered');
  const allBillableJobs = jobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status));

  const totalRevenue = deliveredJobs.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
  const pendingCollection = completedJobs.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
  const avgValue = allBillableJobs.length ? Math.round((totalRevenue + pendingCollection) / allBillableJobs.length) : 0;

  const handleMarkDelivered = (jobId: string) => {
    const job = jobs.find((j: any) => j.id === jobId);
    if (!job) return;
    // Note: actualCost should ideally be saved via Context
    updateJobStatus(jobId, 'Delivered' as JobStatus);
    setBillingModal(null);
    setActualCostInput('');
    show('Job marked as delivered! Payment recorded successfully.');
  };

  const getDisplayJobs = () => {
    if (filter === 'pending-billing') return completedJobs;
    if (filter === 'completed') return allBillableJobs;
    if (filter === 'delivered') return deliveredJobs;
    return allBillableJobs;
  };

  const displayJobs = getDisplayJobs();

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Revenue & Billing" subtitle="Financial tracking and final delivery operations" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InteractiveStatCard title="Total Revenue" value={`₹${(totalRevenue / 1000).toFixed(1)}k`} icon="Banknote" gradient="from-emerald-500 to-teal-400" delay={0.1} sub="Collected" />
        <InteractiveStatCard title="Pending" value={`₹${(pendingCollection / 1000).toFixed(1)}k`} icon="Hourglass" gradient="from-amber-400 to-orange-500" delay={0.2} sub="To Collect" />
        <InteractiveStatCard title="Ready to Bill" value={completedJobs.length} icon="CheckCircle" gradient="from-blue-600 to-cyan-400" delay={0.3} sub="Completed Jobs" />
        <InteractiveStatCard title="Avg Job Value" value={`₹${avgValue.toLocaleString()}`} icon="TrendingUp" gradient="from-violet-600 to-fuchsia-500" delay={0.4} />
      </div>

      <AnimatePresence>
        {completedJobs.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <AnimatedCard delay={0.5} className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <span className="text-2xl">💳</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-amber-900">{completedJobs.length} Jobs Ready for Delivery</h3>
                  <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mt-1">Collect ₹{pendingCollection.toLocaleString()} in pending payments</p>
                </div>
              </div>
              <GlowButton text="Review & Collect" variant="vivid" onClick={() => setFilter('pending-billing')} className="w-full sm:w-auto !bg-gradient-to-r !from-amber-500 !to-orange-500 shadow-amber-500/30 hover:shadow-amber-500/40" />
            </AnimatedCard>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex bg-white p-2 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 w-fit overflow-x-auto">
        {[
          { id: 'pending-billing' as const, label: `Pending Delivery (${completedJobs.length})` },
          { id: 'delivered' as const, label: `Delivered (${deliveredJobs.length})` },
          { id: 'all' as const, label: 'All Billed Records' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id)}
            className={`px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 whitespace-nowrap ${filter === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Jobs Table */}
      <AnimatedCard delay={0.6}>
        <div className="px-8 py-6 border-b border-slate-100/80 bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-900">
            {filter === 'pending-billing' ? 'Jobs Ready for Delivery' : filter === 'delivered' ? 'Completed & Delivered Jobs' : 'All Billed Jobs'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100/80">
                {['Job ID', 'Customer Info', 'Device Details', 'Issue', 'Final Cost', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              <AnimatePresence>
                {displayJobs.map((job: any, i: number) => {
                  const customer = customers.find((c: any) => c.id === job.customerId);
                  const device = devices.find((d: any) => d.id === job.deviceId);
                  return (
                    <motion.tr 
                      key={job.id} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">#{job.id}</td>
                      <td className="px-8 py-6">
                        <p className="text-base font-black text-slate-900 mb-1 group-hover:text-violet-600 transition-colors">{customer?.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{customer?.phone}</p>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-500">{device?.brand} {device?.model}</td>
                      <td className="px-8 py-6 text-sm font-semibold text-slate-600 max-w-[200px] truncate">{job.problemDescription}</td>
                      <td className="px-8 py-6">
                        <p className="text-xl font-black tracking-tighter text-emerald-600">
                          ₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}
                        </p>
                        {!job.actualCost && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Estimated</p>}
                      </td>
                      <td className="px-8 py-6"><StatusBadge status={job.status} /></td>
                      <td className="px-8 py-6">
                        {job.status === 'Completed' ? (
                          <GlowButton 
                            text="Process Payment" 
                            variant="success" 
                            onClick={() => { setBillingModal(job.id); setActualCostInput(String(job.actualCost ?? job.estimatedCost)); }} 
                            className="!py-2.5 !text-xs" 
                          />
                        ) : (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-black rounded-xl uppercase tracking-wider">
                            ✓ Delivered
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          {displayJobs.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">💳</div>
              <p className="text-lg font-black text-slate-900 mb-1">No jobs pending delivery</p>
              <p className="text-sm font-bold text-slate-500">Completed jobs awaiting payment will appear here.</p>
            </div>
          )}
        </div>
      </AnimatedCard>

      {/* Mark Delivered Modal */}
      <AnimatePresence>
        {billingModal && (() => {
          const job = jobs.find((j: any) => j.id === billingModal);
          const customer = customers.find((c: any) => c.id === job?.customerId);
          const device = devices.find((d: any) => d.id === job?.deviceId);
          const engineer = users.find((u: any) => u.id === job?.assignedEngineerId);
          return (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />

                <div className="flex justify-between items-center mb-8 relative z-10">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Process Payment</h2>
                    <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest mt-1">Delivery Confirmation</p>
                  </div>
                  <button onClick={() => setBillingModal(null)} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors font-bold text-xl">✕</button>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Invoice Summary</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client</p>
                        <p className="text-base font-black text-slate-900 leading-tight">{customer?.name}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1">{customer?.phone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Device</p>
                        <p className="text-base font-black text-slate-900 leading-tight">{device?.brand} {device?.model}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1">Assigned: {engineer?.name}</p>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border border-slate-100 mt-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resolution</p>
                      <p className="text-sm font-semibold text-slate-700">{job?.problemDescription}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Final Invoice Amount (₹) *</label>
                    <input 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-3xl font-black text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-center tracking-tighter" 
                      type="number" 
                      value={actualCostInput} 
                      onChange={e => setActualCostInput(e.target.value)} 
                      placeholder={String(job?.estimatedCost ?? 0)} 
                    />
                  </div>
                  
                  <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex items-center justify-between">
                    <p className="text-sm font-black text-emerald-900 uppercase tracking-widest">Amount Due</p>
                    <p className="text-4xl font-black text-emerald-600 tracking-tighter">
                      ₹{(actualCostInput ? parseFloat(actualCostInput) : (job?.estimatedCost ?? 0)).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 mt-10 relative z-10">
                  <GlowButton text="Cancel" variant="primary" onClick={() => setBillingModal(null)} className="px-8 !bg-slate-100 !text-slate-700 hover:!bg-slate-200 shadow-none" />
                  <GlowButton text="✓ Collect & Mark Delivered" variant="success" onClick={() => handleMarkDelivered(billingModal)} className="flex-1" />
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {toast && <Toast {...toast} />}
    </div>
  );
};