import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Toggle, Toast, useToast } from '../components/ui';
import type { Role } from '../types';
import { Wrench, CheckCircle, Banknote, Hourglass, Users, UserPlus, ChevronRight, Package, X, Pencil, Trash2 } from 'lucide-react';

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

const GlowButton = ({ icon: Icon, text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: Record<string, string> = {
    primary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    vivid: "bg-teal-500 text-white hover:bg-teal-600",
    success: "bg-green-500 text-white hover:bg-green-600",
  };
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant] || styles.primary} ${className}`}>
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

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

  const jobStatusColors: Record<string, string> = {
    'New': 'border-cyan-500 text-cyan-700 bg-cyan-50',
    'Assigned': 'border-teal-500 text-teal-700 bg-teal-50',
    'In Progress': 'border-orange-500 text-orange-700 bg-orange-50',
    'Completed': 'border-green-500 text-green-700 bg-green-50',
    'Delivered': 'border-green-500 text-green-700 bg-green-50',
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Executive Overview" subtitle="System-wide performance metrics" />

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Volume" value={jobStats.total} icon={Wrench} color="cyan" sub="All Jobs" />
        <MetricCard title="Pending Queue" value={jobStats.pending} icon={Hourglass} color="orange" sub="Active" />
        <MetricCard title="Total Completed" value={jobStats.completed} icon={CheckCircle} color="green" sub="Success" />
        <MetricCard title="Client Base" value={customers.length} icon={Users} color="teal" />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Active Engineers" value={`${activeEngineers.length}/${engineers.length}`} icon={Users} color="teal" />
        <MetricCard title="Pending Parts" value={pendingParts.length} icon={Package} color="orange" sub={pendingParts.length > 0 ? "Action Needed" : ""} />
        <MetricCard title="Est. Total Revenue" value={`₹${(jobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0) / 1000).toFixed(1)}k`} icon={Banknote} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Recent Activity</h3>
            <button onClick={() => onNavigate('jobs')} className="text-[11px] font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {jobs.slice(0, 5).map((job) => {
              const statusStyle = jobStatusColors[job.status] || 'border-gray-300 text-gray-700 bg-gray-50';
              const statusBorder = statusStyle.split(' ')[0];
              const statusBadge = statusStyle.split(' ').slice(1).join(' ');

              return (
                <div key={job.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${statusBorder}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                    <p className="text-[11px] font-normal text-gray-500 mt-1">{new Date(job.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-[11px] font-medium ${statusBadge}`}>
                    {job.status}
                  </div>
                  <span className="text-[13px] font-medium text-gray-900">₹{job.estimatedCost.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Engineer Performance */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Fleet Efficiency</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {engineers.map((eng) => {
              const engJobs = jobs.filter(j => j.assignedEngineerId === eng.id);
              const completed = engJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length;
              const active = engJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status)).length;
              const pct = engJobs.length > 0 ? Math.round((completed / engJobs.length) * 100) : 0;
              return (
                <div key={eng.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors border-l-4 ${eng.active ? 'border-green-500' : 'border-gray-300'}`}>
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium text-[13px] shrink-0">
                    {eng.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[13px] font-medium text-gray-900">{eng.name}</p>
                      <span className="text-[11px] font-medium text-gray-900">{pct}% Score</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-cyan-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-[11px] font-normal text-gray-500">{active} active • {completed} completed</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[11px] font-medium shrink-0 ${eng.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {eng.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const UserManagement: React.FC = () => {
  const { users, addUser, toggleUserActive, updateUser, deleteUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<null | typeof users[0]>(null);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);
  const { toast, show } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'engineer' as Role });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'engineer' as Role, password: '' });

  const handleAdd = () => {
    if (!form.name || !form.email || !form.password) { show('Fill all fields', 'error'); return; }
    addUser({ ...form, active: true, joinedAt: new Date().toISOString().split('T')[0] });
    setShowModal(false);
    setForm({ name: '', email: '', password: '', role: 'engineer' });
    show('User created successfully!');
  };

  const openEdit = (user: typeof users[0]) => {
    setEditUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role, password: '' });
  };

  const handleEdit = async () => {
    if (!editUser) return;
    if (!editForm.name || !editForm.email) { show('Name and email are required', 'error'); return; }
    const payload: any = { name: editForm.name, email: editForm.email, role: editForm.role };
    if (editForm.password) payload.password = editForm.password;
    const result = await updateUser(editUser.id, payload);
    if (result.ok) {
      setEditUser(null);
      show('User updated successfully!', 'success');
    } else {
      show(result.error ?? 'Failed to update user', 'error');
    }
  };

  const handleDelete = async (userId: string) => {
    const result = await deleteUser(userId);
    setShowDeleteId(null);
    if (result.ok) {
      show('User deleted successfully!', 'success');
    } else {
      show(result.error ?? 'Failed to delete user', 'error');
    }
  };

  const roleColors: Record<string, string> = {
    admin:     'bg-teal-100 text-teal-700',
    reception: 'bg-pink-100 text-pink-700',
    engineer:  'bg-blue-100 text-blue-700',
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader 
        title="Access Control" 
        subtitle={`${users.length} registered system identities`} 
        action={<GlowButton icon={UserPlus} text="Deploy New User" variant="vivid" onClick={() => setShowModal(true)} />}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Identity', 'Clearance', 'Contact', 'Enrolled', 'Status', 'Access', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                  <td className={`px-6 py-4 border-l-4 ${user.active ? 'border-green-500' : 'border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-[13px] ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium text-[13px] text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-medium ${roleColors[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-normal text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 text-[11px] font-normal text-gray-500">{new Date(user.joinedAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 px-2 py-1 rounded text-[11px] font-medium ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {user.active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Toggle checked={user.active} onChange={() => { toggleUserActive(user.id); show(`${user.name} ${user.active ? 'deactivated' : 'activated'}`, user.active ? 'error' : 'success'); }} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                        title="Edit user"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setShowDeleteId(user.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Deploy User</h2>
                <p className="text-[13px] font-normal text-teal-500 mt-1">Generate new credentials</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Sharma"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@fixhub.com"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors">
                  <option value="engineer">Engineer</option>
                  <option value="reception">Reception/Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <GlowButton text="Create User" variant="vivid" onClick={handleAdd} className="flex-1" />
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Edit User</h2>
                <p className="text-[13px] font-normal text-teal-500 mt-1">Update credentials for {editUser.name}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Full Name *</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Email *</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">New Password <span className="text-gray-400 normal-case font-normal">(leave blank to keep current)</span></label>
                <input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Role *</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-normal text-gray-900 focus:outline-none focus:border-teal-500 transition-colors">
                  <option value="engineer">Engineer</option>
                  <option value="reception">Reception/Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <GlowButton text="Save Changes" variant="vivid" onClick={handleEdit} className="flex-1" />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl border border-gray-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h2 className="text-[18px] font-medium text-gray-900 mb-2">Delete User?</h2>
            <p className="text-[13px] font-normal text-gray-500 mb-6">
              This action cannot be undone. The user account will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteId(null)} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(showDeleteId)} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
};