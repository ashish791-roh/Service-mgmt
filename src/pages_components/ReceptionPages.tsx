import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge, UrgencyDot, Toast, useToast, PartStatusBadge } from '../components/ui';
import { Briefcase, AlertCircle, Zap, Users, Settings, Search, Plus, ArrowRight, X } from 'lucide-react';

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const MetricCard = ({ title, value, icon: Icon, colorClass, sub }: any) => (
  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={20} />
      </div>
      {sub && <span className="bg-rose-100 text-rose-600 text-[11px] font-medium px-2.5 py-1 rounded-md uppercase tracking-wide">{sub}</span>}
    </div>
    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
    <h3 className="text-[24px] font-medium text-gray-900 leading-none">{value}</h3>
  </div>
);

const Button = ({ icon: Icon, text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: any = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    outline_danger: "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50",
    ghost: "bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100"
  };
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

// ── ReceptionDashboard ─────────────────────────────────────────
export const ReceptionDashboard: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const { jobs, customers, users, partRequests } = useApp();
  const pendingParts = partRequests.filter(r => r.status === 'Pending');
  const unassigned = jobs.filter(j => !j.assignedEngineerId);

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Command Center" subtitle="Real-time operations" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Jobs" value={jobs.length} icon={Briefcase} colorClass="bg-cyan-50 text-cyan-600 border border-cyan-200" />
        <MetricCard title="Unassigned" value={unassigned.length} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600 border border-rose-200" sub="Action Needed" />
        <MetricCard title="In Progress" value={jobs.filter(j => j.status === 'In Progress').length} icon={Zap} colorClass="bg-amber-50 text-amber-600 border border-amber-200" />
        <MetricCard title="Customers" value={customers.length} icon={Users} colorClass="bg-green-50 text-green-600 border border-green-200" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-[18px] font-medium text-gray-900">Live Activity Feed</h2>
              <button onClick={() => onNavigate('jobs')} className="text-[13px] font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View All <ArrowRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {jobs.slice(0, 6).map((job) => {
                const customer = customers.find(c => c.id === job.customerId);
                const engineer = users.find(u => u.id === job.assignedEngineerId);
                return (
                  <div key={job.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <UrgencyDot createdAt={job.createdAt} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate mb-0.5">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500 truncate">{job.problemDescription}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={job.status} />
                      <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-wide">{engineer ? engineer.name : '— Unassigned —'}</p>
                    </div>
                    <span className="text-[13px] font-medium text-gray-900 ml-4 w-20 text-right">₹{job.estimatedCost.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {unassigned.length > 0 && (
            <Card className="bg-rose-50 border-rose-200">
              <div className="px-5 py-4 flex items-center gap-3 border-b border-rose-200/50">
                <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-sm">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-[18px] font-medium text-rose-900">Urgent Assignments</h3>
                  <p className="text-[11px] font-medium text-rose-500 uppercase tracking-wide">{unassigned.length} Jobs Waiting</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {unassigned.slice(0, 3).map(job => {
                  const customer = customers.find(c => c.id === job.customerId);
                  return (
                    <div key={job.id} className="bg-white rounded-lg p-4 shadow-sm border border-rose-100">
                      <p className="text-[13px] font-medium text-gray-900 mb-1">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500 line-clamp-1 mb-3">{job.problemDescription}</p>
                      <Button text="Assign Now" variant="primary" onClick={() => onNavigate('assign')} className="w-full" />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {pendingParts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm mb-3">
                  <Settings size={24} />
                </div>
                <h3 className="text-[18px] font-medium text-amber-900 mb-1">Parts Approval</h3>
                <p className="text-[13px] font-medium text-amber-700 mb-4">{pendingParts.length} requests pending review</p>
                <Button text="Review Requests" variant="primary" onClick={() => onNavigate('parts')} className="w-full" />
              </div>
            </Card>
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
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Client Directory" subtitle="Manage and search customer records" 
        action={<Button icon={Plus} text="New Registration" onClick={() => setShowModal(true)} />} />

      <div className="relative max-w-2xl">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Search size={18} /></div>
        <input 
          value={search} onChange={e => setSearch(e.target.value)} 
          placeholder="Search by name or phone number..." 
          className="w-full bg-white border border-gray-200 rounded-lg pl-12 pr-4 py-3 text-[13px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const cJobs = jobs.filter(j => j.customerId === c.id);
          const cDevices = devices.filter(d => d.customerId === c.id);
          return (
            <Card key={c.id} className="p-5 flex flex-col h-full hover:border-teal-300 transition-colors">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center text-[18px] font-medium text-teal-600 border border-teal-100 shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-[13px] font-medium text-gray-900 mb-0.5">{c.name}</h3>
                  <p className="text-[11px] font-normal text-gray-500 mb-0.5">{c.phone}</p>
                  <p className="text-[11px] font-normal text-gray-400 line-clamp-1">{c.address}</p>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex gap-4">
                  <div>
                    <p className="text-[18px] font-medium text-gray-900 leading-none">{cJobs.length}</p>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-1">Jobs</p>
                  </div>
                  <div>
                    <p className="text-[18px] font-medium text-gray-900 leading-none">{cDevices.length}</p>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-1">Devices</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {cJobs.slice(0, 2).map(j => <StatusBadge key={j.id} status={j.status} />)}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-8 shadow-lg overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Registration</h2>
                <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mt-1">Step {step} of 3</p>
              </div>
              <button onClick={() => { setShowModal(false); setStep(1); }} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>

            <div className="flex gap-2 mb-8">
              {['Client Profile', 'Device Specs', 'Job Details'].map((label, i) => (
                <div key={i} className="flex-1">
                  <div className={`h-1.5 rounded-full mb-2 transition-colors ${i + 1 <= step ? 'bg-teal-500' : 'bg-gray-100'}`} />
                  <p className={`text-[11px] font-medium uppercase tracking-wide ${i + 1 === step ? 'text-teal-600' : 'text-gray-400'}`}>{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-8">
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Customer Name *</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} placeholder="Full Name" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Phone Number *</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={custForm.phone} onChange={e => setCustForm({ ...custForm, phone: e.target.value })} placeholder="Mobile Number" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={custForm.address} onChange={e => setCustForm({ ...custForm, address: e.target.value })} placeholder="Complete Address" />
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Device Type *</label>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={deviceForm.type} onChange={e => setDeviceForm({ ...deviceForm, type: e.target.value })}>
                      <option value="">Select Category</option>
                      {['Laptop', 'Desktop', 'Smartphone', 'Tablet', 'Printer', 'Other'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Brand *</label>
                      <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={deviceForm.brand} onChange={e => setDeviceForm({ ...deviceForm, brand: e.target.value })} placeholder="Brand" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Model *</label>
                      <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={deviceForm.model} onChange={e => setDeviceForm({ ...deviceForm, model: e.target.value })} placeholder="Model" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Serial / IMEI (Optional)</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={deviceForm.serialNumber} onChange={e => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })} placeholder="Serial Number" />
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Issue Description *</label>
                    <textarea className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors resize-none" rows={4} value={jobForm.problemDescription} onChange={e => setJobForm({ ...jobForm, problemDescription: e.target.value })} placeholder="Describe the problem in detail..." />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Quote Estimation (₹) *</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" type="number" value={jobForm.estimatedCost} onChange={e => setJobForm({ ...jobForm, estimatedCost: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Direct Assignment</label>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={jobForm.assignedEngineerId} onChange={e => setJobForm({ ...jobForm, assignedEngineerId: e.target.value })}>
                      <option value="">Leave Unassigned for now</option>
                      {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              {step > 1 && <Button text="Back" variant="outline" onClick={() => setStep(s => s - 1)} className="px-6" />}
              <Button text={step < 3 ? 'Continue' : 'Register'} variant="primary" onClick={handleNext} className="flex-1" />
            </div>
          </div>
        </div>
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
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Job Database" subtitle={`Currently tracking ${filtered.length} active jobs`} />

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit overflow-x-auto">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={engineerFilter} onChange={e => setEngineerFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 min-w-[200px]">
          <option value="All">All Engineers</option>
          {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['', 'ID', 'Client & Device', 'Issue Overview', 'Assignment', 'Status', 'Quote'].map(h => (
                  <th key={h} className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((job) => {
                const customer = customers.find(c => c.id === job.customerId);
                const device = devices.find(d => d.id === job.deviceId);
                const engineer = users.find(u => u.id === job.assignedEngineerId);
                return (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="pl-6 py-4"><UrgencyDot createdAt={job.createdAt} /></td>
                    <td className="px-6 py-4 text-[11px] font-medium text-gray-400">#{job.id}</td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-medium text-gray-900 mb-0.5">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500">{device?.brand} {device?.model}</p>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-normal text-gray-600 max-w-[250px] truncate">{job.problemDescription}</td>
                    <td className="px-6 py-4">
                      {engineer ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-teal-50 text-teal-600 flex items-center justify-center text-[11px] font-medium border border-teal-100">{engineer.name.charAt(0)}</div>
                          <span className="text-[13px] font-medium text-gray-900">{engineer.name}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-rose-500 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md uppercase tracking-wide">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                    <td className="px-6 py-4 text-[13px] font-medium text-gray-900">₹{job.estimatedCost.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
                <Search size={24} />
              </div>
              <p className="text-[13px] font-medium text-gray-900 mb-1">No jobs found</p>
              <p className="text-[11px] font-normal text-gray-500">Try adjusting your filters to see more results.</p>
            </div>
          )}
        </div>
      </Card>
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
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Workforce Dispatch" subtitle={`${unassigned.length} critical jobs require assignment`} />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {engineers.map((eng) => {
          const active = jobs.filter(j => j.assignedEngineerId === eng.id && ['Assigned', 'In Progress'].includes(j.status)).length;
          return (
            <Card key={eng.id} className="p-4 text-center h-full">
              <div className="w-12 h-12 mx-auto rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center text-[18px] font-medium mb-3 border border-cyan-100">
                {eng.name.charAt(0)}
              </div>
              <p className="text-[13px] font-medium text-gray-900 truncate mb-2">{eng.name}</p>
              <div className="flex items-center justify-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${active > 3 ? 'bg-amber-500' : 'bg-green-500'}`} />
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{active} Active</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {unassigned.map((job) => {
          const customer = customers.find(c => c.id === job.customerId);
          const device = devices.find(d => d.id === job.deviceId);
          return (
            <Card key={job.id} className="flex flex-col h-full hover:border-teal-300 transition-colors">
              <div className="p-5 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UrgencyDot createdAt={job.createdAt} />
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">#{job.id}</span>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <h3 className="text-[18px] font-medium text-gray-900 mb-1">{customer?.name}</h3>
                <p className="text-[11px] font-medium text-teal-600 mb-4">{device?.brand} {device?.model}</p>
                <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                  <p className="text-[11px] font-normal text-gray-600 leading-relaxed line-clamp-3">{job.problemDescription}</p>
                </div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Since {new Date(job.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <select
                  defaultValue=""
                  onChange={e => e.target.value && handleAssign(job.id, e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="" disabled>Select Engineer to Dispatch...</option>
                  {engineers.map(e => {
                    const load = jobs.filter(j => j.assignedEngineerId === e.id && ['Assigned', 'In Progress'].includes(j.status)).length;
                    return <option key={e.id} value={e.id}>{e.name} ({load} active)</option>;
                  })}
                </select>
              </div>
            </Card>
          );
        })}
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
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Inventory Logistics" subtitle="Manage and approve part requisition orders" />

      <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit mb-6">
        {['Pending', 'Approved', 'Rejected', 'All'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors flex items-center gap-2 ${filter === s ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
            {s}
            {s === 'Pending' && partRequests.filter(r => r.status === 'Pending').length > 0 && (
              <span className={`px-2 py-0.5 rounded text-[11px] uppercase tracking-wide ${filter === s ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'}`}>
                {partRequests.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((req) => {
          const engineer = users.find(u => u.id === req.engineerId);
          const job = jobs.find(j => j.id === req.jobId);
          return (
            <Card key={req.id} className="flex flex-col sm:flex-row h-full">
              <div className="p-5 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <PartStatusBadge status={req.status} />
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <h3 className="text-[18px] font-medium text-gray-900 mb-2">{req.partName}</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-4">
                  <p className="text-[13px] font-normal text-gray-600 italic mb-2">"{req.reason}"</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-white px-2 py-1 rounded border border-gray-200 text-[11px] font-medium text-gray-900">QTY: {req.quantity}</div>
                    <p className="text-[11px] font-medium text-gray-500">By <span className="text-teal-600">{engineer?.name}</span></p>
                  </div>
                </div>
                
                {job && (
                  <div className="text-[11px] font-medium text-gray-500 flex items-center gap-2 bg-gray-50 py-1.5 px-2.5 rounded-md w-fit">
                    <span className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">#{job.id}</span>
                    <span className="truncate max-w-[200px]">{job.problemDescription}</span>
                  </div>
                )}
              </div>
              
              {req.status === 'Pending' && (
                <div className="flex sm:flex-col gap-2 justify-center bg-gray-50 border-t sm:border-t-0 sm:border-l border-gray-100 p-4 min-w-[140px]">
                  <Button text="Approve" variant="success" onClick={() => { updatePartRequest(req.id, 'Approved'); show('Part request approved for logistics.'); }} className="w-full" />
                  <Button text="Reject" variant="outline_danger" onClick={() => { updatePartRequest(req.id, 'Rejected'); show('Request rejected', 'error'); }} className="w-full" />
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {toast && <Toast {...toast} />}
    </div>
  );
};
