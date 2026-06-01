import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, UrgencyDot, JobAgeBadge, getJobAgeLevel, SLABadge, Toast, useToast } from '../../components/ui';
import { JobDrawer } from '../../components/JobDrawer';
import { QRModal } from './components/QRModal';
import { PageHeader, Card, Button } from './components/ReceptionUIComponents';
import { Users, Search, Plus, X, Phone, MapPin, Monitor, Wrench, Calendar, QrCode, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import type { Customer, Device, Job } from '../../types';

type JobWithDetails = Job & { customer?: Customer; device?: Device };

export const JobsPage: React.FC = () => {
  const { users, currentUser, slaTiers, deleteJob, addCustomer, addDevice, addJob, updateCustomer, deleteCustomer, jobRefreshTrigger, customerRefreshTrigger } = useApp();
  const { toast: jobsToast, show: showJobToast } = useToast();
  const showFinancials = currentUser?.role !== 'engineer';

  // ── Search & Filter State ──
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [engineerFilter, setEngineerFilter] = useState<string>('All');
  const [customerNameSearch, setCustomerNameSearch] = useState('');

  // ── Paginated Jobs State ──
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [jobsPage, setJobsPage] = useState(1);
  const jobsLimit = 15;
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // ── Paginated Customers State (for sliding panel) ──
  const [showCustomersPanel, setShowCustomersPanel] = useState(false);
  const [customers, setCustomers] = useState<(Customer & { devices?: Device[] })[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [customersPage, setCustomersPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const customersLimit = 10;
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Modals & Details State
  const [qrJob, setQrJob] = useState<JobWithDetails | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deletingJob, setDeletingJob] = useState(false);

  // ── New Registration modal state ──
  const [showRegModal, setShowRegModal] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [newCustId, setNewCustId] = useState('');
  const [custForm, setCustForm] = useState({ name: '', phone: '', address: '', email: '' });
  const [deviceForm, setDeviceForm] = useState({ type: '', brand: '', model: '', serialNumber: '' });
  const [jobForm, setJobForm] = useState({ problemDescription: '', estimatedCost: '', advanceAmount: '', assignedEngineerId: '', linkedJobId: '' });

  // ── Customer Details State (inside panel) ──
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', email: '' });
  const [showDeleteCustConfirm, setShowDeleteCustConfirm] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const engineers = users.filter(u => u.role === 'engineer' && u.active);
  const statuses = ['All', 'New', 'Assigned', 'In Progress', 'Completed', 'Delivered'];

  // ── Fetch Jobs On-Demand ──
  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(jobsPage));
      params.set('limit', String(jobsLimit));
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (engineerFilter !== 'All') params.set('engineerId', engineerFilter);
      if (customerNameSearch.trim()) params.set('search', customerNameSearch.trim());

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setTotalJobs(data.total || 0);
      }
    } catch (err) {
      console.error('[fetchJobs error]', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // ── Fetch Customers On-Demand ──
  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(customersPage));
      params.set('limit', String(customersLimit));
      if (customerSearch.trim()) params.set('search', customerSearch.trim());

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotalCustomers(data.total || 0);
      }
    } catch (err) {
      console.error('[fetchCustomers error]', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsPage, statusFilter, engineerFilter, customerNameSearch, jobRefreshTrigger]);

  useEffect(() => {
    if (showCustomersPanel) {
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCustomersPanel, customersPage, customerSearch, customerRefreshTrigger]);

  // Reset to first page when filters change
  useEffect(() => {
    setJobsPage(1);
  }, [statusFilter, engineerFilter, customerNameSearch]);

  useEffect(() => {
    setCustomersPage(1);
  }, [customerSearch]);

  // ── Registration handlers ──
  const handleRegNext = async () => {
    if (submitting) return;
    if (regStep === 1) {
      if (!custForm.name || !custForm.phone) { showJobToast('Name and phone are required', 'error'); return; }
      setSubmitting(true);
      try {
        const c = await addCustomer(custForm);
        setNewCustId(c.id);
        setRegStep(2);
        fetchCustomers(); // Refresh customer registry
      } catch (err) {
        showJobToast(err instanceof Error ? err.message : 'Failed to save customer. Please try again.', 'error');
      } finally { setSubmitting(false); }
    } else if (regStep === 2) {
      if (!deviceForm.type || !deviceForm.brand || !deviceForm.model) { showJobToast('Device type, brand and model are required', 'error'); return; }
      setRegStep(3);
    } else {
      if (!jobForm.problemDescription || !jobForm.estimatedCost) { showJobToast('Problem description and cost are required', 'error'); return; }
      setSubmitting(true);
      try {
        const dev = await addDevice({ ...deviceForm, customerId: newCustId });
        const newJob = await addJob({
          customerId: newCustId, deviceId: dev.id,
          assignedEngineerId: jobForm.assignedEngineerId || null,
          status: jobForm.assignedEngineerId ? 'Assigned' : 'New',
          problemDescription: jobForm.problemDescription,
          estimatedCost: parseFloat(jobForm.estimatedCost),
          advanceAmount: jobForm.advanceAmount ? parseFloat(jobForm.advanceAmount) : 0,
          linkedJobId: jobForm.linkedJobId || undefined,
        });
        setShowRegModal(false);
        setRegStep(1);
        setCustForm({ name: '', phone: '', address: '', email: '' });
        setDeviceForm({ type: '', brand: '', model: '', serialNumber: '' });
        setJobForm({ problemDescription: '', estimatedCost: '', advanceAmount: '', assignedEngineerId: '', linkedJobId: '' });
        setQrJob(newJob);
        fetchJobs(); // Refresh jobs table list
      } catch (err) {
        showJobToast(err instanceof Error ? err.message : 'Failed to register job. Please try again.', 'error');
      } finally { setSubmitting(false); }
    }
  };

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setEditForm({ name: c.name, phone: c.phone, address: c.address ?? '', email: c.email ?? '' });
  };

  const handleEditCustomer = async () => {
    if (!editingCustomer) return;
    if (!editForm.name || !editForm.phone) { showJobToast('Name and phone are required', 'error'); return; }
    setActionBusy(true);
    const result = await updateCustomer(editingCustomer.id, editForm);
    setActionBusy(false);
    if (!result.ok) { showJobToast(result.error ?? 'Failed to update', 'error'); return; }
    showJobToast('Customer updated successfully');
    setEditingCustomer(null);
    setSelectedCustomer((prev: Customer | null) => prev?.id === editingCustomer.id ? { ...prev, ...editForm } as Customer : prev);
    fetchCustomers(); // Refresh registry
  };

  const handleDeleteCustomer = async (id: string) => {
    setActionBusy(true);
    const result = await deleteCustomer(id);
    setActionBusy(false);
    setShowDeleteCustConfirm(null);
    if (!result.ok) { showJobToast(result.error ?? 'Failed to delete customer', 'error'); return; }
    showJobToast('Customer deleted');
    setSelectedCustomer(null);
    fetchCustomers(); // Refresh list
  };

  // Customer detail drawer (inside customers panel)
  const CustomerDetailDrawer = () => {
    if (!selectedCustomer) return null;
    const c = selectedCustomer;
    // Note: jobs and devices are included or queried?
    // Let's filter client side since we fetch limited jobs, but wait! We can fetch from API for this customer.
    // However, to keep it simple, we can filter what's in local jobs state, or query on demand.
    // Let's query customer specific jobs and devices on demand or filter what's in context.
    const [custJobs, setCustJobs] = useState<JobWithDetails[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(true);

    useEffect(() => {
      const loadCustDetails = async () => {
        setLoadingDetails(true);
        try {
          // Fetch customer's jobs
          const resJobs = await fetch(`/api/jobs?limit=100&search=${encodeURIComponent(c.phone)}`);
          if (resJobs.ok) {
            const data = await resJobs.json();
            // Match customer ID strictly
            setCustJobs((data.jobs || []).filter((j: Job) => j.customerId === c.id));
          }
          // Fetch customer's devices (we can fetch from /api/data or fallback since all devices are small or we can fetch)
          // For simplicity, search the devices inside context. Since it's read-only, it's fine.
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingDetails(false);
        }
      };
      loadCustDetails();
    }, [c.id, c.phone]);

    const completedJobs = custJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
    const totalSpend = completedJobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
    const activeJobs = custJobs.filter(j => !['Completed', 'Delivered'].includes(j.status));

    return (
      <div className="fixed inset-0 z-[70] flex items-start justify-end bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)}>
        <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center text-[18px] font-medium text-teal-600 border border-teal-100 shrink-0">{c.name.charAt(0)}</div>
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">{c.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[12px] text-gray-500"><Phone size={11} /> {c.phone}</span>
                  {c.address && <span className="flex items-center gap-1 text-[12px] text-gray-400"><MapPin size={11} /> {c.address}</span>}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Since {new Date(c.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => openEditCustomer(c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"><Pencil size={13} />Edit</button>
              <button onClick={() => setShowDeleteCustConfirm(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"><Trash2 size={13} />Delete</button>
              <button onClick={() => setSelectedCustomer(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"><X size={16} /></button>
            </div>
          </div>

          {loadingDetails ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 divide-x divide-gray-200 border-b border-gray-200 shrink-0">
                {[
                  { label: 'Total Jobs', value: custJobs.length, color: 'text-gray-900' },
                  { label: 'Active', value: activeJobs.length, color: 'text-amber-600' },
                  { label: 'Completed', value: completedJobs.length, color: 'text-green-600' },
                  { label: 'Total Spend', value: `₹${(totalSpend / 1000).toFixed(1)}k`, color: 'text-teal-600' },
                ].map(stat => (
                  <div key={stat.label} className="px-5 py-4 text-center">
                    <p className={`text-[22px] font-medium ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex border-b border-gray-200 bg-white shrink-0 px-6">
                {[{ id: 'jobs' as const, label: `Jobs (${custJobs.length})`, icon: Wrench }].map(tab => (
                  <button key={tab.id} className="flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 border-teal-500 text-teal-600 -mb-px">
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </div>
              <div className="overflow-y-auto flex-1">
                <div className="space-y-3 p-5">
                  {custJobs.length === 0 ? (
                    <div className="text-center py-10 text-gray-400"><Wrench size={28} className="mx-auto mb-2 opacity-40" /><p className="text-[13px]">No jobs yet</p></div>
                  ) : custJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(job => {
                    const isActive = !['Completed', 'Delivered'].includes(job.status);
                    return (
                      <div key={job.id} className={`rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all ${isActive ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white'}`} onClick={() => { setSelectedCustomer(null); setSelectedJobId(job.id); }}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">#{job.id}</span><StatusBadge status={job.status} /></div>
                            <p className="text-[13px] font-medium text-gray-900">{job.problemDescription}</p>
                          </div>
                          <p className="text-[15px] font-medium text-gray-900 shrink-0">₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                          {job.device && <span className="flex items-center gap-1"><Monitor size={11} /> {job.device.brand} {job.device.model}</span>}
                          <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const totalPages = Math.ceil(totalJobs / jobsLimit);
  const totalCustomerPages = Math.ceil(totalCustomers / customersLimit);

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader
        title="Job Database"
        subtitle={`Currently tracking ${totalJobs} registered jobs`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustomersPanel(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-white border border-gray-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors shadow-sm"
            >
              <Users size={15} />
              Customers Panel
            </button>
            <Button icon={Plus} text="New Registration" onClick={() => setShowRegModal(true)} />
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-3 mb-6 flex-wrap">
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
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={customerNameSearch}
            onChange={e => setCustomerNameSearch(e.target.value)}
            placeholder="Search brand, model, customer name..."
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-[13px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto relative min-h-[150px]">
          {isLoadingJobs && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="pl-6 py-3 w-10"></th>
                <th className="px-6 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">ID</th>
                <th className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Client & Device</th>
                <th className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Problem Description</th>
                <th className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Assigned To</th>
                <th className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Deadline Status</th>
                {showFinancials && <th className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Financials</th>}
                <th className="px-3 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => {
                const customer = job.customer;
                const device = job.device;
                const engineer = users.find(u => u.id === job.assignedEngineerId);
                const ageLevel = getJobAgeLevel(job.createdAt, job.status, device?.type);
                const rowBg = ageLevel === 'red' ? 'bg-red-50/40' : ageLevel === 'yellow' ? 'bg-amber-50/40' : '';
                return (
                  <tr key={job.id} onClick={() => setSelectedJobId(job.id)} className={`hover:bg-gray-50 transition-colors cursor-pointer ${rowBg}`}>
                    <td className="pl-6 py-4"><UrgencyDot createdAt={job.createdAt} status={job.status} /></td>
                    <td className="px-6 py-4 text-[11px] font-medium text-gray-400">#{job.id.slice(-8).toUpperCase()}</td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-medium text-gray-900 mb-0.5">{customer?.name ?? 'Unknown'}</p>
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
                    <td className="px-6 py-4">
                      <SLABadge createdAt={job.createdAt} status={job.status} deviceType={device?.type} tiers={slaTiers} />
                      {!['Completed', 'Delivered'].includes(job.status) && (
                        <JobAgeBadge createdAt={job.createdAt} status={job.status} />
                      )}
                    </td>
                    {showFinancials && (
                      <td className="px-6 py-4">
                        <p className="text-[13px] font-medium text-gray-900">₹{(job.estimatedCost ?? 0).toLocaleString()}</p>
                        {(job.advanceAmount ?? 0) > 0 && (
                          <p className="text-[10px] text-green-600 font-medium mt-0.5">Adv: ₹{(job.advanceAmount ?? 0).toLocaleString()}</p>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setQrJob(job); }}
                          className="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                          title="Show QR Code"
                        >
                          <QrCode size={16} />
                        </button>
                        {(currentUser?.role === 'admin' || currentUser?.role === 'reception') && (
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteJobId(job.id); }}
                            className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete job"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {jobs.length === 0 && !isLoadingJobs && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
                <Search size={24} />
              </div>
              <p className="text-[13px] font-medium text-gray-900 mb-1">No jobs found</p>
              <p className="text-[11px] font-normal text-gray-500">Try adjusting your filters to see more results.</p>
            </div>
          )}
        </div>

        {/* ── Jobs Pagination Controls ── */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/30">
            <p className="text-[12px] text-gray-500 font-medium">
              Page {jobsPage} of {totalPages} ({totalJobs} total jobs)
            </p>
            <div className="flex gap-2">
              <button
                disabled={jobsPage <= 1}
                onClick={() => setJobsPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-[12px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={jobsPage >= totalPages}
                onClick={() => setJobsPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-[12px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {qrJob && (() => {
        const c = qrJob.customer;
        const d = qrJob.device;
        return <QRModal job={qrJob} customer={c} device={d} onClose={() => setQrJob(null)} />;
      })()}
      {selectedJobId && <JobDrawer jobId={selectedJobId} onClose={() => { setSelectedJobId(null); fetchJobs(); }} />}

      {/* ── Customers Sliding Panel ── */}
      {showCustomersPanel && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowCustomersPanel(false)}>
          <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Customers</h2>
                <p className="text-[13px] font-normal text-teal-500 mt-0.5">{totalCustomers} registered clients</p>
              </div>
              <button onClick={() => setShowCustomersPanel(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search size={15} /></div>
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-[13px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 relative">
              {isLoadingCustomers && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {customers.length === 0 && !isLoadingCustomers && (
                <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No customers found.</p>
              )}
              {customers.map(c => {
                // Approximate jobs stats based on database, in CustomerDetailDrawer we query full info
                return (
                  <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => { setSelectedCustomer(c); }}>
                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-[14px] shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{c.phone}{c.address ? ` · ${c.address}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setShowDeleteCustConfirm(c.id); }}
                        className="p-2 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Customers Pagination ── */}
            {totalCustomerPages > 1 && (
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
                <p className="text-[11px] text-gray-500 font-medium">Page {customersPage} of {totalCustomerPages}</p>
                <div className="flex gap-2">
                  <button
                    disabled={customersPage <= 1}
                    onClick={() => setCustomersPage(p => p - 1)}
                    className="px-2 py-1 rounded border border-gray-200 bg-white text-[11px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={customersPage >= totalCustomerPages}
                    onClick={() => setCustomersPage(p => p + 1)}
                    className="px-2 py-1 rounded border border-gray-200 bg-white text-[11px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCustomer && <CustomerDetailDrawer />}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Edit Customer</h2>
                <p className="text-[12px] text-teal-600 mt-0.5">Update customer details</p>
              </div>
              <button onClick={() => setEditingCustomer(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Name *</label>
                <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Phone *</label>
                <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
                <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input type="email" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingCustomer(null)} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleEditCustomer} disabled={actionBusy} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50">
                {actionBusy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirm */}
      {showDeleteCustConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-gray-900">Delete Customer</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-[13px] text-gray-600 mb-5">
              Are you sure you want to delete <strong>{customers.find(c => c.id === showDeleteCustConfirm)?.name ?? 'this customer'}</strong>? All completed job history will be removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteCustConfirm(null)} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={() => handleDeleteCustomer(showDeleteCustConfirm)} disabled={actionBusy} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-rose-50 hover:bg-rose-600 transition-colors disabled:opacity-50">
                {actionBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Registration Modal ── */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-8 shadow-lg overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">New Registration</h2>
                <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mt-1">Step {regStep} of 3</p>
              </div>
              <button onClick={() => { setShowRegModal(false); setRegStep(1); setCustForm({ name: '', phone: '', address: '', email: '' }); setDeviceForm({ type: '', brand: '', model: '', serialNumber: '' }); setJobForm({ problemDescription: '', estimatedCost: '', advanceAmount: '', assignedEngineerId: '', linkedJobId: '' }); }} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>

            <div className="flex gap-2 mb-8">
              {['Client Profile', 'Device Specs', 'Job Details'].map((label, i) => (
                <div key={i} className="flex-1">
                  <div className={`h-1.5 rounded-full mb-2 transition-colors ${i + 1 <= regStep ? 'bg-teal-500' : 'bg-gray-100'}`} />
                  <p className={`text-[11px] font-medium uppercase tracking-wide ${i + 1 === regStep ? 'text-teal-600' : 'text-gray-400'}`}>{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-8">
              {regStep === 1 && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Customer Name *</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} placeholder="Full Name" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Phone Number *</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" type="tel" maxLength={15} value={custForm.phone} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setCustForm({ ...custForm, phone: v }); }} placeholder="Mobile Number" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={custForm.address} onChange={e => setCustForm({ ...custForm, address: e.target.value })} placeholder="Complete Address" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Email Address <span className="normal-case text-gray-400 font-normal">(optional)</span></label>
                    <input type="email" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={custForm.email} onChange={e => setCustForm({ ...custForm, email: e.target.value })} placeholder="customer@example.com" />
                  </div>
                </>
              )}
              {regStep === 2 && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Device Type *</label>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={deviceForm.type} onChange={e => setDeviceForm({ ...deviceForm, type: e.target.value })}>
                      <option value="">Select Category</option>
                      {['Laptop', 'Desktop', 'Smartphone', 'Tablet', 'Printer', 'Other'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {regStep === 3 && (
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
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Advance / Deposit Collected (₹)</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" type="number" min="0" value={jobForm.advanceAmount} onChange={e => setJobForm({ ...jobForm, advanceAmount: e.target.value })} placeholder="0.00 (optional)" />
                    {jobForm.advanceAmount && parseFloat(jobForm.advanceAmount) > 0 && jobForm.estimatedCost && (
                      <p className="mt-1 text-[11px] text-teal-600 font-medium">Balance due at delivery: ₹{Math.max(parseFloat(jobForm.estimatedCost) - parseFloat(jobForm.advanceAmount), 0).toLocaleString()}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Direct Assignment</label>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={jobForm.assignedEngineerId} onChange={e => setJobForm({ ...jobForm, assignedEngineerId: e.target.value })}>
                      <option value="">Leave Unassigned for now</option>
                      {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Linked Warranty Job (Optional)</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors font-mono" value={jobForm.linkedJobId} onChange={e => setJobForm({ ...jobForm, linkedJobId: e.target.value })} placeholder="e.g. j-123456" />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              {regStep > 1 && <Button text="Back" variant="outline" onClick={() => setRegStep(s => s - 1)} className="px-6" />}
              <Button text={submitting ? 'Saving...' : regStep < 3 ? 'Continue' : 'Register'} variant="primary" onClick={handleRegNext} disabled={submitting} className="flex-1" />
            </div>
          </div>
        </div>
      )}

      {/* Delete Job Confirm */}
      {deleteJobId && (() => {
        const job = jobs.find(j => j.id === deleteJobId);
        const customer = job?.customer;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-rose-600" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-gray-900">Delete Job</h3>
                  <p className="text-[12px] text-gray-500 mt-0.5">This cannot be undone.</p>
                </div>
              </div>
              <p className="text-[13px] text-gray-600 mb-1">
                Delete job for <strong>{customer?.name ?? 'Unknown'}</strong>?
              </p>
              <p className="text-[12px] text-gray-400 mb-5 line-clamp-2">{job?.problemDescription}</p>
              {job?.status === 'In Progress' && (
                <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                  ⚠ This job is In Progress. Change its status before deleting.
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setDeleteJobId(null)} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                <button
                  onClick={async () => {
                    setDeletingJob(true);
                    const result = await deleteJob(deleteJobId);
                    setDeletingJob(false);
                    setDeleteJobId(null);
                    if (!result.ok) { showJobToast(result.error ?? 'Failed to delete job', 'error'); }
                    else { showJobToast('Job deleted successfully'); fetchJobs(); }
                  }}
                  disabled={deletingJob || job?.status === 'In Progress'}
                  className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50"
                >
                  {deletingJob ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {jobsToast && <Toast {...jobsToast} />}
    </div>
  );
};