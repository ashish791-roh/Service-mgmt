import React from 'react';
import { Calendar } from 'lucide-react';
import { Job } from '../../types';

interface MonthWiseAnalyticsProps {
  jobs: Job[];
}

const Card = ({
  children, className = '', onClick,
}: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${onClick ? 'cursor-pointer hover:border-teal-300 hover:shadow-md transition-all' : ''} ${className}`}
  >
    {children}
  </div>
);

export const MonthWiseAnalytics: React.FC<MonthWiseAnalyticsProps> = ({ jobs }) => {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthJobs = jobs.filter(j => {
      const jd = new Date(j.createdAt);
      return jd >= d && jd < nextMonth;
    });
    const completed = monthJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
    const revenue = completed.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost ?? 0), 0);
    return {
      label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      fullLabel: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      total: monthJobs.length,
      completed: completed.length,
      pending: monthJobs.filter(j => ['New', 'Assigned', 'In Progress'].includes(j.status)).length,
      revenue,
      completionRate: monthJobs.length > 0 ? Math.round((completed.length / monthJobs.length) * 100) : 0,
      uniqueCustomers: new Set(monthJobs.map(j => j.customerId)).size,
    };
  });

  const maxJobs = Math.max(...months.map(m => m.total), 1);
  const maxRevenue = Math.max(...months.map(m => m.revenue), 1);

  return (
    <Card>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
          <Calendar className="text-teal-500" size={16} /> Month-wise Analytics
        </h3>
        <span className="text-[11px] text-gray-400">Last 12 months</span>
      </div>

      <div className="px-6 pt-5 pb-2">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">Jobs per Month</p>
        <div className="flex items-end gap-1.5 h-24">
          {months.map(m => {
            const jobH = Math.round((m.total / maxJobs) * 100);
            const compH = m.total > 0 ? Math.round((m.completed / m.total) * jobH) : 0;
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1" title={`${m.fullLabel}\n${m.total} jobs · ${m.completed} completed · ₹${m.revenue.toLocaleString()}`}>
                {m.total > 0 && <span className="text-[9px] font-medium text-gray-600 leading-none">{m.total}</span>}
                <div className="w-full flex flex-col justify-end" style={{ height: '72px' }}>
                  {m.total > 0 ? (
                    <div className="w-full rounded-t-sm overflow-hidden" style={{ height: `${Math.max(jobH, 6)}%` }}>
                      <div className="w-full bg-green-500" style={{ height: `${compH}%` }} />
                      <div className="w-full bg-teal-200" style={{ height: `${100 - compH}%` }} />
                    </div>
                  ) : (
                    <div className="w-full bg-gray-100 rounded-t-sm" style={{ height: '3px' }} />
                  )}
                </div>
                <span className="text-[9px] text-gray-400 leading-none">{m.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-500" /><span className="text-[11px] text-gray-500">Completed</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-teal-200" /><span className="text-[11px] text-gray-500">Other</span></div>
        </div>
      </div>

      <div className="px-6 pt-4 pb-2 border-t border-gray-100">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">Revenue per Month (₹)</p>
        <div className="flex items-end gap-1.5 h-20">
          {months.map(m => {
            const h = Math.round((m.revenue / maxRevenue) * 100);
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1" title={`${m.fullLabel}\n₹${m.revenue.toLocaleString()}`}>
                <div className="w-full flex flex-col justify-end" style={{ height: '60px' }}>
                  {m.revenue > 0 ? (
                    <div className="w-full bg-emerald-500 rounded-t-sm" style={{ height: `${Math.max(h, 4)}%` }} />
                  ) : (
                    <div className="w-full bg-gray-100 rounded-t-sm" style={{ height: '3px' }} />
                  )}
                </div>
                <span className="text-[9px] text-gray-400 leading-none">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-100 overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left font-medium text-gray-500 uppercase tracking-wide">Month</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-500 uppercase tracking-wide">Jobs</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-500 uppercase tracking-wide">Completed</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-500 uppercase tracking-wide">Pending</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-500 uppercase tracking-wide">Rate</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500 uppercase tracking-wide">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...months].reverse().map(m => (
              <tr key={m.label} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-gray-700 whitespace-nowrap">{m.fullLabel}</td>
                <td className="px-4 py-2.5 text-center text-gray-900 font-medium">{m.total > 0 ? m.total : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2.5 text-center text-green-600 font-medium">{m.completed > 0 ? m.completed : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2.5 text-center text-orange-500 font-medium">{m.pending > 0 ? m.pending : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2.5 text-center">
                  {m.total > 0 ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.completionRate >= 75 ? 'bg-green-500' : m.completionRate >= 40 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${m.completionRate}%` }} />
                      </div>
                      <span className={`font-medium ${m.completionRate >= 75 ? 'text-green-600' : m.completionRate >= 40 ? 'text-orange-500' : 'text-red-500'}`}>{m.completionRate}%</span>
                    </div>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-700">
                  {m.revenue > 0 ? `₹${m.revenue.toLocaleString()}` : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
