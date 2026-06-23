import React, { useState, useMemo } from 'react';
import type { Customer, Device, Job } from '../../../types';
import { StatusBadge } from '../../../components/ui';
import { Phone, MapPin, X, Pencil, Trash2, Wrench, Monitor, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { MotionButton } from '../../../components/MotionButton';

const panelVariants = {
  hidden:  { x: '100%', opacity: 0 },
  visible: { x: 0,      opacity: 1, transition: { type: 'spring', stiffness: 420, damping: 40 } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.2,  ease: [0.32, 0, 0.67, 0] } },
} as const;

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
} as const;

interface CustomerDetailModalProps {
  customer: Customer & { devices?: Device[] };
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onJobClick?: (jobId: string) => void;
  allJobs: Job[];
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  onClose,
  onEdit,
  onDelete,
  onJobClick,
  allJobs,
}) => {
  const [detailTab, setDetailTab] = useState<'jobs' | 'devices'>('jobs');
  
  const custJobs = useMemo(
    () => allJobs.filter(j => j.customerId === customer.id),
    [allJobs, customer.id]
  );

  const completedJobs = custJobs.filter((j) => ['Completed', 'Delivered'].includes(j.status));
  const totalSpend = completedJobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
  const activeJobs = custJobs.filter((j) => !['Completed', 'Delivered'].includes(j.status));
  const cDevices = customer.devices || [];

  return (
    <>
      <motion.div
        data-drawer
        className="fixed inset-0 z-[51] bg-gray-900/40 backdrop-blur-sm"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      />
      <motion.div
        data-panel
        className="fixed top-0 right-0 bottom-0 z-[51] w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center text-[18px] font-medium text-teal-600 border border-teal-100 shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-[18px] font-medium text-gray-900">{customer.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[12px] text-gray-500">
                  <Phone size={11} /> {customer.phone}
                </span>
                {customer.address && (
                  <span className="flex items-center gap-1 text-[12px] text-gray-400">
                    <MapPin size={11} /> {customer.address}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                Since {new Date(customer.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <MotionButton
              onClick={() => onEdit(customer)}
              variant="secondary"
              icon={<Pencil size={13} />}
              title="Edit customer"
            >
              Edit
            </MotionButton>
            <MotionButton
              onClick={() => onDelete(customer.id)}
              variant="danger"
              icon={<Trash2 size={13} />}
              title="Delete customer"
            >
              Delete
            </MotionButton>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <>
            {/* Summary stats */}
            <div className="grid grid-cols-4 divide-x divide-gray-200 border-b border-gray-200 shrink-0">
              {[
                { label: 'Total Jobs', value: custJobs.length, color: 'text-gray-900' },
                { label: 'Active', value: activeJobs.length, color: 'text-amber-600' },
                { label: 'Completed', value: completedJobs.length, color: 'text-green-600' },
                { label: 'Total Spend', value: `₹${(totalSpend / 1000).toFixed(1)}k`, color: 'text-teal-600' },
              ].map((stat) => (
                <div key={stat.label} className="px-5 py-4 text-center">
                  <p className={`text-[22px] font-medium ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white shrink-0 px-6">
              {[
                { id: 'jobs' as const, label: `Jobs (${custJobs.length})`, icon: Wrench },
                { id: 'devices' as const, label: `Devices (${cDevices.length})`, icon: Monitor },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                    detailTab === tab.id
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <tab.icon size={14} /> {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="overflow-y-auto flex-1">
              {detailTab === 'jobs' && (
                <div className="space-y-3 p-5">
                  {custJobs.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Wrench size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-[13px]">No jobs yet</p>
                    </div>
                  ) : (
                    custJobs
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((job) => {
                        const isActive = !['Completed', 'Delivered'].includes(job.status);
                        return (
                          <div
                            key={job.id}
                            onClick={() => onJobClick?.(job.id)}
                            className={`rounded-xl border p-4 transition-all ${
                              onJobClick ? 'cursor-pointer hover:shadow-sm' : ''
                            } ${
                              isActive ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                                    #{job.id.slice(-8).toUpperCase()}
                                  </span>
                                  <StatusBadge status={job.status} />
                                </div>
                                <p className="text-[13px] font-medium text-gray-900">{job.problemDescription}</p>
                              </div>
                              <p className="text-[15px] font-medium text-gray-900 shrink-0">
                                ₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} /> {new Date(job.createdAt).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              )}

              {detailTab === 'devices' && (
                <div className="space-y-3 p-5">
                  {cDevices.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Monitor size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-[13px]">No devices registered</p>
                    </div>
                  ) : (
                    cDevices.map((device: Device) => {
                      const deviceJobs = custJobs.filter((j) => j.deviceId === device.id);
                      const latestJob = deviceJobs.sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )[0];
                      return (
                        <div
                          key={device.id}
                          className="rounded-xl border border-gray-200 p-4 bg-white hover:border-teal-200 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Monitor size={18} className="text-gray-500" />
                              </div>
                              <div>
                                <p className="text-[13px] font-medium text-gray-900">
                                  {device.brand} {device.model}
                                </p>
                                <p className="text-[11px] text-gray-500">{device.type}</p>
                              </div>
                            </div>
                            <span className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md uppercase tracking-wide">
                              {deviceJobs.length} job{deviceJobs.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {device.serialNumber && (
                            <p className="text-[11px] text-gray-400 font-mono mt-1">S/N: {device.serialNumber}</p>
                          )}
                          {latestJob && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                              <p className="text-[11px] text-gray-500 truncate max-w-[200px]">
                                Last: {latestJob.problemDescription}
                              </p>
                              <StatusBadge status={latestJob.status} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
      </motion.div>
    </>
  );
};
