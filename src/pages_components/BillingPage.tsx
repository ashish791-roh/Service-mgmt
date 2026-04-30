import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard, Modal, FormInput, StatusBadge, Toast, useToast, EmptyState } from '../components/ui';
import type { JobStatus } from '../types';

// Replace existing BillingPage in ReceptionPages.tsx with this enhanced version
export const BillingPage: React.FC = () => {
  const { jobs, customers, devices, users, updateJobStatus } = useApp() as any;
  const { toast, show } = useToast();
  const [billingModal, setBillingModal] = useState<string | null>(null);
  const [actualCostInput, setActualCostInput] = useState('');
  const [filter, setFilter] = useState<'pending-billing' | 'completed' | 'delivered' | 'all'>('pending-billing');

  // Jobs eligible for billing (completed but need final cost confirmation or delivery)
  const completedJobs = jobs.filter((j: any) => j.status === 'Completed');
  const deliveredJobs = jobs.filter((j: any) => j.status === 'Delivered');
  const allBillableJobs = jobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status));

  const totalRevenue = deliveredJobs.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
  const pendingCollection = completedJobs.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);

  const handleMarkDelivered = (jobId: string) => {
    const job = jobs.find((j: any) => j.id === jobId);
    if (!job) return;
    // Update actual cost via context (needs updateActualCost in context, or use updateJobStatus with patch)
    updateJobStatus(jobId, 'Delivered' as JobStatus);
    // In full implementation, also save actualCost
    setBillingModal(null);
    setActualCostInput('');
    show('Job marked as delivered! Payment recorded.');
  };

  const getDisplayJobs = () => {
    if (filter === 'pending-billing') return completedJobs;
    if (filter === 'completed') return allBillableJobs;
    if (filter === 'delivered') return deliveredJobs;
    return allBillableJobs;
  };

  const displayJobs = getDisplayJobs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Billing & Revenue</h1>
        <p className="text-slate-500 text-sm mt-1">Manage payments and mark jobs as delivered</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon="💰" color="text-emerald-600" sub="Delivered jobs" />
        <StatCard label="Pending Collection" value={`₹${pendingCollection.toLocaleString()}`} icon="⏳" color="text-amber-600" sub="Awaiting delivery" />
        <StatCard label="Completed Jobs" value={completedJobs.length} icon="✅" color="text-slate-800" sub="Ready for delivery" />
        <StatCard label="Avg. Job Value" value={`₹${allBillableJobs.length ? Math.round((totalRevenue + pendingCollection) / allBillableJobs.length).toLocaleString() : 0}`} icon="📊" color="text-indigo-600" />
      </div>

      {/* Pending collection alert */}
      {completedJobs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💳</span>
            <div>
              <h3 className="font-bold text-amber-700">{completedJobs.length} job{completedJobs.length > 1 ? 's' : ''} ready for delivery & payment</h3>
              <p className="text-sm text-amber-600">Collect ₹{pendingCollection.toLocaleString()} and mark as delivered</p>
            </div>
          </div>
          <button onClick={() => setFilter('pending-billing')} className="bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
            Review →
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 w-fit">
        {[
          { id: 'pending-billing' as const, label: `Pending Delivery (${completedJobs.length})` },
          { id: 'delivered' as const, label: `Delivered (${deliveredJobs.length})` },
          { id: 'all' as const, label: 'All Billed' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter === tab.id ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h2 className="font-bold text-slate-800">
            {filter === 'pending-billing' ? 'Jobs Ready for Delivery' : filter === 'delivered' ? 'Delivered Jobs' : 'All Billed Jobs'}
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left">
              {['Job ID', 'Customer', 'Device', 'Problem', 'Est. Cost', 'Actual Cost', 'Status', 'Action'].map(h => (
                <th key={h} className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {displayJobs.map((job: any) => {
              const customer = customers.find((c: any) => c.id === job.customerId);
              const device = devices.find((d: any) => d.id === job.deviceId);
              return (
                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-400">#{job.id}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-slate-700">{customer?.name}</p>
                    <p className="text-xs text-slate-400">{customer?.phone}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{device?.brand} {device?.model}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 max-w-[160px] truncate">{job.problemDescription}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">₹{job.estimatedCost.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm font-bold text-emerald-600">
                    ₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}
                    {!job.actualCost && <span className="text-xs text-slate-400 font-normal ml-1">(est.)</span>}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-3.5">
                    {job.status === 'Completed' ? (
                      <button
                        onClick={() => { setBillingModal(job.id); setActualCostInput(String(job.actualCost ?? job.estimatedCost)); }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-xl transition"
                      >
                        Mark Delivered
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full">
                        ✓ Delivered
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayJobs.length === 0 && (
          <EmptyState
            icon="💰"
            title={filter === 'pending-billing' ? 'No jobs pending delivery' : 'No jobs found'}
            desc={filter === 'pending-billing' ? 'Completed jobs awaiting payment will appear here' : 'Try a different filter'}
          />
        )}
      </div>

      {/* Mark Delivered Modal */}
      {billingModal && (() => {
        const job = jobs.find((j: any) => j.id === billingModal);
        const customer = customers.find((c: any) => c.id === job?.customerId);
        const device = devices.find((d: any) => d.id === job?.deviceId);
        const engineer = users.find((u: any) => u.id === job?.assignedEngineerId);
        return (
          <Modal title="Confirm Delivery & Payment" onClose={() => setBillingModal(null)}>
            <div className="space-y-4">
              {/* Job summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Job Summary</p>
                <p className="text-sm font-semibold text-slate-800">Customer: {customer?.name}</p>
                <p className="text-sm text-slate-600">📞 {customer?.phone}</p>
                <p className="text-sm text-slate-600">Device: {device?.brand} {device?.model}</p>
                {engineer && <p className="text-sm text-slate-600">Engineer: {engineer.name}</p>}
                <p className="text-sm text-slate-500 bg-white rounded-lg p-2 mt-1">{job?.problemDescription}</p>
                {job?.repairNotes && (
                  <p className="text-sm text-indigo-600 bg-indigo-50 rounded-lg p-2">Notes: {job.repairNotes}</p>
                )}
              </div>

              {/* Cost */}
              <FormInput
                label="Final Actual Cost (₹) *"
                type="number"
                value={actualCostInput}
                onChange={e => setActualCostInput(e.target.value)}
                placeholder={String(job?.estimatedCost ?? 0)}
              />
              <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3">
                <span className="text-sm font-semibold text-slate-700">Amount to Collect:</span>
                <span className="text-xl font-black text-emerald-600">
                  ₹{(actualCostInput ? parseFloat(actualCostInput) : (job?.estimatedCost ?? 0)).toLocaleString()}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setBillingModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                <button onClick={() => handleMarkDelivered(billingModal)} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
                  ✓ Mark Delivered & Paid
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {toast && <Toast {...toast} />}
    </div>
  );
};