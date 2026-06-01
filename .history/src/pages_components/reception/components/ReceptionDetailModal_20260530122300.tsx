import React from 'react';
import { X } from 'lucide-react';
import type { Job, Customer, User } from '../../../types';

type ReceptionModalType = 'total' | 'unassigned' | 'inprogress' | 'customers' | null;

interface ReceptionDetailModalProps {
  type: ReceptionModalType;
  onClose: () => void;
  jobs: Job[];
  customers: Customer[];
  users: User[];
  onNavigate: (p: string) => void;
}

const JOB_STATUS_COLORS: Record<string, string> = {
  'New': 'border-cyan-400 text-cyan-700 bg-cyan-50',
  'Assigned': 'border-teal-400 text-teal-700 bg-teal-50',
  'In Progress': 'border-orange-400 text-orange-700 bg-orange-50',
  'Completed': 'border-green-400 text-green-700 bg-green-50',
  'Delivered': 'border-green-400 text-green-700 bg-green-50',
};

const MODAL_CONFIGS: Record<NonNullable<ReceptionModalType>, {
  title: string;
  subtitle: string;
  accentColor: string;
}> = {
  total: {
    title: 'All Jobs',
    subtitle: 'Complete job registry',
    accentColor: 'text-cyan-600',
  },
  unassigned: {
    title: 'Unassigned Jobs',
    subtitle: 'Jobs waiting for an engineer',
    accentColor: 'text-rose-600',
  },
  inprogress: {
    title: 'In Progress',
    subtitle: 'Active repairs underway',
    accentColor: 'text-amber-600',
  },
  customers: {
    title: 'Customers',
    subtitle: 'Registered client accounts',
    accentColor: 'text-green-600',
  },
};

export const ReceptionDetailModal: React.FC<ReceptionDetailModalProps> = ({
  type,
  onClose,
  jobs,
  customers,
  users,
  onNavigate,
}) => {
  if (!type) return null;

  const cfg = MODAL_CONFIGS[type];

  const renderContent = () => {
    if (type === 'total') {
      return (
        <div className="divide-y divide-gray-100">
          {jobs.length === 0 && (
            <p className="px-6 py-8 text-[13px] text-gray-400 text-center">
              No jobs yet.
            </p>
          )}
          {jobs.map((job: Job) => {
            const customer = customers.find((c: Customer) => c.id === job.customerId);
            const engineer = users.find((u: User) => u.id === job.assignedEngineerId);
            const daysOld = Math.floor(
              (Date.now() - new Date(job.createdAt).getTime()) / 86400000
            );
            const style =
              JOB_STATUS_COLORS[job.status] ||
              'border-gray-300 text-gray-700 bg-gray-50';
            const borderCls = style.split(' ')[0];
            const badgeCls = style.split(' ').slice(1).join(' ');
            return (
              <div
                key={job.id}
                className={`flex flex-col gap-2 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">
                      {job.problemDescription}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {customer?.name ?? 'Unknown'} ·{' '}
                      {engineer ? (
                        engineer.name
                      ) : (
                        <span className="text-rose-500">Unassigned</span>
                      )}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${badgeCls}`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span>{new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                  <span>·</span>
                  <span
                    className={
                      daysOld > 10
                        ? 'text-red-500 font-medium'
                        : daysOld > 5
                          ? 'text-yellow-600 font-medium'
                          : 'text-green-600'
                    }
                  >
                    {daysOld}d ago
                  </span>
                  <span>·</span>
                  <span className="font-medium text-gray-700">
                    ₹{(job.estimatedCost ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'unassigned') {
      const unassigned = jobs.filter(
        (j: Job) => !j.assignedEngineerId || j.status === 'New'
      );
      return (
        <>
          <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
            <p className="text-[13px] font-medium text-rose-700">
              {unassigned.length} jobs need assignment
            </p>
            <button
              onClick={() => {
                onClose();
                onNavigate('assign');
              }}
              className="text-[11px] font-medium text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Go to Assign Page →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {unassigned.length === 0 && (
              <p className="px-6 py-8 text-[13px] text-gray-400 text-center">
                All jobs are assigned! 🎉
              </p>
            )}
            {unassigned.map((job: Job) => {
              const customer = customers.find((c: Customer) => c.id === job.customerId);
              const daysOld = Math.floor(
                (Date.now() - new Date(job.createdAt).getTime()) / 86400000
              );
              return (
                <div
                  key={job.id}
                  className="flex flex-col gap-2 px-6 py-4 border-l-4 border-rose-400 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">
                        {job.problemDescription}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {customer?.name ?? 'Unknown'} · {customer?.phone}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-100 text-rose-700 shrink-0">
                      Unassigned
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span>{new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                    <span>·</span>
                    <span className={daysOld > 5 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {daysOld}d waiting
                    </span>
                    <span>·</span>
                    <span className="font-medium text-gray-700">
                      ₹{(job.estimatedCost ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    }

    if (type === 'inprogress') {
      const inProgress = jobs.filter((j: Job) => j.status === 'In Progress');
      return (
        <div className="divide-y divide-gray-100">
          {inProgress.length === 0 && (
            <p className="px-6 py-8 text-[13px] text-gray-400 text-center">
              No jobs in progress.
            </p>
          )}
          {inProgress.map((job: Job) => {
            const customer = customers.find((c: Customer) => c.id === job.customerId);
            const engineer = users.find((u: User) => u.id === job.assignedEngineerId);
            const daysOld = Math.floor(
              (Date.now() - new Date(job.createdAt).getTime()) / 86400000
            );
            const isOverdue = daysOld > 10;
            return (
              <div
                key={job.id}
                className={`flex flex-col gap-2 px-6 py-4 border-l-4 ${
                  isOverdue ? 'border-red-400' : 'border-amber-400'
                } hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">
                      {job.problemDescription}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {customer?.name ?? 'Unknown'} · {engineer?.name ?? 'Unknown Engineer'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-700">
                      In Progress
                    </span>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700">
                        Overdue
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span>{new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                  <span>·</span>
                  <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                    {daysOld}d in progress
                  </span>
                  <span>·</span>
                  <span className="font-medium text-gray-700">
                    ₹{(job.estimatedCost ?? 0).toLocaleString()}
                  </span>
                </div>
                {job.repairNotes && (
                  <p className="text-[11px] text-teal-700 bg-teal-50 rounded px-3 py-2 border border-teal-100">
                    📝 {job.repairNotes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'customers') {
      return (
        <div className="divide-y divide-gray-100">
          {customers.length === 0 && (
            <p className="px-6 py-8 text-[13px] text-gray-400 text-center">
              No customers yet.
            </p>
          )}
          {customers.map((c: Customer) => {
            const clientJobs = jobs.filter((j: Job) => j.customerId === c.id);
            const active = clientJobs.filter((j: Job) =>
              ['New', 'Assigned', 'In Progress'].includes(j.status)
            ).length;
            const done = clientJobs.filter((j: Job) =>
              ['Completed', 'Delivered'].includes(j.status)
            ).length;
            return (
              <div
                key={c.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-[14px] shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {c.phone} · {c.address}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-medium text-gray-700">
                    {clientJobs.length} job{clientJobs.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {active > 0 ? <span className="text-orange-500">{active} active</span> : ''}
                    {active > 0 && done > 0 ? ' · ' : ''}
                    {done > 0 ? <span className="text-green-600">{done} done</span> : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-gray-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
          <div>
            <h2 className="text-[18px] font-medium text-gray-900">{cfg.title}</h2>
            <p className={`text-[13px] font-normal mt-0.5 ${cfg.accentColor}`}>
              {cfg.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
      </div>
    </div>
  );
};
