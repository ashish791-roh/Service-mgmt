import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard, Modal, FormInput, FormSelect, FormTextarea, StatusBadge, UrgencyDot, EmptyState, Toast, useToast, PartStatusBadge } from '../components/ui';

// ── ReceptionDashboard ─────────────────────────────────────────
export const ReceptionDashboard: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const { jobs, customers, users, partRequests } = useApp();
  const pendingParts = partRequests.filter(r => r.status === 'Pending');
  const unassigned = jobs.filter(j => !j.assignedEngineerId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Reception Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Manage customers and job assignments</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" value={jobs.length} icon="🔧" color="text-slate-800" />
        <StatCard label="Unassigned" value={unassigned.length} icon="⚠️" color="text-red-600" sub="Need assignment" />
        <StatCard label="In Progress" value={jobs.filter(j => j.status === 'In Progress').length} icon="⚙️" color="text-amber-600" />
        <StatCard label="Customers" value={customers.length} icon="🧑‍💼" color="text-indigo-600" />
      </div>

      {unassigned.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🚨</span>
            <h3 className="font-bold text-red-700">Jobs Needing Assignment ({unassigned.length})</h3>
          </div>
          <div className="space-y-2">
            {unassigned.map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              return (
                <div key={job.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-red-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{customer?.name} — {job.problemDescription.substring(0, 40)}...</p>
                    <p className="text-xs text-slate-400">{new Date(job.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <button onClick={() => onNavigate('assign')} className="bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-400 transition">Assign →</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendingParts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔩</span>
            <h3 className="font-bold text-amber-700">Pending Parts Approval ({pendingParts.length})</h3>
          </div>
          <button onClick={() => onNavigate('parts')} className="text-sm text-amber-600 font-semibold hover:underline">Review requests →</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <h2 className="font-bold text-slate-800">Recent Jobs</h2>
          <button onClick={() => onNavigate('jobs')} className="text-xs text-indigo-500 font-semibold hover:underline">View all →</button>
        </div>
        <div className="divide-y divide-slate-50">
          {jobs.slice(0, 6).map(job => {
            const customer = customers.find(c => c.id === job.customerId);
            const engineer = users.find(u => u.id === job.assignedEngineerId);
            return (
              <div key={job.id} className="flex items-center gap-4 px-6 py-3.5">
                <UrgencyDot createdAt={job.createdAt} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{customer?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{job.problemDescription}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={job.status} />
                  <p className="text-xs text-slate-400 mt-1">{engineer ? engineer.name : '— Unassigned —'}</p>
                </div>
                <span className="text-sm font-bold text-slate-700">₹{job.estimatedCost.toLocaleString()}</span>
              </div>
            );
          })}
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

  const [search, setSearch] = useState('');
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">{customers.length} registered customers</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          + New Job Registration
        </button>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="grid gap-3">
        {filtered.map(c => {
          const cJobs = jobs.filter(j => j.customerId === c.id);
          const cDevices = devices.filter(d => d.customerId === c.id);
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl font-black text-indigo-500">{c.name.charAt(0)}</div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">{c.name}</h3>
                <p className="text-sm text-slate-500">📞 {c.phone} · 📍 {c.address}</p>
                <p className="text-xs text-slate-400 mt-0.5">Since {new Date(c.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-700">{cJobs.length} job{cJobs.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-slate-400">{cDevices.length} device{cDevices.length !== 1 ? 's' : ''}</p>
                <div className="flex gap-1 mt-1 justify-end flex-wrap">
                  {cJobs.slice(0, 2).map(j => <StatusBadge key={j.id} status={j.status} />)}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState icon="🧑‍💼" title="No customers found" desc="Try a different search or register a new customer" />}
      </div>

      {showModal && (
        <Modal title={`New Job Registration — Step ${step}/3`} onClose={() => { setShowModal(false); setStep(1); }}>
          {/* Step indicators */}
          <div className="flex gap-2 mb-6">
            {['Customer Info', 'Device Details', 'Job & Assignment'].map((label, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1.5 rounded-full ${i + 1 <= step ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                <p className={`text-xs mt-1 ${i + 1 === step ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {step === 1 && (
              <>
                <FormInput label="Customer Name *" value={custForm.name} onChange={e => setCustForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                <FormInput label="Phone Number *" value={custForm.phone} onChange={e => setCustForm(f => ({ ...f, phone: e.target.value }))} placeholder="10-digit mobile number" />
                <FormInput label="Address" value={custForm.address} onChange={e => setCustForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
              </>
            )}
            {step === 2 && (
              <>
                <FormSelect label="Device Type *" value={deviceForm.type} onChange={e => setDeviceForm(f => ({ ...f, type: e.target.value }))}
                  options={['Laptop', 'Desktop', 'Smartphone', 'Tablet', 'Printer', 'Other'].map(v => ({ value: v, label: v }))} placeholder="Select device type" />
                <FormInput label="Brand *" value={deviceForm.brand} onChange={e => setDeviceForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Dell, HP, Samsung" />
                <FormInput label="Model *" value={deviceForm.model} onChange={e => setDeviceForm(f => ({ ...f, model: e.target.value }))} placeholder="e.g. Inspiron 15, Galaxy S23" />
                <FormInput label="Serial Number (optional)" value={deviceForm.serialNumber} onChange={e => setDeviceForm(f => ({ ...f, serialNumber: e.target.value }))} placeholder="Serial / IMEI number" />
              </>
            )}
            {step === 3 && (
              <>
                <FormTextarea label="Problem Description *" value={jobForm.problemDescription} onChange={e => setJobForm(f => ({ ...f, problemDescription: e.target.value }))} placeholder="Describe the issue in detail..." rows={4} />
                <FormInput label="Estimated Cost (₹) *" type="number" value={jobForm.estimatedCost} onChange={e => setJobForm(f => ({ ...f, estimatedCost: e.target.value }))} placeholder="0.00" />
                <FormSelect label="Assign Engineer (optional)" value={jobForm.assignedEngineerId} onChange={e => setJobForm(f => ({ ...f, assignedEngineerId: e.target.value }))}
                  options={engineers.map(e => ({ value: e.id, label: e.name }))} placeholder="— Assign later —" />
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">← Back</button>}
            <button onClick={handleNext} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
              {step < 3 ? 'Next →' : '✓ Register Job'}
            </button>
          </div>
        </Modal>
      )}
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">All Jobs</h1>
        <p className="text-slate-500 text-sm mt-1">{filtered.length} jobs</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === s ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={engineerFilter} onChange={e => setEngineerFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none">
          <option value="All">All Engineers</option>
          {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left">
              {['', 'Job ID', 'Customer', 'Device', 'Problem', 'Engineer', 'Status', 'Cost'].map(h => (
                <th key={h} className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              const device = devices.find(d => d.id === job.deviceId);
              const engineer = users.find(u => u.id === job.assignedEngineerId);
              return (
                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="pl-4 py-3.5"><UrgencyDot createdAt={job.createdAt} /></td>
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-400">#{job.id}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-slate-700">{customer?.name}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{device?.brand} {device?.model}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 max-w-[180px] truncate">{job.problemDescription}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{engineer?.name ?? <span className="text-red-400 italic">Unassigned</span>}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={job.status} /></td>
                  <td className="px-4 py-3.5 text-sm font-bold text-slate-700">₹{job.estimatedCost.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon="🔧" title="No jobs found" desc="Try adjusting the filters" />}
      </div>
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
    show('Engineer assigned & notified!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Assign Jobs</h1>
        <p className="text-slate-500 text-sm mt-1">{unassigned.length} jobs need assignment</p>
      </div>

      {/* Engineer workload summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {engineers.map(eng => {
          const active = jobs.filter(j => j.assignedEngineerId === eng.id && ['Assigned', 'In Progress'].includes(j.status)).length;
          return (
            <div key={eng.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">{eng.name.charAt(0)}</div>
                <p className="text-sm font-semibold text-slate-700 truncate">{eng.name}</p>
              </div>
              <p className="text-2xl font-black text-blue-600">{active}</p>
              <p className="text-xs text-slate-400">active jobs</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {unassigned.length === 0 ? (
          <EmptyState icon="🎉" title="All jobs assigned!" desc="No jobs are waiting for assignment right now." />
        ) : (
          unassigned.map(job => {
            const customer = customers.find(c => c.id === job.customerId);
            const device = devices.find(d => d.id === job.deviceId);
            return (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <UrgencyDot createdAt={job.createdAt} />
                      <span className="text-xs font-mono text-slate-400">#{job.id}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <h3 className="font-bold text-slate-800">{customer?.name}</h3>
                    <p className="text-sm text-slate-500">{device?.brand} {device?.model} ({device?.type})</p>
                    <p className="text-sm text-slate-600 mt-1">{job.problemDescription}</p>
                    <p className="text-xs text-slate-400 mt-1">Registered: {new Date(job.createdAt).toLocaleDateString('en-IN')} · Est. ₹{job.estimatedCost.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      defaultValue=""
                      onChange={e => e.target.value && handleAssign(job.id, e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Assign engineer…</option>
                      {engineers.map(e => {
                        const load = jobs.filter(j => j.assignedEngineerId === e.id && ['Assigned', 'In Progress'].includes(j.status)).length;
                        return <option key={e.id} value={e.id}>{e.name} ({load} jobs)</option>;
                      })}
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {toast && <Toast {...toast} />}
    </div>
  );
};

// ── PartsRequestPage (Manager view) ───────────────────────────
export const PartsRequestPage: React.FC = () => {
  const { partRequests, jobs, users, updatePartRequest } = useApp();
  const { toast, show } = useToast();
  const [filter, setFilter] = useState('Pending');

  const filtered = partRequests.filter(r => filter === 'All' ? true : r.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Parts Requests</h1>
        <p className="text-slate-500 text-sm mt-1">Review and approve engineer part requests</p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 w-fit">
        {['Pending', 'Approved', 'Rejected', 'All'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter === s ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            {s} {s === 'Pending' && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs">{partRequests.filter(r => r.status === 'Pending').length}</span>}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <EmptyState icon="🔩" title="No requests" desc="No part requests in this category" />}
        {filtered.map(req => {
          const engineer = users.find(u => u.id === req.engineerId);
          const job = jobs.find(j => j.id === req.jobId);
          return (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <PartStatusBadge status={req.status} />
                    <span className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <h3 className="font-bold text-slate-800">{req.partName}</h3>
                  <p className="text-sm text-slate-600">Qty: {req.quantity} · Requested by: {engineer?.name}</p>
                  <p className="text-sm text-slate-500 mt-1 italic">"{req.reason}"</p>
                  {job && <p className="text-xs text-slate-400 mt-1">Job #{job.id}: {job.problemDescription.substring(0, 50)}…</p>}
                </div>
                {req.status === 'Pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => { updatePartRequest(req.id, 'Rejected'); show('Request rejected', 'error'); }}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm rounded-xl transition">
                      ✕ Reject
                    </button>
                    <button onClick={() => { updatePartRequest(req.id, 'Approved'); show('Request approved!'); }}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm rounded-xl transition">
                      ✓ Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {toast && <Toast {...toast} />}
    </div>
  );
};
