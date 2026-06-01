import React from 'react';
import type { Device, Customer } from '../../../types';

interface DevicesDetailProps {
  devices: Device[];
  customers: Customer[];
}

export const DevicesDetail: React.FC<DevicesDetailProps> = ({ devices, customers }) => {
  const deviceBarColors: Record<string, string> = {
    'Smartphone': 'bg-cyan-500',
    'Laptop': 'bg-teal-500',
    'Tablet': 'bg-green-500',
    'Desktop': 'bg-orange-500',
  };
  const typeCounts = devices.reduce<Record<string, any[]>>((acc, d) => {
    if (!acc[d.type]) acc[d.type] = [];
    acc[d.type].push(d);
    return acc;
  }, {});
  const total = Math.max(devices.length, 1);
  const entries = Object.entries(typeCounts).sort((a, b) => b[1].length - a[1].length);

  const brandCounts = devices.reduce<Record<string, number>>((acc, d) => {
    acc[d.brand] = (acc[d.brand] ?? 0) + 1;
    return acc;
  }, {});
  const brandEntries = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxBrand = brandEntries[0]?.[1] || 1;

  return (
    <>
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-6 py-4 text-center">
          <p className="text-[20px] font-medium text-orange-500">{devices.length}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Total Devices</p>
        </div>
        <div className="px-6 py-4 text-center">
          <p className="text-[20px] font-medium text-teal-600">{entries.length}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Device Types</p>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-4">By Type</p>
        <div className="space-y-3">
          {entries.map(([type, devs]) => {
            const pct = Math.round((devs.length / total) * 100);
            const color = deviceBarColors[type] ?? 'bg-gray-400';
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-gray-700">{type}</span>
                  <span className="text-[12px] font-medium text-gray-900">{devs.length} unit{devs.length !== 1 ? 's' : ''} · {pct}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-4">Top Brands</p>
        <div className="space-y-2.5">
          {brandEntries.map(([brand, count]) => (
            <div key={brand} className="flex items-center gap-3">
              <span className="text-[12px] text-gray-700 w-24 shrink-0 truncate">{brand}</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-teal-400 rounded-full" style={{ width: `${Math.round((count / maxBrand) * 100)}%` }} />
              </div>
              <span className="text-[12px] font-medium text-gray-700 w-6 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">All Devices</p>
      </div>
      <div className="divide-y divide-gray-100">
        {devices.map((d) => {
          const customer = customers.find((c) => c.id === d.customerId);
          const color = deviceBarColors[d.type] ?? 'bg-gray-400';
          return (
            <div key={d.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
              <div className={`w-2 h-8 rounded-full shrink-0 ${color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-gray-900 truncate">{d.brand} {d.model}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{d.type} · {customer?.name ?? 'Unknown'}</p>
              </div>
              {d.serialNumber && <span className="text-[10px] text-gray-400 shrink-0 font-mono">{d.serialNumber}</span>}
            </div>
          );
        })}
        {devices.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No devices registered yet.</p>}
      </div>
    </>
  );
};
