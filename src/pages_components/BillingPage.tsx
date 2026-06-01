import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Banknote, Wrench, ShoppingCart } from 'lucide-react';
import type { Sale } from '../types';
import { RepairJobsTab } from './billing/RepairJobsTab';
import { SalesPaymentsTab } from './billing/SalesPaymentsTab';

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const BillingPage: React.FC = () => {
  const { currentUser, sales } = useApp();

  // SRS: Engineers must NOT see financial/billing data
  if (currentUser?.role === 'engineer') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Banknote size={48} className="mb-4 opacity-50" />
        <p className="text-[13px] font-medium text-gray-500">Access restricted</p>
      </div>
    );
  }

  const [pageTab, setPageTab] = useState<'jobs' | 'sales'>('jobs');
  const salesList = sales ?? [];
  const unpaidSales = salesList.filter((s: Sale) => !s.paidAt);

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Revenue & Billing" subtitle="Financial tracking and final delivery operations" />

      {/* ── Page-level tabs: Jobs vs Sales ── */}
      <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit gap-1">
        <button
          onClick={() => setPageTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${pageTab === 'jobs' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          <Wrench size={14} /> Repair Jobs
        </button>
        <button
          onClick={() => setPageTab('sales')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${pageTab === 'sales' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          <ShoppingCart size={14} /> Sales Payments
          {unpaidSales.length > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unpaidSales.length}</span>
          )}
        </button>
      </div>

      {pageTab === 'jobs' ? <RepairJobsTab /> : <SalesPaymentsTab />}
    </div>
  );
};