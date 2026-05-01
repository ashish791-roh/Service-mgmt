import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { StatusBadge, UrgencyDot, Toast, useToast, PartStatusBadge } from '../components/ui';

// ── Icons ────────────────────────────────────────────────────────
const Icons = {
  Briefcase: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  Alert: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Zap: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Users: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Settings: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
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
      {sub && <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">{sub}</span>}
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
    success: "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)]",
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

// ── ReceptionDashboard ─────────────────────────────────────────
export const ReceptionDashboard: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const { jobs, customers, users, partRequests } = useApp();
  const pendingParts = partRequests.filter(r => r.status === 'Pending');
  const unassigned = jobs.filter(j => !j.assignedEngineerId);

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Command Center" subtitle="Real-time operations" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InteractiveStatCard title="Total Jobs" value={jobs.length} icon="Briefcase" gradient="from-blue-600 to-cyan-400" delay={0.1} />
        <InteractiveStatCard title="Unassigned" value={unassigned.length} icon="Alert" gradient="from-rose-500 to-orange-400" sub="Action Needed" delay={0.2} />
        <InteractiveStatCard title="In Progress" value={jobs.filter(j => j.status === 'In Progress').length} icon="Zap" gradient="from-amber-400 to-yellow-500" delay={0.3} />
        <InteractiveStatCard title="Customers" value={customers.length} icon="Users" gradient="from-emerald-500 to-teal-400" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <AnimatedCard delay={0.5}>
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100/60 bg-white/50 backdrop-blur-xl">
              <h2 className="text-xl font-black text-slate-900">Live Activity Feed</h2>
              <button onClick={() => onNavigate('jobs')} className="text-sm font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 group">
                View All <motion.span group-hover={{ x: 5 }}>{Icons.ArrowRight}</motion.span>
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {jobs.slice(0, 6).map((job, i) => {
                const customer = customers.find(c => c.id === job.customerId);
                const engineer = users.find(u => u.id === job.assignedEngineerId);
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + (i * 0.1) }}
                    key={job.id} 
                    className="flex items-center gap-6 px-8 py-5 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    <UrgencyDot createdAt={job.createdAt} />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black text-slate-900 truncate mb-1 group-hover:text-violet-600 transition-colors">{customer?.name}</p>
                      <p className="text-sm font-medium text-slate-500 truncate">{job.problemDescription}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={job.status} />
                      <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">{engineer ? engineer.name : '— Unassigned —'}</p>
                    </div>
                    <span className="text-xl font-black text-slate-900 ml-4 w-24 text-right tracking-tighter">₹{job.estimatedCost.toLocaleString()}</span>
                  </motion.div>
                );
              })}
            </div>
          </AnimatedCard>
        </div>

        <div className="space-y-6">
          <AnimatePresence>
            {unassigned.length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <AnimatedCard delay={0.6} className="bg-gradient-to-br from-rose-50 to-orange-50 border-rose-100">
                  <div className="px-6 py-5 flex items-center gap-4 border-b border-rose-100/50">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                      {Icons.Alert}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-rose-900">Urgent Assignments</h3>
                      <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">{unassigned.length} Jobs Waiting</p>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {unassigned.slice(0, 3).map(job => {
                      const customer = customers.find(c => c.id === job.customerId);
                      return (
                        <div key={job.id} className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100/50">
                          <p className="text-sm font-black text-slate-900 mb-1">{customer?.name}</p>
                          <p className="text-xs font-medium text-slate-500 line-clamp-1 mb-3">{job.problemDescription}</p>
                          <GlowButton text="Assign Now" variant="vivid" onClick={() => onNavigate('assign')} className="w-full !py-2.5 !text-xs !rounded-xl" />
                        </div>
                      );
                    })}
                  </div>
                </AnimatedCard>
              </motion.div>
            )}
          </AnimatePresence>

          {pendingParts.length > 0 && (
            <AnimatedCard delay={0.7} className="border-amber-200 bg-amber-50">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4">
                  {Icons.Settings}
                </div>
                <h3 className="text-xl font-black text-amber-900 mb-1">Parts Approval</h3>
                <p className="text-sm font-bold text-amber-600/80 mb-6">{pendingParts.length} requests pending review</p>
                <GlowButton text="Review Requests" variant="primary" onClick={() => onNavigate('parts')} className="w-full" />
              </div>
            </AnimatedCard>
          )}
        </div>
      </div>
    </div>
  );
};

// ── CustomersPage ──────────────────────────────────────────────
export const CustomersPage: React.FC = () => {
  const { customers, devices, jobs, addCustomer, addDevice, addJob, users } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const { toast, show } = useToast();

  const engineers = users.filter(u => u.role === 'engineer' && u.active);
  const [search, setSearch] = useState('');
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const [custForm, setCustForm] = useState({ name: '', phone: '', address: '' });
  const [deviceForm, setDeviceForm] = useState({ type: '', brand: '', model: '', serialNumber: '' });
  const [jobForm, setJobForm] = useState({ problemDescription: '', estimatedCost: '', assignedEngineerId: '' });
  const [newCustId, setNewCustId] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (!custForm.name || !custForm.phone) { show('Name and phone are required', 'error'); return; }
      const c = addCustomer(custForm);
      setNewCustId(c.id);
      setStep(2);
    } else if (step === 2) {
      if (!deviceForm.type || !deviceForm.brand || !deviceForm.model) { show('Device type, brand and model are required', 'error'); return; }
      setStep(3);
    } else {
      if (!jobForm.problemDescription || !jobForm.estimatedCost) { show('Problem description and cost are required', 'error'); return; }
      const dev = addDevice({ ...deviceForm, customerId: newCustId });
      addJob({
        customerId: newCustId, deviceId: dev.id,
        assignedEngineerId: jobForm.assignedEngineerId || null,
        status: jobForm.assignedEngineerId ? 'Assigned' : 'New',
        problemDescription: jobForm.problemDescription,
        estimatedCost: parseFloat(jobForm.estimatedCost),
      });
      setShowModal(false);
      setStep(1);
      setCustForm({ name: '', phone: '', address: '' });
      setDeviceForm({ type: '', brand: '', model: '', serialNumber: '' });
      setJobForm({ problemDescription: '', estimatedCost: '', assignedEngineerId: '' });
      show('Job registered successfully!');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Client Directory" subtitle="Manage and search customer records" 
        action={<GlowButton icon="Plus" text="New Registration" variant="vivid" onClick={() => setShowModal(true)} />} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-2xl">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-violet-500">{Icons.Search}</div>
        <input 
          value={search} onChange={e => setSearch(e.target.value)} 
          placeholder="Search by name or phone number..." 
          className="w-full bg-white border-2 border-slate-100 rounded-[2rem] pl-14 pr-6 py-5 text-lg font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filtered.map((c, i) => {
            const cJobs = jobs.filter(j => j.customerId === c.id);
            const cDevices = devices.filter(d => d.customerId === c.id);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.05 }}
              >
                <AnimatedCard className="p-6 flex flex-col h-full group">
                  <div className="flex items-start gap-5 mb-6">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center text-2xl font-black text-violet-600 shadow-inner group-hover:scale-110 transition-transform duration-300">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 mb-1">{c.name}</h3>
                      <p className="text-sm font-bold text-slate-500 mb-0.5 tracking-wide">{c.phone}</p>
                      <p className="text-xs font-semibold text-slate-400 line-clamp-1">{c.address}</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-2xl font-black text-slate-900 leading-none">{cJobs.length}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Jobs</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900 leading-none">{cDevices.length}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Devices</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                      {cJobs.slice(0, 2).map(j => <StatusBadge key={j.id} status={j.status} />)}
                    </div>
                  </div>
                </AnimatedCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl overflow-hidden relative"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full pointer-events-none" />

              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Registration</h2>
                  <p className="text-sm font-bold text-violet-600 uppercase tracking-widest mt-1">Step {step} of 3</p>
                </div>
                <button onClick={() => { setShowModal(false); setStep(1); }} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors font-bold text-xl">✕</button>
              </div>

              <div className="flex gap-2 mb-10 relative z-10">
                {['Client Profile', 'Device Specs', 'Job Details'].map((label, i) => (
                  <div key={i} className="flex-1">
                    <div className={`h-2 rounded-full mb-2 transition-all duration-500 ${i + 1 <= step ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500' : 'bg-slate-100'}`} />
                    <p className={`text-[10px] font-black uppercase tracking-widest ${i + 1 === step ? 'text-violet-600' : 'text-slate-400'}`}>{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-6 relative z-10">
                {step === 1 && (
                  <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-5">
                    <div>
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Customer Name *</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} placeholder="Full Name" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Phone Number *</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" value={custForm.phone} onChange={e => setCustForm({ ...custForm, phone: e.target.value })} placeholder="Mobile Number" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Address</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" value={custForm.address} onChange={e => setCustForm({ ...custForm, address: e.target.value })} placeholder="Complete Address" />
                    </div>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-5">
                    <div>
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Device Type *</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all appearance-none" value={deviceForm.type} onChange={e => setDeviceForm({ ...deviceForm, type: e.target.value })}>
                        <option value="">Select Category</option>
                        {['Laptop', 'Desktop', 'Smartphone', 'Tablet', 'Printer', 'Other'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Brand *</label>
                        <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" value={deviceForm.brand} onChange={e => setDeviceForm({ ...deviceForm, brand: e.target.value })} placeholder="Brand" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Model *</label>
                        <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" value={deviceForm.model} onChange={e => setDeviceForm({ ...deviceForm, model: e.target.value })} placeholder="Model" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Serial / IMEI (Optional)</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" value={deviceForm.serialNumber} onChange={e => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })} placeholder="Serial Number" />
                    </div>
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-5">
                    <div>
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Issue Description *</label>
                      <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all resize-none" rows={4} value={jobForm.problemDescription} onChange={e => setJobForm({ ...jobForm, problemDescription: e.target.value })} placeholder="Describe the problem in detail..." />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Quote Estimation (₹) *</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-black text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" type="number" value={jobForm.estimatedCost} onChange={e => setJobForm({ ...jobForm, estimatedCost: e.target.value })} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Direct Assignment</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all appearance-none" value={jobForm.assignedEngineerId} onChange={e => setJobForm({ ...jobForm, assignedEngineerId: e.target.value })}>
                        <option value="">Leave Unassigned for now</option>
                        {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-4 mt-10 relative z-10">
                {step > 1 && <GlowButton text="Back" variant="primary" onClick={() => setStep(s => s - 1)} className="px-8 !bg-slate-100 !text-slate-700 hover:!bg-slate-200 shadow-none" />}
                <GlowButton text={step < 3 ? 'Continue to Next Step' : 'Confirm & Register'} variant="vivid" onClick={handleNext} className="flex-1" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {toast && <Toast {...toast} />}
    </div>
  );
};

// ── JobsPage ───────────────────────────────────────────────────
export const JobsPage: React.FC = () => {
  const { jobs, customers, devices, users } = useApp();
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [engineerFilter, setEngineerFilter] = useState<string>('All');

  const engineers = users.filter(u => u.role === 'engineer');
  const statuses = ['All', 'New', 'Assigned', 'In Progress', 'Completed', 'Delivered'];

  const filtered = jobs.filter(j => {
    if (statusFilter !== 'All' && j.status !== statusFilter) return false;
    if (engineerFilter !== 'All' && j.assignedEngineerId !== engineerFilter) return false;
    return true;
  });

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Job Database" subtitle={`Currently tracking ${filtered.length} active jobs`} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex bg-white p-2 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 w-fit overflow-x-auto">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 whitespace-nowrap ${statusFilter === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={engineerFilter} onChange={e => setEngineerFilter(e.target.value)}
          className="px-6 py-3 bg-white border border-slate-100 rounded-[1.5rem] text-sm font-black text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 min-w-[250px] appearance-none">
          <option value="All">All Engineers</option>
          {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </motion.div>

      <AnimatedCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100/80">
                {['', 'ID', 'Client & Device', 'Issue Overview', 'Assignment', 'Status', 'Quote'].map(h => (
                  <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              <AnimatePresence>
                {filtered.map((job, i) => {
                  const customer = customers.find(c => c.id === job.customerId);
                  const device = devices.find(d => d.id === job.deviceId);
                  const engineer = users.find(u => u.id === job.assignedEngineerId);
                  return (
                    <motion.tr 
                      key={job.id} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="pl-8 py-6"><UrgencyDot createdAt={job.createdAt} /></td>
                      <td className="px-8 py-6 text-xs font-black text-slate-400">#{job.id}</td>
                      <td className="px-8 py-6">
                        <p className="text-base font-black text-slate-900 mb-1 group-hover:text-violet-600 transition-colors">{customer?.name}</p>
                        <p className="text-xs font-bold text-slate-500">{device?.brand} {device?.model}</p>
                      </td>
                      <td className="px-8 py-6 text-sm font-semibold text-slate-600 max-w-[250px] truncate">{job.problemDescription}</td>
                      <td className="px-8 py-6">
                        {engineer ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[0.6rem] bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 flex items-center justify-center text-xs font-black">{engineer.name.charAt(0)}</div>
                            <span className="text-sm font-bold text-slate-900">{engineer.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-black text-rose-500 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg uppercase tracking-wider">Unassigned</span>
                        )}
                      </td>
                      <td className="px-8 py-6"><StatusBadge status={job.status} /></td>
                      <td className="px-8 py-6 text-lg font-black text-slate-900 tracking-tighter">₹{job.estimatedCost.toLocaleString()}</td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🔍</div>
              <p className="text-lg font-black text-slate-900 mb-1">No jobs found</p>
              <p className="text-sm font-bold text-slate-500">Try adjusting your filters to see more results.</p>
            </div>
          )}
        </div>
      </AnimatedCard>
    </div>
  );
};

// ── AssignJobsPage ─────────────────────────────────────────────
export const AssignJobsPage: React.FC = () => {
  const { jobs, customers, devices, users, assignEngineer } = useApp();
  const { toast, show } = useToast();
  const engineers = users.filter(u => u.role === 'engineer' && u.active);
  const unassigned = jobs.filter(j => !j.assignedEngineerId || j.status === 'New');
  const handleAssign = (jobId: string, engId: string) => {
    assignEngineer(jobId, engId);
    show('Engineer officially assigned to task.');
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Workforce Dispatch" subtitle={`${unassigned.length} critical jobs require assignment`} />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
        {engineers.map((eng, i) => {
          const active = jobs.filter(j => j.assignedEngineerId === eng.id && ['Assigned', 'In Progress'].includes(j.status)).length;
          return (
            <motion.div key={eng.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <AnimatedCard className="p-6 text-center h-full">
                <div className="w-14 h-14 mx-auto rounded-[1.2rem] bg-gradient-to-br from-indigo-100 to-cyan-100 text-indigo-600 flex items-center justify-center text-xl font-black mb-4 shadow-inner">
                  {eng.name.charAt(0)}
                </div>
                <p className="text-base font-black text-slate-900 truncate mb-2">{eng.name}</p>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${active > 3 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`} />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{active} Active</p>
                </div>
              </AnimatedCard>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {unassigned.map((job, i) => {
            const customer = customers.find(c => c.id === job.customerId);
            const device = devices.find(d => d.id === job.deviceId);
            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.1 }}>
                <AnimatedCard className="flex flex-col h-full border-2 hover:border-violet-500/30">
                  <div className="p-8 flex-1">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <UrgencyDot createdAt={job.createdAt} />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">#{job.id}</span>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{customer?.name}</h3>
                    <p className="text-sm font-bold text-violet-600 mb-5">{device?.brand} {device?.model}</p>
                    <div className="bg-slate-50 rounded-2xl p-5 mb-5 border border-slate-100">
                      <p className="text-sm font-semibold text-slate-700 leading-relaxed line-clamp-3">{job.problemDescription}</p>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Since {new Date(job.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="p-6 bg-slate-50 border-t border-slate-100">
                    <select
                      defaultValue=""
                      onChange={e => e.target.value && handleAssign(job.id, e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-5 py-4 text-sm font-black text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select Engineer to Dispatch...</option>
                      {engineers.map(e => {
                        const load = jobs.filter(j => j.assignedEngineerId === e.id && ['Assigned', 'In Progress'].includes(j.status)).length;
                        return <option key={e.id} value={e.id}>{e.name} ({load} active)</option>;
                      })}
                    </select>
                  </div>
                </AnimatedCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {toast && <Toast {...toast} />}
    </div>
  );
};

// ── PartsRequestPage ───────────────────────────────────────────
export const PartsRequestPage: React.FC = () => {
  const { partRequests, jobs, users, updatePartRequest } = useApp();
  const { toast, show } = useToast();
  const [filter, setFilter] = useState('Pending');

  const filtered = partRequests.filter(r => filter === 'All' ? true : r.status === filter);

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Inventory Logistics" subtitle="Manage and approve part requisition orders" />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex bg-white p-2 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 w-fit mb-8">
        {['Pending', 'Approved', 'Rejected', 'All'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-8 py-3 rounded-xl text-sm font-black transition-all duration-300 flex items-center gap-3 ${filter === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
            {s}
            {s === 'Pending' && partRequests.filter(r => r.status === 'Pending').length > 0 && (
              <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-widest ${filter === s ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'}`}>
                {partRequests.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {filtered.map((req, i) => {
            const engineer = users.find(u => u.id === req.engineerId);
            const job = jobs.find(j => j.id === req.jobId);
            return (
              <motion.div key={req.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.05 }}>
                <AnimatedCard className="flex flex-col sm:flex-row h-full">
                  <div className="p-8 flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <PartStatusBadge status={req.status} />
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">{req.partName}</h3>
                    
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-5">
                      <p className="text-sm font-semibold text-slate-700 italic mb-3">"{req.reason}"</p>
                      <div className="flex items-center gap-4">
                        <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-black text-slate-900">QTY: {req.quantity}</div>
                        <p className="text-xs font-bold text-slate-500">By <span className="text-violet-600">{engineer?.name}</span></p>
                      </div>
                    </div>
                    
                    {job && (
                      <div className="text-xs font-bold text-slate-500 flex items-center gap-2 bg-slate-50 py-2 px-3 rounded-lg w-fit">
                        <span className="bg-slate-200 px-2 py-1 rounded text-slate-700">#{job.id}</span>
                        <span className="truncate max-w-[200px]">{job.problemDescription}</span>
                      </div>
                    )}
                  </div>
                  
                  {req.status === 'Pending' && (
                    <div className="flex sm:flex-col gap-3 justify-center bg-slate-50 border-t sm:border-t-0 sm:border-l border-slate-100 p-6 min-w-[160px]">
                      <GlowButton text="Approve" variant="success" onClick={() => { updatePartRequest(req.id, 'Approved'); show('Part request approved for logistics.'); }} className="w-full !py-3" />
                      <GlowButton text="Reject" variant="danger" onClick={() => { updatePartRequest(req.id, 'Rejected'); show('Request rejected', 'error'); }} className="w-full !py-3" />
                    </div>
                  )}
                </AnimatedCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {toast && <Toast {...toast} />}
    </div>
  );
};
