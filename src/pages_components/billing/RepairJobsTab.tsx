import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Banknote, Hourglass, CheckCircle, TrendingUp, X, Wrench, Package, TrendingDown, Printer, Cloud } from 'lucide-react';
import type { JobStatus, Job, PartRequest, InventoryItem } from '../../types';
import { printInvoice } from './InvoicePrinter';
import { motion, AnimatePresence } from 'framer-motion';

const modalVariants = {
  hidden:  { opacity: 0, scale: 0.94, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { type: 'spring', stiffness: 480, damping: 36 } },
  exit:    { opacity: 0, scale: 0.96, y: 8,  transition: { duration: 0.15 } },
} as const;

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

const Card = React.forwardRef<HTMLDivElement, { children: React.ReactNode, className?: string }>(
  ({ children, className = "" }, ref) => (
    <div ref={ref} className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {children}
    </div>
  )
);
Card.displayName = 'Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
  highlight?: boolean;
}

const MetricCard = ({ title, value, icon: Icon, color, sub, highlight }: MetricCardProps) => {
  const colorMap: Record<string, string> = {
    teal: "text-teal-500 bg-teal-50",
    cyan: "text-cyan-500 bg-cyan-50",
    green: "text-green-500 bg-green-50",
    orange: "text-orange-500 bg-orange-50",
    purple: "text-purple-500 bg-purple-50",
    red: "text-red-500 bg-red-50",
  };
  const bgClass = colorMap[color] || colorMap.teal;

  return (
    <div className={`bg-white rounded-xl p-5 border relative overflow-hidden flex flex-col gap-4 ${highlight ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        {sub && <span className="bg-gray-100 text-gray-500 text-[11px] font-medium px-2 py-1 rounded-lg">{sub}</span>}
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <h3 className={`text-[18px] font-medium mt-1 ${highlight ? 'text-green-600' : 'text-gray-900'}`}>{value}</h3>
      </div>
    </div>
  );
};

interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'success' | 'outline';
  className?: string;
  icon?: React.ElementType;
}

const Button = ({ text, onClick, variant = 'primary', className = "", icon: Icon }: ButtonProps) => {
  const styles: Record<string, string> = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
  };
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'New': 'bg-cyan-50 text-cyan-700 border-l-2 border-cyan-500',
    'Assigned': 'bg-teal-50 text-teal-700 border-l-2 border-teal-500',
    'In Progress': 'bg-orange-50 text-orange-700 border-l-2 border-orange-500',
    'Completed': 'bg-green-50 text-green-700 border-l-2 border-green-500',
    'Delivered': 'bg-gray-100 text-gray-600 border-l-2 border-gray-400',
  };
  const style = styles[status] || 'bg-gray-50 text-gray-600 border-l-2 border-gray-400';
  return (
    <span className={`px-3 py-1 rounded-r text-[11px] font-medium uppercase tracking-wide inline-block ${style}`}>
      {status}
    </span>
  );
};

function calcPartsCost(jobId: string, partRequests: PartRequest[], inventory: InventoryItem[]): number {
  const approved = partRequests.filter(
    (pr) => pr.jobId === jobId && pr.status === 'Approved'
  );
  return approved.reduce((sum: number, pr) => {
    const item = inventory.find(
      (inv) => inv.name.toLowerCase() === pr.partName.toLowerCase()
    );
    const unitCost = item?.unitCost ?? 0;
    return sum + unitCost * pr.quantity;
  }, 0);
}

function calcProfitBreakdown(job: Job, partRequests: PartRequest[], inventory: InventoryItem[]) {
  const revenue = job.actualCost ?? job.estimatedCost ?? 0;
  const partsCost = calcPartsCost(job.id, partRequests, inventory);
  const serviceCharge = Math.max(revenue - partsCost, 0);
  const profit = revenue - partsCost;
  return { revenue, partsCost, serviceCharge, profit };
}

export const RepairJobsTab: React.FC = () => {
  const { jobs, customers, devices, users, partRequests, inventory, updateJobStatus } = useApp();

  const [billingModal, setBillingModal] = useState<string | null>(null);
  const [actualCostInput, setActualCostInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('Cash');
  const [filter, setFilter] = useState<'pending-billing' | 'delivered' | 'all'>('pending-billing');
  const tableRef = useRef<HTMLDivElement>(null);

  const [pushingJobs, setPushingJobs] = useState<Record<string, boolean>>({});

  const handleRetroactivePush = async (jobId: string) => {
    setPushingJobs(prev => ({ ...prev, [jobId]: true }));
    try {
      const response = await fetch('/api/tally/push-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(data.message || 'Job invoice successfully pushed to Tally!');
      } else {
        alert(data.error || data.message || 'Failed to push job to Tally.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error pushing job to Tally.');
    } finally {
      setPushingJobs(prev => ({ ...prev, [jobId]: false }));
    }
  };

  // ── Derived job lists ──────────────────────────────────────────────────────
  const completedJobs = useMemo(() => jobs.filter(j => j.status === 'Completed'), [jobs]);
  const deliveredJobs = useMemo(() => jobs.filter(j => j.status === 'Delivered'), [jobs]);
  const allBillableJobs = useMemo(() => jobs.filter(j => ['Completed', 'Delivered'].includes(j.status)), [jobs]);

  // ── Aggregate financials ───────────────────────────────────────────────────
  const totalRevenue = useMemo(() =>
    deliveredJobs.reduce((s: number, j) => s + (j.actualCost ?? j.estimatedCost ?? 0), 0),
  [deliveredJobs]);

  const totalPartsCost = useMemo(() =>
    deliveredJobs.reduce((s: number, j) => s + calcPartsCost(j.id, partRequests, inventory), 0),
  [deliveredJobs, partRequests, inventory]);

  const totalProfit = useMemo(() => totalRevenue - totalPartsCost, [totalRevenue, totalPartsCost]);

  const pendingCollection = useMemo(() =>
    completedJobs.reduce((s: number, j) => s + (j.actualCost ?? j.estimatedCost ?? 0), 0),
  [completedJobs]);

  const avgValue = useMemo(() => allBillableJobs.length
    ? Math.round((totalRevenue + pendingCollection) / allBillableJobs.length)
    : 0, [allBillableJobs, totalRevenue, pendingCollection]);

  const profitMargin = useMemo(() => totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0, [totalProfit, totalRevenue]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleReviewAndCollect = () => {
    setFilter('pending-billing');
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    if (completedJobs.length === 1) {
      const job = completedJobs[0];
      setBillingModal(job.id);
      setActualCostInput(String(job.actualCost ?? job.estimatedCost));
    }
  };

  const handleMarkDelivered = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const finalCost = actualCostInput ? parseFloat(actualCostInput) : (job.estimatedCost ?? 0);

    // Save actualCost via PUT, then mark Delivered
    await fetch(`/api/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualCost: finalCost, status: 'Delivered', paymentMethod: paymentMethodInput }),
    });

    await updateJobStatus(jobId, 'Delivered' as JobStatus);
    // Explicitly update local job status/paymentMethod properties so they reflect immediately in context
    job.status = 'Delivered';
    job.paymentMethod = paymentMethodInput;

    setBillingModal(null);
    setActualCostInput('');
    alert('Job marked as delivered! Payment recorded successfully.');
  };

  const displayJobs = useMemo(() => {
    if (filter === 'pending-billing') return completedJobs;
    if (filter === 'delivered') return deliveredJobs;
    return allBillableJobs;
  }, [filter, completedJobs, deliveredJobs, allBillableJobs]);

  // ── Modal job data ─────────────────────────────────────────────────────────
  const modalJob = billingModal ? jobs.find((j) => j.id === billingModal) : null;
  const modalCustomer = customers.find((c) => c.id === modalJob?.customerId);
  const modalDevice = devices.find((d) => d.id === modalJob?.deviceId);
  const modalEngineer = users.find((u) => u.id === modalJob?.assignedEngineerId);
  const modalApprovedParts = partRequests.filter(
    (pr) => pr.jobId === billingModal && pr.status === 'Approved'
  );
  const modalFinalCost = actualCostInput
    ? parseFloat(actualCostInput) || 0
    : (modalJob?.estimatedCost ?? 0);
  const modalPartsCost = billingModal
    ? calcPartsCost(billingModal, partRequests, inventory)
    : 0;
  const modalServiceCharge = Math.max(modalFinalCost - modalPartsCost, 0);
  const modalProfit = modalFinalCost - modalPartsCost;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`₹${(totalRevenue / 1000).toFixed(1)}k`}
          icon={Banknote}
          color="green"
          sub="Collected"
        />
        <MetricCard
          title="Parts Cost"
          value={`₹${(totalPartsCost / 1000).toFixed(1)}k`}
          icon={Package}
          color="orange"
          sub="Delivered jobs"
        />
        <MetricCard
          title="Net Profit"
          value={`₹${(totalProfit / 1000).toFixed(1)}k`}
          icon={TrendingUp}
          color="purple"
          sub={`${profitMargin}% margin`}
          highlight
        />
        <MetricCard
          title="Avg Job Value"
          value={`₹${avgValue.toLocaleString()}`}
          icon={CheckCircle}
          color="teal"
        />
      </div>

      {/* ── Profit breakdown summary card ── */}
      {deliveredJobs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-4">Profit Breakdown — Delivered Jobs</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Revenue bar */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote size={14} className="text-green-500" />
                  <span className="text-[12px] font-medium text-gray-600">Total Revenue</span>
                </div>
                <span className="text-[13px] font-medium text-gray-900">₹{totalRevenue.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            {/* Parts cost bar */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-orange-500" />
                  <span className="text-[12px] font-medium text-gray-600">Parts Cost</span>
                </div>
                <span className="text-[13px] font-medium text-gray-900">₹{totalPartsCost.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full"
                  style={{ width: totalRevenue > 0 ? `${Math.min((totalPartsCost / totalRevenue) * 100, 100)}%` : '0%' }}
                />
              </div>
            </div>
            {/* Profit bar */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {totalProfit >= 0
                    ? <TrendingUp size={14} className="text-purple-500" />
                    : <TrendingDown size={14} className="text-red-500" />
                  }
                  <span className="text-[12px] font-medium text-gray-600">Net Profit</span>
                </div>
                <span className={`text-[13px] font-medium ${totalProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  ₹{totalProfit.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${totalProfit >= 0 ? 'bg-purple-400' : 'bg-red-400'}`}
                  style={{ width: totalRevenue > 0 ? `${Math.min(Math.abs(profitMargin), 100)}%` : '0%' }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
            <span className={`text-[12px] font-medium px-2 py-0.5 rounded ${totalProfit >= 0 ? 'bg-purple-50 text-purple-700' : 'bg-red-50 text-red-700'}`}>
              {profitMargin}% margin
            </span>
            <span className="text-[12px] text-gray-400">across {deliveredJobs.length} delivered job{deliveredJobs.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* ── Pending collection alert ── */}
      {completedJobs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Hourglass size={20} />
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-gray-900">{completedJobs.length} Jobs Ready for Delivery</h3>
              <p className="text-[11px] font-normal text-orange-600 uppercase tracking-wide mt-1">
                Collect ₹{pendingCollection.toLocaleString()} in pending payments
              </p>
            </div>
          </div>
          <Button text="Review & Collect" variant="primary" onClick={handleReviewAndCollect} className="w-full sm:w-auto" />
        </div>
      )}

      {/* ── Filter tabs ── */}
      <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit overflow-x-auto gap-1">
        {[
          { id: 'pending-billing' as const, label: `Pending Delivery (${completedJobs.length})` },
          { id: 'delivered' as const, label: `Delivered (${deliveredJobs.length})` },
          { id: 'all' as const, label: 'All Billed Records' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${filter === tab.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Jobs Table ── */}
      <Card ref={tableRef}>
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-[13px] font-medium text-gray-900">
            {filter === 'pending-billing' ? 'Jobs Ready for Delivery' : filter === 'delivered' ? 'Completed & Delivered Jobs' : 'All Billed Jobs'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Job ID', 'Customer Info', 'Device Details', 'Issue', 'Service', 'Parts Cost', 'Total', 'Profit', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayJobs.map((job: Job) => {
                const customer = customers.find((c) => c.id === job.customerId);
                const device = devices.find((d) => d.id === job.deviceId);
                const { revenue, partsCost, serviceCharge, profit } = calcProfitBreakdown(job, partRequests, inventory);
                const isEstimated = !job.actualCost;
                return (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">#{job.id}</td>
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-medium text-gray-900 mb-0.5">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">{customer?.phone}</p>
                    </td>
                    <td className="px-4 py-4 text-[13px] font-medium text-gray-500 whitespace-nowrap">{device?.brand} {device?.model}</td>
                    <td className="px-4 py-4 text-[13px] font-normal text-gray-600 max-w-[160px] truncate">{job.problemDescription}</td>
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-medium text-teal-600">₹{serviceCharge.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Service</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-medium text-orange-500">₹{partsCost.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Parts</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-medium text-gray-900">₹{revenue.toLocaleString()}</p>
                      {isEstimated && <p className="text-[10px] text-gray-400 uppercase tracking-wide">Est.</p>}
                      {(job.advanceAmount ?? 0) > 0 && (
                        <p className="text-[10px] text-green-600 font-medium mt-0.5">Adv: ₹{(job.advanceAmount ?? 0).toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className={`text-[13px] font-medium ${profit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                        {profit >= 0 ? '+' : ''}₹{profit.toLocaleString()}
                      </p>
                      {revenue > 0 && (
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                          {Math.round((profit / revenue) * 100)}%
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-4">
                      {job.status === 'Completed' ? (
                        <Button
                          text="Process Payment"
                          variant="success"
                          onClick={() => {
                            setBillingModal(job.id);
                            setActualCostInput(String(job.actualCost ?? job.estimatedCost));
                            setPaymentMethodInput('Cash');
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const c = customers.find((cust) => cust.id === job.customerId);
                              const d = devices.find((dev) => dev.id === job.deviceId);
                              const e = users.find((u) => u.id === job.assignedEngineerId);
                              const ap = partRequests.filter((pr) => pr.jobId === job.id && pr.status === 'Approved');
                              const { partsCost, serviceCharge } = calcProfitBreakdown(job, partRequests, inventory);
                              const res = printInvoice({
                                job,
                                customer: c,
                                device: d,
                                engineer: e,
                                approvedParts: ap,
                                inventory,
                                finalCost: job.actualCost ?? job.estimatedCost ?? 0,
                                partsCost,
                                serviceCharge,
                                advanceAmount: job.advanceAmount ?? 0
                              });
                              if (res && !res.ok && res.error) {
                                alert(res.error);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-lg uppercase tracking-wide hover:bg-gray-200 transition-colors"
                            title="Print Invoice"
                          >
                            <Printer size={12} />
                            Invoice
                          </button>
                          {job.status === 'Delivered' && (
                            <button
                              onClick={() => handleRetroactivePush(job.id)}
                              disabled={pushingJobs[job.id]}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 text-[11px] font-medium rounded-lg uppercase tracking-wide hover:bg-teal-100 disabled:opacity-60 transition-colors"
                              title="Push to Tally"
                            >
                              <Cloud size={12} />
                              {pushingJobs[job.id] ? 'Pushing...' : 'Tally'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {displayJobs.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
                <Wrench size={24} />
              </div>
              <p className="text-[13px] font-medium text-gray-900 mb-1">No jobs pending delivery</p>
              <p className="text-[13px] font-normal text-gray-500">Completed jobs awaiting payment will appear here.</p>
            </div>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {billingModal && modalJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setBillingModal(null)}
            />
            <motion.div
              className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto relative z-10"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-[18px] font-medium text-gray-900">Process Payment</h2>
              <button onClick={() => setBillingModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Job summary */}
              <div className="bg-gray-55 border border-gray-200 rounded-lg p-4 space-y-3">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Job Invoice Summary</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">Client</p>
                    <p className="text-[13px] font-medium text-gray-900">{modalCustomer?.name}</p>
                    <p className="text-[11px] font-normal text-gray-500">{modalCustomer?.phone}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">Device</p>
                    <p className="text-[13px] font-medium text-gray-900">{modalDevice?.brand} {modalDevice?.model}</p>
                    <p className="text-[11px] font-normal text-gray-500">Assigned: {modalEngineer?.name}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide mb-1">Resolution</p>
                  <p className="text-[13px] font-normal text-gray-700">{modalJob.problemDescription}</p>
                </div>
              </div>

              {/* Approved parts used */}
              {modalApprovedParts.length > 0 && (
                <div className="border border-orange-200 rounded-lg overflow-hidden">
                  <div className="bg-orange-50 px-4 py-2 flex items-center gap-2">
                    <Package size={13} className="text-orange-500" />
                    <p className="text-[11px] font-medium text-orange-700 uppercase tracking-wide">Approved Parts Used</p>
                  </div>
                  <div className="divide-y divide-gray-100 bg-white">
                    {modalApprovedParts.map((pr) => {
                      const inv = inventory.find((i) => i.name.toLowerCase() === pr.partName.toLowerCase());
                      const lineCost = (inv?.unitCost ?? 0) * pr.quantity;
                      return (
                        <div key={pr.id} className="flex items-center justify-between px-4 py-2">
                          <div>
                            <p className="text-[13px] font-medium text-gray-900">{pr.partName}</p>
                            <p className="text-[11px] text-gray-500">Qty: {pr.quantity}{inv ? ` × ₹${inv.unitCost}` : ' (unit cost unknown)'}</p>
                          </div>
                          <p className="text-[13px] font-medium text-orange-600">
                            {lineCost > 0 ? `₹${lineCost.toLocaleString()}` : '—'}
                          </p>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-4 py-2 bg-orange-50">
                      <p className="text-[12px] font-medium text-orange-700 uppercase tracking-wide">Total Parts Cost</p>
                      <p className="text-[13px] font-medium text-orange-700">₹{modalPartsCost.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Final cost input */}
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-2">Final Invoice Amount (₹) *</label>
                <input
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-[18px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 transition-all text-center"
                  type="number"
                  value={actualCostInput}
                  onChange={e => setActualCostInput(e.target.value)}
                  placeholder={String(modalJob.estimatedCost ?? 0)}
                />
              </div>

              {/* Payment Method input */}
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-2">Payment Method *</label>
                <select
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-[14px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 transition-all"
                  value={paymentMethodInput}
                  onChange={e => setPaymentMethodInput(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                </select>
              </div>

              {/* Profit breakdown preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">Profit Breakdown Preview</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote size={13} className="text-green-500" />
                    <span className="text-[12px] text-gray-600">Total Invoice</span>
                  </div>
                  <span className="text-[13px] font-medium text-gray-900">₹{modalFinalCost.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={13} className="text-orange-400" />
                    <span className="text-[12px] text-gray-600">Parts Cost</span>
                  </div>
                  <span className="text-[13px] font-medium text-orange-600">− ₹{modalPartsCost.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench size={13} className="text-teal-500" />
                    <span className="text-[12px] text-gray-600">Service Charge</span>
                  </div>
                  <span className="text-[13px] font-medium text-teal-600">₹{modalServiceCharge.toLocaleString()}</span>
                </div>

                <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {modalProfit >= 0
                      ? <TrendingUp size={13} className="text-purple-500" />
                      : <TrendingDown size={13} className="text-red-500" />
                    }
                    <span className="text-[12px] font-medium text-gray-700">Net Profit</span>
                  </div>
                  <span className={`text-[15px] font-medium ${modalProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                    {modalProfit >= 0 ? '+' : ''}₹{modalProfit.toLocaleString()}
                    {modalFinalCost > 0 && (
                      <span className="text-[11px] ml-1 font-normal opacity-70">
                        ({Math.round((modalProfit / modalFinalCost) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Advance / Balance Due section */}
              {(modalJob.advanceAmount ?? 0) > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <p className="text-[11px] font-medium text-green-700 uppercase tracking-wide mb-2">Payment Collection</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-600">Total Invoice</span>
                    <span className="text-[13px] font-medium text-gray-900">₹{modalFinalCost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-green-700">Advance Already Paid</span>
                    <span className="text-[13px] font-medium text-green-700">− ₹{(modalJob.advanceAmount ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-green-200 pt-2 flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-green-800">Balance Due at Delivery</span>
                    <span className="text-[16px] font-bold text-green-800">₹{Math.max(modalFinalCost - (modalJob.advanceAmount ?? 0), 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button text="Cancel" variant="outline" onClick={() => setBillingModal(null)} className="w-full" />
              <button
                onClick={() => {
                  const res = printInvoice({
                    job: {
                      ...modalJob,
                      paymentMethod: modalJob.status === 'Delivered' ? modalJob.paymentMethod : paymentMethodInput
                    },
                    customer: modalCustomer,
                    device: modalDevice,
                    engineer: modalEngineer,
                    approvedParts: modalApprovedParts,
                    inventory,
                    finalCost: modalFinalCost,
                    partsCost: modalPartsCost,
                    serviceCharge: modalServiceCharge,
                    advanceAmount: modalJob.advanceAmount ?? 0,
                  });
                  if (res && !res.ok && res.error) {
                    alert(res.error);
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 w-full"
              >
                <Printer size={15} />
                Print Invoice
              </button>
              <Button text="Collect & Mark Delivered" variant="success" onClick={() => handleMarkDelivered(billingModal)} className="w-full" />
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </>
  );
};
