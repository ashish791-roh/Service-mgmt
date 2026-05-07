import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Banknote, Hourglass, CheckCircle, TrendingUp, X } from 'lucide-react';
import type { JobStatus } from '../types';

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Card = React.forwardRef<HTMLDivElement, { children: React.ReactNode, className?: string }>(
  ({ children, className = "" }, ref) => (
    <div ref={ref} className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {children}
    </div>
  )
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

const Button = ({ text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: any = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
  };
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
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

export const BillingPage: React.FC = () => {
  const { jobs, customers, devices, users, updateJobStatus, currentUser } = useApp() as any;

  // SRS: Engineers must NOT see financial/billing data
  if (currentUser?.role === 'engineer') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Banknote size={48} className="mb-4 opacity-50" />
        <p className="text-[13px] font-medium text-gray-500">Access restricted</p>
      </div>
    );
  }

  const [billingModal, setBillingModal] = useState<string | null>(null);
  const [actualCostInput, setActualCostInput] = useState('');
  const [filter, setFilter] = useState<'pending-billing' | 'completed' | 'delivered' | 'all'>('pending-billing');
  const tableRef = useRef<HTMLDivElement>(null);

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

  const completedJobs = jobs.filter((j: any) => j.status === 'Completed');
  const deliveredJobs = jobs.filter((j: any) => j.status === 'Delivered');
  const allBillableJobs = jobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status));

  const totalRevenue = deliveredJobs.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
  const pendingCollection = completedJobs.reduce((s: number, j: any) => s + (j.actualCost ?? j.estimatedCost), 0);
  const avgValue = allBillableJobs.length ? Math.round((totalRevenue + pendingCollection) / allBillableJobs.length) : 0;

  const handleMarkDelivered = (jobId: string) => {
    const job = jobs.find((j: any) => j.id === jobId);
    if (!job) return;
    updateJobStatus(jobId, 'Delivered' as JobStatus);
    setBillingModal(null);
    setActualCostInput('');
    alert('Job marked as delivered! Payment recorded successfully.');
  };

  const getDisplayJobs = () => {
    if (filter === 'pending-billing') return completedJobs;
    if (filter === 'completed') return allBillableJobs;
    if (filter === 'delivered') return deliveredJobs;
    return allBillableJobs;
  };

  const displayJobs = getDisplayJobs();

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Revenue & Billing" subtitle="Financial tracking and final delivery operations" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Revenue" value={`₹${(totalRevenue / 1000).toFixed(1)}k`} icon={Banknote} color="green" sub="Collected" />
        <MetricCard title="Pending" value={`₹${(pendingCollection / 1000).toFixed(1)}k`} icon={Hourglass} color="orange" sub="To Collect" />
        <MetricCard title="Ready to Bill" value={completedJobs.length} icon={CheckCircle} color="cyan" sub="Completed Jobs" />
        <MetricCard title="Avg Job Value" value={`₹${avgValue.toLocaleString()}`} icon={TrendingUp} color="teal" />
      </div>

      {completedJobs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-gray-900">{completedJobs.length} Jobs Ready for Delivery</h3>
              <p className="text-[11px] font-normal text-orange-600 uppercase tracking-wide mt-1">Collect ₹{pendingCollection.toLocaleString()} in pending payments</p>
            </div>
          </div>
          <Button text="Review & Collect" variant="primary" onClick={handleReviewAndCollect} className="w-full sm:w-auto" />
        </div>
      )}

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

      {/* Jobs Table */}
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
                {['Job ID', 'Customer Info', 'Device Details', 'Issue', 'Final Cost', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayJobs.map((job: any) => {
                const customer = customers.find((c: any) => c.id === job.customerId);
                const device = devices.find((d: any) => d.id === job.deviceId);
                return (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">#{job.id}</td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-medium text-gray-900 mb-0.5">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">{customer?.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-gray-500">{device?.brand} {device?.model}</td>
                    <td className="px-6 py-4 text-[13px] font-normal text-gray-600 max-w-[200px] truncate">{job.problemDescription}</td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-medium text-green-600">
                        ₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}
                      </p>
                      {!job.actualCost && <p className="text-[11px] font-normal text-gray-400 uppercase tracking-wide mt-0.5">Estimated</p>}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                    <td className="px-6 py-4">
                      {job.status === 'Completed' ? (
                        <Button 
                          text="Process Payment" 
                          variant="success" 
                          onClick={() => { setBillingModal(job.id); setActualCostInput(String(job.actualCost ?? job.estimatedCost)); }} 
                        />
                      ) : (
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-[11px] font-medium rounded-lg uppercase tracking-wide inline-block">
                          Delivered
                        </span>
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
                <Banknote size={24} />
              </div>
              <p className="text-[13px] font-medium text-gray-900 mb-1">No jobs pending delivery</p>
              <p className="text-[13px] font-normal text-gray-500">Completed jobs awaiting payment will appear here.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Mark Delivered Modal */}
      {billingModal && (() => {
        const job = jobs.find((j: any) => j.id === billingModal);
        const customer = customers.find((c: any) => c.id === job?.customerId);
        const device = devices.find((d: any) => d.id === job?.deviceId);
        const engineer = users.find((u: any) => u.id === job?.assignedEngineerId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h2 className="text-[18px] font-medium text-gray-900">Process Payment</h2>
                <button onClick={() => setBillingModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Job Invoice Summary</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">Client</p>
                      <p className="text-[13px] font-medium text-gray-900">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500">{customer?.phone}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">Device</p>
                      <p className="text-[13px] font-medium text-gray-900">{device?.brand} {device?.model}</p>
                      <p className="text-[11px] font-normal text-gray-500">Assigned: {engineer?.name}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide mb-1">Resolution</p>
                    <p className="text-[13px] font-normal text-gray-700">{job?.problemDescription}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-2">Final Invoice Amount (₹) *</label>
                  <input 
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-[18px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 transition-all text-center" 
                    type="number" 
                    value={actualCostInput} 
                    onChange={e => setActualCostInput(e.target.value)} 
                    placeholder={String(job?.estimatedCost ?? 0)} 
                  />
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 border border-green-200 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-green-800 uppercase tracking-wide">Amount Due</p>
                  <p className="text-[18px] font-medium text-green-600">
                    ₹{(actualCostInput ? parseFloat(actualCostInput) : (job?.estimatedCost ?? 0)).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <Button text="Cancel" variant="outline" onClick={() => setBillingModal(null)} className="w-full" />
                <Button text="Collect & Mark Delivered" variant="success" onClick={() => handleMarkDelivered(billingModal)} className="w-full" />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};