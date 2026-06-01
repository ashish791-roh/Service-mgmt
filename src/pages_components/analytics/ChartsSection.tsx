import React from 'react';
import { BarChart2, Package } from 'lucide-react';
import { Job, Sale, PartRequest, InventoryItem } from '../../types';
import { BarChart } from './BarChart';
import { DonutChart } from './DonutChart';

interface ChartsSectionProps {
  jobs: Job[];
  sales: Sale[];
  partRequests: PartRequest[];
  inventory: InventoryItem[];
  period: string;
  periodLabel: string;
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

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  jobs, sales, partRequests, inventory, periodLabel
}) => {
  const now = new Date();

  // Build last 6 months data
  const months6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const label = d.toLocaleString('en-IN', { month: 'short' });

    const monthJobs = jobs.filter(j => { const jd = new Date(j.createdAt); return jd >= d && jd < nextMonth; });
    const completedJobs = monthJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
    const jobRevenue = completedJobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost ?? 0), 0);

    const monthSales = sales.filter(s => { const sd = new Date(s.createdAt); return sd >= d && sd < nextMonth; });
    const saleRevenue = monthSales.reduce((s, sale) => s + (sale.totalAmount ?? 0), 0);

    return { label, jobRevenue, saleRevenue, totalRevenue: jobRevenue + saleRevenue, jobCount: monthJobs.length, saleCount: monthSales.length };
  });

  // Parts usage by name (top 8 approved)
  const approvedParts = partRequests.filter(r => r.status === 'Approved');
  const partsByName: Record<string, number> = {};
  approvedParts.forEach(r => { partsByName[r.partName] = (partsByName[r.partName] ?? 0) + r.quantity; });
  const topParts = Object.entries(partsByName).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxPartQty = topParts[0]?.[1] || 1;

  // Cost of parts used (quantity × inventory unitCost)
  const partsWithCost = approvedParts.map(r => {
    const invItem = inventory.find((inv) => inv.name?.toLowerCase() === r.partName?.toLowerCase());
    const unitCost = invItem?.unitCost ?? 0;
    return { ...r, unitCost, totalCost: unitCost * r.quantity };
  });
  const totalPartsCost = partsWithCost.reduce((s, r) => s + r.totalCost, 0);

  // Parts cost by month (last 6)
  const partsCostByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const label = d.toLocaleString('en-IN', { month: 'short' });
    const cost = partsWithCost
      .filter(r => { const rd = new Date(r.createdAt); return rd >= d && rd < nextMonth; })
      .reduce((s, r) => s + r.totalCost, 0);
    return { label, value: cost };
  });

  // Sales revenue by month
  const salesByMonth = months6.map(m => ({ label: m.label, value: m.saleRevenue }));

  // Job revenue vs sales revenue comparison
  const jobRevenueTotal = jobs.filter(j => ['Completed', 'Delivered'].includes(j.status))
    .reduce((s, j) => s + (j.actualCost ?? j.estimatedCost ?? 0), 0);
  const salesRevenueTotal = sales.reduce((s, sale) => s + (sale.totalAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <BarChart2 className="text-teal-500" size={18} />
        <h2 className="text-[15px] font-medium text-gray-900">Charts & Insights</h2>
        <span className="ml-auto text-[11px] text-gray-400">{periodLabel}</span>
      </div>

      {/* Row 1: Revenue Trend + Revenue Split Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue trend — jobs vs sales by month */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Revenue Trend — Last 6 Months</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Job repairs vs direct sales</p>
          </div>
          <div className="p-6">
            <div className="flex items-end gap-2 h-36">
              {months6.map(m => {
                const maxTotal = Math.max(...months6.map(x => x.totalRevenue), 1);
                const jobH = Math.round((m.jobRevenue / maxTotal) * 100);
                const saleH = Math.round((m.saleRevenue / maxTotal) * 100);
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1"
                    title={`${m.label}\nJobs: ₹${m.jobRevenue.toLocaleString()}\nSales: ₹${m.saleRevenue.toLocaleString()}`}>
                    <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '110px' }}>
                      {m.saleRevenue > 0 && (
                        <div className="w-full bg-blue-400 rounded-sm" style={{ height: `${Math.max(saleH, 3)}%` }} />
                      )}
                      {m.jobRevenue > 0 && (
                        <div className="w-full bg-teal-500 rounded-sm" style={{ height: `${Math.max(jobH, 3)}%` }} />
                      )}
                      {m.jobRevenue === 0 && m.saleRevenue === 0 && (
                        <div className="w-full bg-gray-100 rounded-sm" style={{ height: '3px' }} />
                      )}
                    </div>
                    <span className="text-[9px] text-gray-400 leading-none">{m.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-teal-500" /><span className="text-[11px] text-gray-500">Job Revenue</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-400" /><span className="text-[11px] text-gray-500">Sales Revenue</span></div>
            </div>
          </div>
        </Card>

        {/* Revenue split donut */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Revenue Composition</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Total: ₹{(jobRevenueTotal + salesRevenueTotal).toLocaleString()}</p>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <DonutChart
              segments={[
                { label: 'Job Repairs', value: jobRevenueTotal, color: '#14b8a6' },
                { label: 'Direct Sales', value: salesRevenueTotal, color: '#60a5fa' },
              ]}
              size={130}
              strokeWidth={26}
            />
            <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-gray-500">Job Repair Share</p>
                <p className="text-[18px] font-medium text-teal-600">
                  {jobRevenueTotal + salesRevenueTotal > 0
                    ? `${Math.round((jobRevenueTotal / (jobRevenueTotal + salesRevenueTotal)) * 100)}%`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Sales Share</p>
                <p className="text-[18px] font-medium text-blue-500">
                  {jobRevenueTotal + salesRevenueTotal > 0
                    ? `${Math.round((salesRevenueTotal / (jobRevenueTotal + salesRevenueTotal)) * 100)}%`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Parts Cost + Sales Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Parts cost by month */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Parts Cost Over Time</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Total cost of approved part requests — ₹{totalPartsCost.toLocaleString()}</p>
          </div>
          <div className="p-6">
            <BarChart
              data={partsCostByMonth}
              height={160}
              barColor="#f97316"
              label="Parts cost per month (₹)"
            />
            {totalPartsCost === 0 && (
              <p className="text-[12px] text-gray-400 text-center mt-2">No costed part data yet — ensure inventory items have unit costs set.</p>
            )}
          </div>
        </Card>

        {/* Sales count by month */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-[13px] font-medium text-gray-900">Sales Revenue — Last 6 Months</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Direct product sales revenue</p>
          </div>
          <div className="p-6">
            <BarChart
              data={salesByMonth}
              height={160}
              barColor="#60a5fa"
              label="Sales revenue per month (₹)"
            />
            {salesRevenueTotal === 0 && (
              <p className="text-[12px] text-gray-400 text-center mt-2">No sales recorded yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: Top Parts Used */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
            <Package className="text-orange-500" size={16} /> Top Parts Used (by Quantity)
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Approved part requests — {approvedParts.length} total requests</p>
        </div>
        <div className="p-6">
          {topParts.length === 0 ? (
            <p className="text-[12px] text-gray-400 text-center py-4">No approved parts requests yet.</p>
          ) : (
            <div className="space-y-3">
              {topParts.map(([name, qty]) => {
                const pct = Math.round((qty / maxPartQty) * 100);
                const invItem = inventory.find((inv) => inv.name?.toLowerCase() === name.toLowerCase());
                const unitCost = invItem?.unitCost ?? 0;
                return (
                  <div key={name} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-gray-700 truncate flex-1 mr-4">{name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        {unitCost > 0 && (
                          <span className="text-[11px] text-gray-400">₹{(unitCost * qty).toLocaleString()} cost</span>
                        )}
                        <span className="text-[12px] font-medium text-orange-600">{qty} units</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
