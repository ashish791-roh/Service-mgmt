import React from 'react';
import type { Job, Customer } from '../../../types';

interface ClientsDetailProps {
  jobs: Job[];
  customers: Customer[];
}

export const ClientsDetail: React.FC<ClientsDetailProps> = ({ jobs, customers }) => {
  const sorted = [...customers].sort((a, b) => {
    const aj = jobs.filter((j) => j.customerId === a.id).length;
    const bj = jobs.filter((j) => j.customerId === b.id).length;
    return bj - aj;
  });
  return (
    <>
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-6 py-4 text-center">
          <p className="text-[20px] font-medium text-teal-600">{customers.length}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Total Customers</p>
        </div>
        <div className="px-6 py-4 text-center">
          <p className="text-[20px] font-medium text-orange-500">
            {customers.filter((c) => jobs.some((j) => j.customerId === c.id && ['New','Assigned','In Progress'].includes(j.status))).length}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">With Active Jobs</p>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {sorted.map((c) => {
          const clientJobs = jobs.filter((j) => j.customerId === c.id);
          const active = clientJobs.filter((j) => ['New', 'Assigned', 'In Progress'].includes(j.status)).length;
          const done = clientJobs.filter((j) => ['Completed', 'Delivered'].includes(j.status)).length;
          const spent = clientJobs.filter((j) => ['Completed', 'Delivered'].includes(j.status))
            .reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
          return (
            <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-[14px] shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{c.phone} · {c.address}</p>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <p className="text-[12px] font-medium text-gray-700">{clientJobs.length} job{clientJobs.length !== 1 ? 's' : ''}</p>
                <p className="text-[11px] text-gray-400">
                  {active > 0 ? <span className="text-orange-500">{active} active</span> : ''}
                  {active > 0 && done > 0 ? ' · ' : ''}
                  {done > 0 ? <span className="text-green-600">{done} done</span> : ''}
                </p>
                {spent > 0 && <p className="text-[11px] font-medium text-green-700">₹{spent.toLocaleString()}</p>}
              </div>
            </div>
          );
        })}
        {customers.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No customers yet.</p>}
      </div>
    </>
  );
};
