import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Toggle, FormInput, FormSelect, Toast, useToast, StatusBadge, UrgencyDot } from '../components/ui';
import type { Role } from '../types';

// ── Icons ────────────────────────────────────────────────────────
const Icons = {
  Wrench: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  CheckCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Banknote: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  Hourglass: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>,
  Users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  UserPlus: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  ChevronRight: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  Box: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
};

// ── Shared UI Components ─────────────────────────────────────────
const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
    <div>
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight leading-tight">{title}</h1>
      <p className="text-sm font-bold text-violet-500 uppercase tracking-widest mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </motion.div>
);

const AnimatedCard = ({ children, delay = 0, className = "" }: any) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className={`bg-white rounded-3xl border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)] hover:border-violet-100 transition-all duration-300 overflow-hidden ${className}`}>
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
    success: "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.4)]",
  };
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick} className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all ${styles[variant]} ${className}`}>
      {icon && <span className="text-lg">{icon}</span>}
      {text}
    </motion.button>
  );
};

// ── AdminDashboard ─────────────────────────────────────────────
export const AdminDashboard: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const { jobs, users, customers, partRequests } = useApp();
  const engineers = users.filter(u => u.role === 'engineer');
  const activeEngineers = engineers.filter(u => u.active);
  const pendingParts = partRequests.filter(r => r.status === 'Pending');

  const jobStats = {
    total: jobs.length,
    pending: jobs.filter(j => ['New', 'Assigned', 'In Progress'].includes(j.status)).length,
    completed: jobs.filter(j => j.status === 'Completed').length,
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Executive Overview" subtitle="System-wide performance metrics" />

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InteractiveStatCard title="Total Volume" value={jobStats.total} icon="Wrench" gradient="from-blue-600 to-cyan-400" delay={0.1} sub="All Jobs" />
        <InteractiveStatCard title="Pending Queue" value={jobStats.pending} icon="Hourglass" gradient="from-amber-400 to-orange-500" delay={0.2} sub="Active" />
        <InteractiveStatCard title="Total Completed" value={jobStats.completed} icon="CheckCircle" gradient="from-emerald-500 to-teal-400" delay={0.3} sub="Success" />
        <InteractiveStatCard title="Client Base" value={customers.length} icon="Users" gradient="from-violet-600 to-fuchsia-500" delay={0.4} />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedCard delay={0.5} className="bg-slate-900 border-none p-6 relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 shadow-inner">
              <span className="text-xl">👨‍🔧</span>
            </div>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Active Engineers</p>
          <h3 className="text-4xl font-black text-white tracking-tighter relative z-10">{activeEngineers.length}<span className="text-xl text-slate-600">/{engineers.length}</span></h3>
        </AnimatedCard>

        <AnimatedCard delay={0.6} className="bg-slate-900 border-none p-6 relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-orange-400 shadow-inner">
              {Icons.Box}
            </div>
            {pendingParts.length > 0 && <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">Action Needed</span>}
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Pending Parts</p>
          <h3 className="text-4xl font-black text-white tracking-tighter relative z-10">{pendingParts.length}</h3>
        </AnimatedCard>

        <AnimatedCard delay={0.7} className="bg-gradient-to-br from-emerald-500 to-teal-400 border-none p-6 relative overflow-hidden group text-white">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-inner">
              {Icons.Banknote}
            </div>
          </div>
          <p className="text-xs font-black text-emerald-100 uppercase tracking-widest mb-1 relative z-10">Est. Total Revenue</p>
          <h3 className="text-4xl font-black tracking-tighter relative z-10">₹{(jobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0) / 1000).toFixed(1)}k</h3>
        </AnimatedCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <AnimatedCard delay={0.8}>
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100/80 bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h3>
            <button onClick={() => onNavigate('jobs')} className="text-[10px] font-black uppercase tracking-widest text-violet-600 hover:text-violet-700 bg-violet-100 hover:bg-violet-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              View All {Icons.ChevronRight}
            </button>
          </div>
          <div className="divide-y divide-slate-100/80">
            {jobs.slice(0, 5).map((job, i) => (
              <motion.div key={job.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-4 px-8 py-5 hover:bg-slate-50/50 transition-colors group cursor-pointer">
                <UrgencyDot createdAt={job.createdAt} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 group-hover:text-violet-600 transition-colors truncate">{job.problemDescription}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(job.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <StatusBadge status={job.status} />
                <span className="text-sm font-black text-slate-900 tabular-nums">₹{job.estimatedCost.toLocaleString()}</span>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>

        {/* Engineer Performance */}
        <AnimatedCard delay={0.9}>
          <div className="px-8 py-6 border-b border-slate-100/80 bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Fleet Efficiency</h3>
          </div>
          <div className="divide-y divide-slate-100/80">
            {engineers.map((eng, i) => {
              const engJobs = jobs.filter(j => j.assignedEngineerId === eng.id);
              const completed = engJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length;
              const active = engJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status)).length;
              const pct = engJobs.length > 0 ? Math.round((completed / engJobs.length) * 100) : 0;
              return (
                <motion.div key={eng.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex flex-col sm:flex-row sm:items-center gap-5 px-8 py-5 hover:bg-slate-50/50 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-sm shrink-0">
                    {eng.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-black text-slate-900">{eng.name}</p>
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest tabular-nums">{pct}% Score</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner mb-2">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ delay: 0.3 + i * 0.08, duration: 0.8 }} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{active} active • {completed} completed</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 ${eng.active ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {eng.active ? 'Active' : 'Inactive'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
};

// ── UserManagement ─────────────────────────────────────────────
export const UserManagement: React.FC = () => {
  const { users, addUser, toggleUserActive } = useApp();
  const [showModal, setShowModal] = useState(false);
  const { toast, show } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'engineer' as Role });

  const handleAdd = () => {
    if (!form.name || !form.email || !form.password) { show('Fill all fields', 'error'); return; }
    addUser({ ...form, active: true, joinedAt: new Date().toISOString().split('T')[0] });
    setShowModal(false);
    setForm({ name: '', email: '', password: '', role: 'engineer' });
    show('User created successfully!');
  };

  const roleColors: Record<string, string> = {
    admin:     'bg-rose-100 text-rose-600 border-rose-200',
    reception: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    engineer:  'bg-sky-100 text-sky-600 border-sky-200',
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader 
        title="Access Control" 
        subtitle={`${users.length} registered system identities`} 
        action={<GlowButton icon={Icons.UserPlus} text="Deploy New User" variant="vivid" onClick={() => setShowModal(true)} />}
      />

      <AnimatedCard delay={0.1}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100/80">
                {['Identity', 'Clearance', 'Contact', 'Enrolled', 'Status', 'Access'].map(h => (
                  <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {users.map((user, i) => (
                <motion.tr key={user.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-black text-slate-900 group-hover:text-violet-600 transition-colors text-base">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${roleColors[user.role] ?? ''}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-500">{user.email}</td>
                  <td className="px-8 py-6 text-xs font-bold text-slate-400 tabular-nums">{new Date(user.joinedAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${user.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${user.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {user.active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <Toggle checked={user.active} onChange={() => { toggleUserActive(user.id); show(`${user.name} ${user.active ? 'deactivated' : 'activated'}`, user.active ? 'error' : 'success'); }} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedCard>

      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Deploy User</h2>
                  <p className="text-sm font-bold text-violet-500 uppercase tracking-widest mt-1">Generate new credentials</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors font-bold text-xl">✕</button>
              </div>

              <div className="space-y-5 relative z-10">
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Full Identity *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Sharma"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Contact Directive *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@fixhub.com"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Security Key *</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Clearance Level *</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all appearance-none">
                    <option value="engineer">🔧 Engineer</option>
                    <option value="reception">🗂 Reception/Manager</option>
                    <option value="admin">👑 Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-10 relative z-10">
                <GlowButton text="Abort" variant="primary" onClick={() => setShowModal(false)} className="px-8 !bg-slate-100 !text-slate-700 hover:!bg-slate-200 shadow-none" />
                <GlowButton text="Deploy Credentials" variant="vivid" onClick={handleAdd} className="flex-1" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && <Toast {...toast} />}
    </div>
  );
};