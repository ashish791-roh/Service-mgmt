import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard, Toggle, Modal, FormInput, FormSelect, Toast, useToast } from '../components/ui';
import { StatusBadge, UrgencyDot } from '../components/ui';
import type { Role } from '../types';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Full system overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" value={jobStats.total} icon="🔧" color="text-slate-800" />
        <StatCard label="Pending Jobs" value={jobStats.pending} icon="⏳" color="text-amber-600" sub="Active workload" />
        <StatCard label="Completed" value={jobStats.completed} icon="✅" color="text-emerald-600" />
        <StatCard label="Total Customers" value={customers.length} icon="🧑‍💼" color="text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Active Engineers" value={`${activeEngineers.length}/${engineers.length}`} icon="👨‍🔧" color="text-blue-600" />
        <StatCard label="Parts Requests" value={pendingParts.length} icon="🔩" color="text-orange-600" sub="Awaiting approval" />
        <StatCard label="Revenue (Est.)" value={`₹${jobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0).toLocaleString()}`} icon="💰" color="text-emerald-600" />
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <h2 className="font-bold text-slate-800">Recent Jobs</h2>
          <button onClick={() => onNavigate('jobs')} className="text-xs text-indigo-500 font-semibold hover:underline">View all →</button>
        </div>
        <div className="divide-y divide-slate-50">
          {jobs.slice(0, 5).map(job => (
            <div key={job.id} className="flex items-center gap-4 px-6 py-3.5">
              <UrgencyDot createdAt={job.createdAt} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{job.problemDescription}</p>
                <p className="text-xs text-slate-400">{new Date(job.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <StatusBadge status={job.status} />
              <span className="text-sm font-bold text-slate-700">₹{job.estimatedCost.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Engineer Performance */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-50">
          <h2 className="font-bold text-slate-800">Engineer Performance</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {engineers.map(eng => {
            const engJobs = jobs.filter(j => j.assignedEngineerId === eng.id);
            const completed = engJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length;
            const active = engJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status)).length;
            return (
              <div key={eng.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                  {eng.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{eng.name}</p>
                  <p className="text-xs text-slate-400">{active} active · {completed} completed</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min((completed / Math.max(engJobs.length, 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">{engJobs.length > 0 ? Math.round((completed / engJobs.length) * 100) : 0}%</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${eng.active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {eng.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            );
          })}
        </div>
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
    admin: 'bg-red-50 text-red-600',
    reception: 'bg-emerald-50 text-emerald-600',
    engineer: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage team members and access</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          + Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left">
              {['User', 'Role', 'Email', 'Joined', 'Status', 'Action'].map(h => (
                <th key={h} className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleColors[user.role]}`}>{user.role}</span>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-500">{user.email}</td>
                <td className="px-5 py-3.5 text-sm text-slate-500">{new Date(user.joinedAt).toLocaleDateString('en-IN')}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${user.active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <Toggle checked={user.active} onChange={() => { toggleUserActive(user.id); show(`${user.name} ${user.active ? 'deactivated' : 'activated'}`, user.active ? 'error' : 'success'); }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Add New User" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <FormInput label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Sharma" />
            <FormInput label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@fixhub.com" />
            <FormInput label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 6 characters" />
            <FormSelect label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
              options={[{ value: 'engineer', label: '🔩 Engineer' }, { value: 'reception', label: '🗂 Reception/Manager' }, { value: 'admin', label: '👑 Admin' }]} />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={handleAdd} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">Create User</button>
            </div>
          </div>
        </Modal>
      )}
      {toast && <Toast {...toast} />}
    </div>
  );
};
