import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GitBranch, Power, RefreshCw, Plus, Check, Copy, X, Key } from 'lucide-react';
import { jsonHeaders } from '../lib/api';

interface Branch {
  id: string;
  name: string;
  apiKey: string;
  suspended: boolean;
  createdAt: string;
  lastSeen: string | null;
  users?: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }[];
}

export const BranchesPage: React.FC = () => {
  const { isHQ, currentUser } = useApp();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [idInput, setIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCredsBranch, setShowCredsBranch] = useState<Branch | null>(null);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/branches');
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHQ || currentUser?.role === 'super_admin') {
      fetchBranches();
    }
  }, [isHQ, currentUser]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setCreatedCredentials(null);
    if (!idInput.trim() || !nameInput.trim()) {
      setErrorMessage('Branch ID and Name are required.');
      return;
    }

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ id: idInput, name: nameInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Branch registered successfully! API Key: ${data.apiKey}`);
        setCreatedCredentials(data.credentials);
        setIdInput('');
        setNameInput('');
        fetchBranches();
      } else {
        setErrorMessage(data.error || 'Failed to register branch.');
      }
    } catch (err) {
      setErrorMessage('Network error registering branch.');
    }
  };

  const handleToggleSuspend = async (branchId: string, currentSuspended: boolean) => {
    try {
      const res = await fetch(`/api/branches/${branchId}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({ suspended: !currentSuspended }),
      });
      if (res.ok) {
        fetchBranches();
      }
    } catch (err) {
      console.error('Failed to toggle branch suspension:', err);
    }
  };

  const handleRotateKey = async (branchId: string) => {
    if (!window.confirm('Are you sure you want to rotate the API key? The old key will immediately stop working.')) {
      return;
    }
    try {
      const res = await fetch(`/api/branches/${branchId}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({ rotateKey: true }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`New API Key generated: ${data.apiKey}\nCopy it now as it won't be shown again.`);
        fetchBranches();
      }
    } catch (err) {
      console.error('Failed to rotate branch key:', err);
    }
  };

  const handleCopyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isSyncDelayed = (lastSeenStr: string | null) => {
    if (!lastSeenStr) return true;
    const lastSeen = new Date(lastSeenStr);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return lastSeen < oneHourAgo;
  };

  if (!isHQ && currentUser?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <GitBranch size={48} className="mb-4 opacity-50" />
        <p className="text-[13px] font-medium text-gray-500">Branch Management is only available on HQ deployments</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
        <div>
          <h1 className="text-[18px] font-medium text-gray-900">Branch Directory & Settings</h1>
          <p className="text-[13px] font-normal text-teal-500 mt-1">Manage physical locations, API credentials, and sync statuses</p>
        </div>
        <button
          onClick={() => setRegistering(!registering)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[13px] font-medium transition-all"
        >
          <Plus size={16} /> Register Branch
        </button>
      </div>

      {registering && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-[14px] font-medium text-gray-900 mb-4">Register New Branch</h2>
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Branch ID (Lowercase, no spaces)</label>
              <input
                type="text"
                placeholder="e.g. london-north"
                value={idInput}
                onChange={e => setIdInput(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-teal-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Branch Name</label>
              <input
                type="text"
                placeholder="e.g. FixHub London North"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-teal-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-900 rounded-lg text-[13px] font-semibold transition-all h-[42px]"
            >
              Submit Registration
            </button>
          </form>
          {errorMessage && <p className="text-[12px] text-red-500 font-medium mt-3">{errorMessage}</p>}
          {successMessage && (
            <div className="mt-4 p-5 bg-emerald-50 border border-emerald-100 rounded-xl space-y-4">
              <p className="text-[13px] font-semibold text-emerald-800">{successMessage}</p>
              {createdCredentials && (
                <div className="space-y-3 pt-3 border-t border-emerald-200/55">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Default Branch Credentials:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(createdCredentials).map(([roleName, creds]: [string, any]) => (
                      <div key={roleName} className="bg-white p-3.5 rounded-lg border border-emerald-100/80 shadow-sm flex flex-col justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide capitalize">{roleName}</p>
                          <p className="text-[13px] font-semibold text-gray-800 mt-1 select-all">{creds.email}</p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[11px] text-gray-500 font-medium">Password: <code className="text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded font-mono select-all">{creds.password}</code></span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] font-medium text-emerald-700/80">💡 Use these credentials to log into the branch client server.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-gray-900">Active Branches</h2>
          <button onClick={fetchBranches} className="text-gray-500 hover:text-gray-950 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[13px]">Loading branches...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Branch ID', 'Name', 'Status', 'API Key / Token', 'Last Active', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {branches.map(branch => (
                  <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-[13px] font-medium text-gray-900">
                      <code className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[12px]">{branch.id}</code>
                    </td>
                    <td className="px-4 py-4 text-[13px] font-medium text-gray-900">{branch.name}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide border w-fit ${branch.suspended ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                          {branch.suspended ? 'Suspended' : 'Active'}
                        </span>
                        {!branch.suspended && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border w-fit ${
                            isSyncDelayed(branch.lastSeen)
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}>
                            {isSyncDelayed(branch.lastSeen) ? 'Sync Delayed (>1h)' : 'Synced'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-55 text-gray-600 px-2 py-1 rounded text-[11px] font-mono select-all truncate max-w-[150px]">
                          {branch.apiKey}
                        </code>
                        <button
                          onClick={() => handleCopyKey(branch.apiKey, branch.id)}
                          className="text-gray-400 hover:text-teal-600 transition-colors p-1"
                          title="Copy API Key"
                        >
                          {copiedId === branch.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[13px] font-normal text-gray-500 whitespace-nowrap">
                      {branch.lastSeen ? new Date(branch.lastSeen).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSuspend(branch.id, branch.suspended)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium uppercase tracking-wide border transition-all ${branch.suspended ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                          title={branch.suspended ? 'Unsuspend Branch' : 'Suspend Branch'}
                        >
                          <Power size={12} />
                          {branch.suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => handleRotateKey(branch.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium rounded-lg uppercase tracking-wide transition-colors border border-gray-200"
                          title="Rotate API Key"
                        >
                          <RefreshCw size={12} />
                          Rotate Key
                        </button>
                        <button
                          onClick={() => setShowCredsBranch(branch)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-[11px] font-medium rounded-lg uppercase tracking-wide transition-colors border border-teal-200"
                          title="View Branch Credentials"
                        >
                          <Key size={12} />
                          Credentials
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {branches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-400">
                      <GitBranch size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-[13px] font-medium">No registered branches found</p>
                      <p className="text-[11px]">Click "Register Branch" above to add the first location.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showCredsBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl relative flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">Branch Credentials & Users</h2>
                <p className="text-[12px] text-teal-600 mt-0.5">Location: {showCredsBranch.name} ({showCredsBranch.id})</p>
              </div>
              <button
                onClick={() => setShowCredsBranch(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 py-4 overflow-y-auto flex-1">
              {/* API Key */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">API Integration Key</p>
                <div className="flex items-center gap-3 mt-1.5 bg-white p-2 rounded-lg border border-gray-200">
                  <code className="text-gray-805 text-[12px] font-mono break-all select-all flex-1">{showCredsBranch.apiKey}</code>
                  <button
                    onClick={() => handleCopyKey(showCredsBranch.apiKey, 'modal')}
                    className="text-gray-500 hover:text-teal-600 transition-colors shrink-0 p-1 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                    title="Copy API Key"
                  >
                    {copiedId === 'modal' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Default Credentials */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Default Login Credentials</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wide">Admin Account</p>
                    <p className="text-[13px] text-gray-800 mt-1 font-medium select-all">admin@{showCredsBranch.id}.com</p>
                    <p className="text-[11px] text-gray-500 mt-1">Default Password: <code className="text-gray-800 bg-white px-1 py-0.5 rounded border border-gray-200 font-mono select-all">admin_{showCredsBranch.id}</code></p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wide">Reception Account</p>
                    <p className="text-[13px] text-gray-800 mt-1 font-medium select-all">reception@{showCredsBranch.id}.com</p>
                    <p className="text-[11px] text-gray-500 mt-1">Default Password: <code className="text-gray-800 bg-white px-1 py-0.5 rounded border border-gray-200 font-mono select-all">reception_{showCredsBranch.id}</code></p>
                  </div>
                </div>
              </div>

              {/* Current Users */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Currently Configured Users ({showCredsBranch.users?.length ?? 0})</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600">
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Role</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {showCredsBranch.users && showCredsBranch.users.length > 0 ? (
                        showCredsBranch.users.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2 font-medium text-gray-900">{u.name}</td>
                            <td className="px-4 py-2 font-mono select-all">{u.email}</td>
                            <td className="px-4 py-2 capitalize">{u.role}</td>
                            <td className="px-4 py-2">
                              <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium border uppercase tracking-wider ${u.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {u.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-gray-400">No users found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end shrink-0">
              <button
                onClick={() => setShowCredsBranch(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[13px] font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
