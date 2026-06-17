import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Toggle, Toast, useToast } from '../../components/ui';
import type { Role, User } from '../../types';
import { UserPlus, X, Pencil, Trash2 } from 'lucide-react';

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

interface GlowButtonProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  text: string;
  onClick?: () => void;
  variant?: 'primary' | 'vivid' | 'success';
  className?: string;
}

const GlowButton = ({ icon: Icon, text, onClick, variant = 'primary', className = "" }: GlowButtonProps) => {
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

export const UserManagement: React.FC = () => {
  const { users, addUser, toggleUserActive, updateUser, deleteUser, currentUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<null | User>(null);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);
  const { toast, show } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'engineer' as Role });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'engineer' as Role, password: '' });

  const visibleUsers = users.filter(u => {
    if (u.role === 'super_admin' && currentUser?.role !== 'super_admin') {
      return false;
    }
    return true;
  });

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) { show('Fill all fields', 'error'); return; }
    if (form.password.length < 6) { show('Password must be at least 6 characters', 'error'); return; }
    const result = await addUser({ ...form, active: true, joinedAt: new Date().toISOString().split('T')[0] });
    if (result.ok) {
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'engineer' });
      show('User created successfully!');
    } else {
      show(result.error ?? 'Failed to create user', 'error');
    }
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role, password: '' });
  };

  const handleEdit = async () => {
    if (!editUser) return;
    if (!editForm.name || !editForm.email) { show('Name and email are required', 'error'); return; }
    const payload: { name: string; email: string; role: Role; password?: string } = { name: editForm.name, email: editForm.email, role: editForm.role };
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
    admin:       'bg-teal-100 text-teal-700',
    reception:   'bg-pink-100 text-pink-700',
    engineer:    'bg-blue-100 text-blue-700',
    super_admin: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader 
        title="Access Control" 
        subtitle={`${visibleUsers.length} registered system identities`} 
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
              {visibleUsers.map((user) => (
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
                    <Toggle checked={user.active} onChange={async () => {
                      if (currentUser?.id === user.id) { show('You cannot deactivate your own account', 'error'); return; }
                      const result = await toggleUserActive(user.id);
                      if (result.ok) {
                        show(`${user.name} ${user.active ? 'deactivated' : 'activated'}`, user.active ? 'error' : 'success');
                      } else {
                        show(result.error ?? 'Failed to update user status', 'error');
                      }
                    }} />
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
                        onClick={() => {
                          if (currentUser?.id === user.id) { show('You cannot delete your own account', 'error'); return; }
                          setShowDeleteId(user.id);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentUser?.id === user.id ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                        title={currentUser?.id === user.id ? 'Cannot delete your own account' : 'Delete user'}
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
                  {currentUser?.role === 'super_admin' && <option value="super_admin">Super Administrator</option>}
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
                  {currentUser?.role === 'super_admin' && <option value="super_admin">Super Administrator</option>}
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
