'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader, Card, Button } from './components/ReceptionUIComponents';
import { QRModal } from './components/QRModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { CustomerRegistrationWizard } from './components/CustomerRegistrationWizard';
import { Toast, useToast } from '../../components/ui';
import type { Customer, Device, Job } from '../../types';
import {
  Plus,
  Search,
  X,
  Phone,
  MapPin,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const {
    updateCustomer,
    deleteCustomer,
    stats,
    customerRefreshTrigger,
  } = useApp();

  const { toast, show } = useToast();

  type CustomerWithDetails = Customer & { devices?: Device[]; jobs?: Job[] };

  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const limit = 12;

  // Registration wizard state
  const [showModal, setShowModal] = useState(false);
  const [createdJob, setCreatedJob] = useState<Job | null>(null);

  // Customer detail modal state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [summaryModal, setSummaryModal] = useState<'total' | 'active' | 'completed' | 'revenue' | null>(null);

  // Edit / delete state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', email: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // ── Fetch Customers ──
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) {
        params.set('search', search.trim());
      }
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotalCustomers(data.total || 0);
      }
    } catch (err) {
      console.error('[fetchCustomers error]', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, customerRefreshTrigger]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setEditForm({ name: c.name, phone: c.phone, address: c.address ?? '', email: c.email ?? '' });
  };

  const handleEditCustomer = async () => {
    if (!editingCustomer) return;
    if (!editForm.name || !editForm.phone) {
      show('Name and phone are required', 'error');
      return;
    }
    setActionBusy(true);
    const result = await updateCustomer(editingCustomer.id, editForm);
    setActionBusy(false);
    if (!result.ok) {
      show(result.error ?? 'Failed to update', 'error');
      return;
    }
    show('Customer updated successfully');
    setEditingCustomer(null);
    setSelectedCustomer((prev) =>
      prev?.id === editingCustomer.id ? { ...prev, ...editForm } : prev
    );
    fetchCustomers();
  };

  const handleDeleteCustomer = async (id: string) => {
    setActionBusy(true);
    const result = await deleteCustomer(id);
    setActionBusy(false);
    setShowDeleteConfirm(null);
    if (!result.ok) {
      show(result.error ?? 'Failed to delete customer', 'error');
      return;
    }
    show('Customer deleted');
    setSelectedCustomer(null);
    fetchCustomers();
  };

  // Summary Detail Drawer for cards (Total Customers, Active Jobs, Completed Jobs, Revenue)
  const SummaryDetailDrawer = () => {
    if (!summaryModal) return null;

    const configs = {
      total: {
        title: 'All Customers',
        subtitle: `${totalCustomers} registered client${totalCustomers !== 1 ? 's' : ''}`,
        accentColor: 'text-teal-600',
        headerBg: 'bg-teal-50',
        headerBorder: 'border-teal-100',
      },
      active: {
        title: 'Active Jobs',
        subtitle: `${stats?.totalPendingJobs ?? 0} job${stats?.totalPendingJobs !== 1 ? 's' : ''} in progress`,
        accentColor: 'text-amber-600',
        headerBg: 'bg-amber-50',
        headerBorder: 'border-amber-100',
      },
      completed: {
        title: 'Completed Jobs',
        subtitle: `${stats?.totalCompletedJobs ?? 0} successfully resolved`,
        accentColor: 'text-green-600',
        headerBg: 'bg-green-50',
        headerBorder: 'border-green-100',
      },
      revenue: {
        title: 'Revenue Overview',
        subtitle: 'Earnings breakdown from completed jobs',
        accentColor: 'text-cyan-600',
        headerBg: 'bg-cyan-50',
        headerBorder: 'border-cyan-100',
      },
    };

    const cfg = configs[summaryModal];

    return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-end bg-gray-900/40 backdrop-blur-sm"
        onClick={() => setSummaryModal(null)}
      >
        <div
          className="relative max-w-xl w-full h-full bg-white shadow-2xl flex flex-col overflow-hidden"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
            <div>
              <h2 className="text-[18px] font-semibold text-gray-900">{cfg.title}</h2>
              <p className={`text-[12px] font-normal mt-0.5 ${cfg.accentColor}`}>{cfg.subtitle}</p>
            </div>
            <button
              onClick={() => setSummaryModal(null)}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-[13px] text-gray-500">
              This summary is derived from operational metrics. Please use the main directory table, search, and page filters to view and edit details.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const totalPages = Math.ceil(totalCustomers / limit);

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader
        title="Client Directory"
        subtitle="Manage and search customer records — click any metric to drill in"
        action={<Button icon={Plus} text="New Registration" onClick={() => setShowModal(true)} />}
      />

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Customers',
            value: totalCustomers,
            color: 'bg-teal-50 text-teal-600 border-teal-200',
            type: 'total' as const,
          },
          {
            label: 'Active Jobs',
            value: stats?.totalPendingJobs ?? 0,
            color: 'bg-amber-50 text-amber-600 border-amber-200',
            type: 'active' as const,
          },
          {
            label: 'Completed Jobs',
            value: stats?.totalCompletedJobs ?? 0,
            color: 'bg-green-50 text-green-600 border-green-200',
            type: 'completed' as const,
          },
          {
            label: 'Total Revenue',
            value: `₹${((stats?.totalRevenue ?? 0) / 1000).toFixed(1)}k`,
            color: 'bg-cyan-50 text-cyan-600 border-cyan-200',
            type: 'revenue' as const,
          },
        ].map((card) => (
          <div
            key={card.type}
            onClick={() => setSummaryModal(card.type)}
            className="bg-white rounded-xl p-5 border border-gray-200 cursor-pointer hover:border-teal-300 hover:shadow-md transition-all group flex flex-col gap-3"
          >
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${card.color}`}>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
              <p className="text-[22px] font-medium text-gray-900 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {summaryModal && <SummaryDetailDrawer />}

      {/* Search Input */}
      <div className="relative max-w-2xl">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Search size={18} />
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone number..."
          className="w-full bg-white border border-gray-200 rounded-lg pl-12 pr-4 py-3 text-[13px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors shadow-sm"
        />
      </div>

      {/* Customers List Grid */}
      <div className="relative min-h-[200px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((c) => {
            const cJobs = c.jobs || [];
            const activeJobs = cJobs.filter((j) => !['Completed', 'Delivered'].includes(j.status));
            const completedJobs = cJobs.filter((j) => ['Completed', 'Delivered'].includes(j.status));
            const totalSpend = completedJobs.reduce((s: number, j) => s + (j.actualCost ?? j.estimatedCost), 0);
            const lastJobDate =
              cJobs.length > 0
                ? new Date(
                    [...cJobs].sort(
                      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )[0].createdAt
                  )
                : new Date(c.createdAt);
            const registeredDays = Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000);
            const completionRate = cJobs.length > 0 ? Math.round((completedJobs.length / cJobs.length) * 100) : 0;

            return (
              <Card
                key={c.id}
                className="p-5 flex flex-col h-full hover:border-teal-400 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99] group"
              >
                <div onClick={() => setSelectedCustomer(c)}>
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center text-[18px] font-medium text-teal-600 border border-teal-100 shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 mb-0.5">{c.name}</h3>
                      <p className="text-[11px] font-normal text-gray-500 flex items-center gap-1">
                        <Phone size={10} /> {c.phone}
                      </p>
                      {c.address && (
                        <p className="text-[10px] font-normal text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {c.address}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(c.id);
                      }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      title="Delete customer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Summary metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-100">
                    <div className="bg-teal-50 rounded-lg p-3">
                      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Total Jobs</p>
                      <p className="text-[18px] font-semibold text-teal-600">{cJobs.length}</p>
                      <p className="text-[9px] text-gray-400 mt-1">{completedJobs.length} completed</p>
                    </div>
                    <div className={`rounded-lg p-3 ${totalSpend > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Total Spend</p>
                      <p className={`text-[18px] font-semibold ${totalSpend > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {totalSpend > 0 ? `₹${(totalSpend / 1000).toFixed(1)}k` : '—'}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1">{completionRate}% done</p>
                    </div>
                  </div>

                  {/* Status row */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-semibold w-fit ${
                          activeJobs.length > 0
                            ? 'bg-amber-100 text-amber-700'
                            : completedJobs.length > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {activeJobs.length > 0
                          ? `${activeJobs.length} Active`
                          : completedJobs.length > 0
                          ? 'All Completed'
                          : 'No Jobs'}
                      </span>
                      <p className="text-[10px] text-gray-400">Registered {registeredDays}d ago</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Last Seen</p>
                      <p className="text-[11px] font-semibold text-gray-700">
                        {lastJobDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* Job status badges */}
                  {cJobs.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5 flex-wrap">
                        {cJobs.slice(0, 3).map((j) => (
                          <span
                            key={j.id}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border-l-2 ${
                              j.status === 'Completed' || j.status === 'Delivered'
                                ? 'bg-green-50 text-green-700 border-green-500'
                                : 'bg-amber-50 text-amber-700 border-amber-500'
                            }`}
                          >
                            {j.status}
                          </span>
                        ))}
                        {cJobs.length > 3 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                            +{cJobs.length - 3}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-teal-400 transition-colors shrink-0" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {customers.length === 0 && !isLoading && (
          <div className="p-12 text-center bg-white border border-gray-200 rounded-xl">
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
              <Search size={24} />
            </div>
            <p className="text-[13px] font-medium text-gray-900 mb-1">No customers found</p>
            <p className="text-[11px] font-normal text-gray-500">Try adjusting your search criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-6 py-4 border border-gray-200 bg-white rounded-xl">
          <p className="text-[12px] text-gray-500 font-medium">
            Page {page} of {totalPages} ({totalCustomers} total customers)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-[12px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-[12px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details drawer */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onEdit={openEditCustomer}
          onDelete={setShowDeleteConfirm}
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Edit Customer</h2>
                <p className="text-[12px] text-teal-600 mt-0.5">Update customer details</p>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Name *
                </label>
                <input
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Phone *
                </label>
                <input
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Address
                </label>
                <input
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingCustomer(null)}
                className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditCustomer}
                disabled={actionBusy}
                className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {actionBusy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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
              Are you sure you want to delete{' '}
              <strong>{customers.find((c) => c.id === showDeleteConfirm)?.name ?? 'this customer'}</strong>? All
              their completed job history will be removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCustomer(showDeleteConfirm)}
                disabled={actionBusy}
                className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {actionBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Wizard Modal */}
      {showModal && (
        <CustomerRegistrationWizard
          onClose={() => setShowModal(false)}
          onSuccess={(newJob) => {
            setShowModal(false);
            setCreatedJob(newJob);
            fetchCustomers();
          }}
        />
      )}

      {toast && <Toast {...toast} />}

      {createdJob && (() => {
        const c = customers.find((cust) => cust.id === createdJob.customerId);
        const d = c?.devices?.find((dev) => dev.id === createdJob.deviceId) || (createdJob as Job & { device?: Device }).device;
        return (
          <QRModal
            job={createdJob}
            customer={c}
            device={d}
            onClose={() => {
              setCreatedJob(null);
              show('Job registered successfully!');
            }}
          />
        );
      })()}
    </div>
  );
};
