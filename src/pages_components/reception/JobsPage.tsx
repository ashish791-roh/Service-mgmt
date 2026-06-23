import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, UrgencyDot, JobAgeBadge, getJobAgeLevel, SLABadge, Toast, useToast } from '../../components/ui';
import { JobDrawer } from '../../components/JobDrawer';
import { QRModal } from './components/QRModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { PageHeader, Card, Button } from './components/ReceptionUIComponents';
import { Users, Search, Plus, X, QrCode, Trash2, AlertTriangle } from 'lucide-react';
import type { Customer, Device, Job } from '../../types';
import { TallySyncBadge } from '../../components/TallySyncBadge';

import { usePrefetch } from '../../hooks/usePrefetch';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionListItem } from '../../components/MotionListItem';
import { MotionButton } from '../../components/MotionButton';

const modalVariants = {
  hidden:  { opacity: 0, scale: 0.94, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { type: 'spring', stiffness: 480, damping: 36 } },
  exit:    { opacity: 0, scale: 0.96, y: 8,  transition: { duration: 0.15 } },
} as const;

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
} as const;

type JobWithDetails = Job & { customer?: Customer; device?: Device; tallyStatus?: string | null };

const JobRow: React.FC<{
  job: JobWithDetails;
  onOpen: (id: string) => void;
  users: any[];
  slaTiers: any;
  showFinancials: boolean;
  currentUser: any;
  setQrJob: (job: JobWithDetails) => void;
  setDeleteJobId: (id: string) => void;
}> = ({ job, onOpen, users, slaTiers, showFinancials, currentUser, setQrJob, setDeleteJobId }) => {
  const { onMouseEnter, onMouseLeave } = usePrefetch(`/api/jobs/${job.id}`);
  const customer = job.customer;
  const device = job.device;
  const engineer = users.find(u => u.id === job.assignedEngineerId);
  const ageLevel = getJobAgeLevel(job.createdAt, job.status, device?.type);
  const rowBg = ageLevel === 'red' ? 'bg-red-50/40' : ageLevel === 'yellow' ? 'bg-amber-50/40' : '';

  return (
    <motion.tr
      layout="position"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={() => onOpen(job.id)}
      className={`hover:bg-gray-50 transition-colors cursor-pointer ${rowBg}`}
    >
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
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={job.status} />
          {job.tallyStatus && <TallySyncBadge status={job.tallyStatus} />}
        </div>
      </td>
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
    </motion.tr>
  );
};

export const JobsPage: React.FC = () => {
  const { users, currentUser, slaTiers, deleteJob, addCustomer, addDevice, addJob, updateCustomer, deleteCustomer, jobRefreshTrigger, customerRefreshTrigger, jobs: allJobs } = useApp();
  const { toast: jobsToast, show: showJobToast } = useToast();
  const showFinancials = currentUser?.role !== 'engineer';

  // ── Search & Filter State ──
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [engineerFilter, setEngineerFilter] = useState<string>('All');
  const [customerNameSearch, setCustomerNameSearch] = useState('');
  const [debouncedCustomerNameSearch, setDebouncedCustomerNameSearch] = useState('');

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
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
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
  const [selectedCustomer, setSelectedCustomer] = useState<(Customer & { devices?: Device[] }) | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', email: '' });
  const [showDeleteCustConfirm, setShowDeleteCustConfirm] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const engineers = useMemo(() => users.filter(u => u.role === 'engineer' && u.active), [users]);
  const statuses = ['All', 'New', 'Assigned', 'In Progress', 'Completed', 'Delivered'];

  // ── Debounce Search Logic ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerNameSearch(customerNameSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerNameSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const jobsAbortRef = React.useRef<AbortController | null>(null);

  const fetchJobs = async () => {
    jobsAbortRef.current?.abort();
    jobsAbortRef.current = new AbortController();
    const signal = jobsAbortRef.current.signal;

    setIsLoadingJobs(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(jobsPage));
      params.set('limit', String(jobsLimit));
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (engineerFilter !== 'All') params.set('engineerId', engineerFilter);
      if (debouncedCustomerNameSearch.trim()) params.set('search', debouncedCustomerNameSearch.trim());

      const res = await fetch(`/api/jobs?${params.toString()}`, { signal });
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotalJobs(data.total || 0);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[fetchJobs error]', err);
    } finally {
      if (!signal.aborted) {
        setIsLoadingJobs(false);
      }
    }
  };

  const customersAbortRef = React.useRef<AbortController | null>(null);

  const fetchCustomers = async () => {
    customersAbortRef.current?.abort();
    customersAbortRef.current = new AbortController();
    const signal = customersAbortRef.current.signal;

    setIsLoadingCustomers(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(customersPage));
      params.set('limit', String(customersLimit));
      if (debouncedCustomerSearch.trim()) params.set('search', debouncedCustomerSearch.trim());

      const res = await fetch(`/api/customers?${params.toString()}`, { signal });
      if (!res.ok) return;
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotalCustomers(data.total || 0);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[fetchCustomers error]', err);
    } finally {
      if (!signal.aborted) {
        setIsLoadingCustomers(false);
      }
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsPage, statusFilter, engineerFilter, debouncedCustomerNameSearch, jobRefreshTrigger]);

  useEffect(() => {
    if (showCustomersPanel) {
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCustomersPanel, customersPage, debouncedCustomerSearch, customerRefreshTrigger]);

  // Reset to first page when filters change
  useEffect(() => {
    setJobsPage(1);
  }, [statusFilter, engineerFilter, debouncedCustomerNameSearch]);

  useEffect(() => {
    setCustomersPage(1);
  }, [debouncedCustomerSearch]);

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
              <AnimatePresence initial={false}>
                {jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onOpen={setSelectedJobId}
                    users={users}
                    slaTiers={slaTiers}
                    showFinancials={showFinancials}
                    currentUser={currentUser}
                    setQrJob={setQrJob}
                    setDeleteJobId={setDeleteJobId}
                  />
                ))}
              </AnimatePresence>
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
      <AnimatePresence>
        {selectedJobId && (
          <JobDrawer key={selectedJobId} jobId={selectedJobId} onClose={() => { setSelectedJobId(null); fetchJobs(); }} />
        )}
      </AnimatePresence>

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
              <AnimatePresence initial={false}>
                {customers.map((c, i) => (
                  <MotionListItem
                    key={c.id}
                    index={i}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => { setSelectedCustomer(c); }}
                  >
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
                  </MotionListItem>
                ))}
              </AnimatePresence>
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

      <AnimatePresence>
        {selectedCustomer && (
          <CustomerDetailModal
            key={selectedCustomer.id}
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            onEdit={openEditCustomer}
            onDelete={setShowDeleteCustConfirm}
            onJobClick={(jobId) => {
              setSelectedCustomer(null);
              setSelectedJobId(jobId);
            }}
            allJobs={allJobs}
          />
        )}
      </AnimatePresence>

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

      <AnimatePresence>
        {showDeleteCustConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowDeleteCustConfirm(null)}
            />
            <motion.div
              className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl relative z-10"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRegModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => { setShowRegModal(false); setRegStep(1); setCustForm({ name: '', phone: '', address: '', email: '' }); setDeviceForm({ type: '', brand: '', model: '', serialNumber: '' }); setJobForm({ problemDescription: '', estimatedCost: '', advanceAmount: '', assignedEngineerId: '', linkedJobId: '' }); }}
            />
            <motion.div
              className="bg-white rounded-xl w-full max-w-lg p-8 shadow-lg overflow-hidden relative z-10"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteJobId && (() => {
          const job = jobs.find(j => j.id === deleteJobId);
          const customer = job?.customer;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={() => setDeleteJobId(null)}
              />
              <motion.div
                className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl relative z-10"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
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
                  <MotionButton
                    loading={deletingJob}
                    disabled={job?.status === 'In Progress'}
                    variant="danger"
                    className="flex-1"
                    onClick={async () => {
                      setDeletingJob(true);
                      const result = await deleteJob(deleteJobId);
                      setDeletingJob(false);
                      setDeleteJobId(null);
                      if (!result.ok) { showJobToast(result.error ?? 'Failed to delete job', 'error'); }
                      else { showJobToast('Job deleted successfully'); fetchJobs(); }
                    }}
                  >
                    Delete Job
                  </MotionButton>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
      {jobsToast && <Toast {...jobsToast} />}
    </div>
  );
};