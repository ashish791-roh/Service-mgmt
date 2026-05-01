import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Toggle, FormInput, FormSelect, Toast, useToast, PrimaryButton } from '../components/ui';
import { StatusBadge, UrgencyDot } from '../components/ui';
import type { Role } from '../types';

// ── AnimatedStatCard ─────────────────────────────────────────────
const AnimatedStatCard: React.FC<{ label: string; value: string | number; icon: string; color: string; delay: number }> = ({ label, value, icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    style={{
      padding: '20px 24px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
    }}
    whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.15)' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: `${color}20`, border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5, fontWeight: 500, marginBottom: 4, letterSpacing: '0.02em' }}>
          {label}
        </div>
        <div style={{ color: 'white', fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {value}
        </div>
      </div>
    </div>
  </motion.div>
);

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
    delivered: jobs.filter(j => j.status === 'Delivered').length,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0,
      },
    },
  };

  return (
    <div className="relative min-h-screen" style={{ 
      fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif",
      background: 'linear-gradient(152deg, #060c1a 0%, #0b1325 50%, #0f172a 100%)'
    }}>
      {/* Animated background gradient orbs */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 40% 35% at 20% 30%, rgba(99,102,241,0.15) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 70%, rgba(139,92,246,0.1) 0%, transparent 55%)
          `,
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />

      <div className="relative z-10 space-y-6 p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <div className="flex items-center gap-4">
            <div style={{
              width: 4, height: 32, borderRadius: 2,
              background: 'linear-gradient(180deg, #818cf8, #a78bfa)',
            }} />
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.04em' }}>Admin Dashboard</h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 500, margin: '4px 0 0' }}>Full system overview and performance metrics</p>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards Grid */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatedStatCard label="Total Jobs" value={jobStats.total} icon="🔧" color="#818cf8" delay={0} />
          <AnimatedStatCard label="Pending Jobs" value={jobStats.pending} icon="⏳" color="#f59e0b" delay={0.1} />
          <AnimatedStatCard label="Completed" value={jobStats.completed} icon="✅" color="#10b981" delay={0.2} />
          <AnimatedStatCard label="Total Customers" value={customers.length} icon="🧑‍💼" color="#8b5cf6" delay={0.3} />
        </motion.div>

        {/* Secondary KPI Cards */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <AnimatedStatCard label="Active Engineers" value={`${activeEngineers.length}/${engineers.length}`} icon="👨‍🔧" color="#06b6d4" delay={0} />
          <AnimatedStatCard label="Parts Requests" value={pendingParts.length} icon="🔩" color="#f97316" delay={0.1} />
          <AnimatedStatCard label="Revenue (Est.)" value={`₹${jobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0).toLocaleString()}`} icon="💰" color="#22c55e" delay={0.2} />
        </motion.div>

        {/* Two-column layout with enhanced cards */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          {/* Recent Jobs */}
          <motion.div
            whileHover={{ borderColor: 'rgba(255,255,255,0.15)' }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 20,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
              overflow: 'hidden',
            }}
          >
            <motion.div className="px-6 py-5 border-b border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between">
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Recent Jobs</h3>
                <motion.button
                  onClick={() => onNavigate('jobs')}
                  className="text-xs text-indigo-300 font-semibold hover:text-indigo-200 transition flex items-center gap-1"
                  whileHover={{ x: 4 }}
                >
                  View all <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </motion.button>
              </div>
            </motion.div>
            <div className="divide-y divide-slate-100/10">
              {jobs.slice(0, 5).map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  className="flex items-center gap-4 px-6 py-3.5 transition-colors"
                >
                  <UrgencyDot createdAt={job.createdAt} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{job.problemDescription}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(job.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <StatusBadge status={job.status} />
                  <span className="text-sm font-bold text-slate-300 tabular-nums">₹{job.estimatedCost.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Engineer Performance */}
          <motion.div
            whileHover={{ borderColor: 'rgba(255,255,255,0.15)' }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 20,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
              overflow: 'hidden',
            }}
          >
            <motion.div className="px-6 py-5 border-b border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Engineer Performance</h3>
            </motion.div>
            <div className="divide-y divide-slate-100/10">
              {engineers.map((eng, i) => {
                const engJobs = jobs.filter(j => j.assignedEngineerId === eng.id);
                const completed = engJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length;
                const active = engJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status)).length;
                const pct = engJobs.length > 0 ? Math.round((completed / engJobs.length) * 100) : 0;
                return (
                  <motion.div
                    key={eng.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    className="flex items-center gap-4 px-6 py-4 transition-colors"
                  >
                    <motion.div
                      style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 14, fontWeight: 700,
                      }}
                      whileHover={{ scale: 1.1 }}
                    >
                      {eng.name.charAt(0)}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-slate-200">{eng.name}</p>
                        <span className="text-xs font-bold text-slate-400 tabular-nums">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: 'linear-gradient(90deg, #818cf8, #8b5cf6)',
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pct, 100)}%` }}
                          transition={{ delay: 0.3 + i * 0.08, duration: 0.8 }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{active} active · {completed} completed</p>
                    </div>
                    <motion.span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${eng.active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-red-500/20 text-red-300 border border-red-400/30'}`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {eng.active ? 'Active' : 'Inactive'}
                    </motion.span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
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
    admin:     'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    reception: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    engineer:  'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  };

  return (
    <div className="relative min-h-screen" style={{ 
      fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif",
      background: 'linear-gradient(152deg, #060c1a 0%, #0b1325 50%, #0f172a 100%)'
    }}>
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 60% 45% at 30% 40%, rgba(139,92,246,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 45% 50% at 75% 60%, rgba(99,102,241,0.1) 0%, transparent 60%)
          `,
        }}
      />

      <div className="relative z-10 space-y-6 p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div style={{
                width: 4, height: 32, borderRadius: 2,
                background: 'linear-gradient(180deg, #8b5cf6, #a78bfa)',
              }} />
              <div>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.04em' }}>User Management</h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 500, margin: '4px 0 0' }}>{users.length} team members</p>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <PrimaryButton onClick={() => setShowModal(true)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add User
              </PrimaryButton>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 20,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
            overflow: 'hidden',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((user, i) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    className="transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <motion.div
                          style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: 12, fontWeight: 700,
                          }}
                          whileHover={{ scale: 1.1 }}
                        >
                          {user.name.charAt(0)}
                        </motion.div>
                        <span className="font-semibold text-white text-sm">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <motion.span
                        className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize backdrop-blur-md ${roleColors[user.role] ?? ''}`}
                        whileHover={{ scale: 1.05 }}
                      >
                        {user.role}
                      </motion.span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{user.email}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm tabular-nums">{new Date(user.joinedAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <motion.span
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md ${user.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/10 text-slate-400 border border-white/5'}`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <motion.span
                          className={`w-2 h-2 rounded-full ${user.active ? 'bg-emerald-400' : 'bg-slate-500'}`}
                          animate={user.active ? { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        {user.active ? 'Active' : 'Inactive'}
                      </motion.span>
                    </td>
                    <td className="px-6 py-4">
                      <Toggle checked={user.active} onChange={() => { toggleUserActive(user.id); show(`${user.name} ${user.active ? 'deactivated' : 'activated'}`, user.active ? 'error' : 'success'); }} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="bg-slate-900/95 border border-white/10 rounded-2xl p-8 max-w-md w-full"
              style={{
                background: 'linear-gradient(135deg, rgba(15,17,41,0.95), rgba(13,18,32,0.95))',
                backdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <motion.h2
                className="text-2xl font-bold text-white mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Add New User
              </motion.h2>

              <div className="space-y-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <FormInput label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Sharma" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <FormInput label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@fixhub.com" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <FormInput label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 6 characters" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <FormSelect label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                    options={[{ value: 'engineer', label: '🔩 Engineer' }, { value: 'reception', label: '🗂 Reception/Manager' }, { value: 'admin', label: '👑 Admin' }]} />
                </motion.div>

                <motion.div
                  className="flex gap-3 pt-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <motion.button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition shadow-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleAdd}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-[0_4px_14px_rgba(99,102,241,0.4)]"
                    whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(99,102,241,0.5)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Create User
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {toast && <Toast {...toast} />}
      </div>
    </div>
  );
};