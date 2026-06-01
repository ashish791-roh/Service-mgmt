import React from 'react';
import { X } from 'lucide-react';
import type { User, Job, Customer, PartRequest, Device } from '../../types';

import { RevenueBreakdown } from './components/RevenueBreakdown';
import { VolumeDetail } from './components/VolumeDetail';
import { ClientsDetail } from './components/ClientsDetail';
import { PartsDetail } from './components/PartsDetail';
import { WorkflowDistribution } from './components/WorkflowDistribution';
import { KeyMetricsDetail } from './components/KeyMetricsDetail';
import { Leaderboard } from './components/Leaderboard';
import { DevicesDetail } from './components/DevicesDetail';

export type TimePeriod = '7d' | '30d' | '90d' | 'overall';

export type AnalyticsModalType =
  | 'revenue'
  | 'volume'
  | 'clients'
  | 'parts'
  | 'workflow'
  | 'keymetrics'
  | 'leaderboard'
  | 'devices'
  | null;

interface AnalyticsDetailDrawerProps {
  type: AnalyticsModalType;
  onClose: () => void;
  jobs: Job[];
  users: User[];
  customers: Customer[];
  partRequests: PartRequest[];
  devices: Device[];
}

export const AnalyticsDetailDrawer: React.FC<AnalyticsDetailDrawerProps> = ({
  type, onClose, jobs, users, customers, partRequests, devices,
}) => {
  if (!type) return null;

  const configs: Record<NonNullable<AnalyticsModalType>, { title: string; subtitle: string; accentColor: string }> = {
    revenue:     { title: 'Revenue Breakdown',     subtitle: 'Earnings from completed jobs & sales',   accentColor: 'text-green-600' },
    volume:      { title: 'Job Volume Detail',      subtitle: 'All jobs across all statuses',           accentColor: 'text-cyan-600' },
    clients:     { title: 'Client Directory',       subtitle: 'All registered customers',               accentColor: 'text-teal-600' },
    parts:       { title: 'Parts Requests',         subtitle: 'Approved, pending & rejected',           accentColor: 'text-orange-600' },
    workflow:    { title: 'Workflow Distribution',  subtitle: 'Jobs broken down by status',             accentColor: 'text-teal-600' },
    keymetrics:  { title: 'Key Metrics Detail',     subtitle: 'Detailed performance indicators',        accentColor: 'text-cyan-600' },
    leaderboard: { title: 'Engineer Leaderboard',   subtitle: 'Performance & completion stats',         accentColor: 'text-teal-600' },
    devices:     { title: 'Hardware Distribution',  subtitle: 'All registered devices by type',         accentColor: 'text-orange-600' },
  };

  const cfg = configs[type];

  const renderContent = () => {
    switch (type) {
      case 'revenue':
        return <RevenueBreakdown jobs={jobs} customers={customers} users={users} />;
      case 'volume':
        return <VolumeDetail jobs={jobs} customers={customers} users={users} />;
      case 'clients':
        return <ClientsDetail jobs={jobs} customers={customers} />;
      case 'parts':
        return <PartsDetail jobs={jobs} partRequests={partRequests} users={users} />;
      case 'workflow':
        return <WorkflowDistribution jobs={jobs} customers={customers} users={users} />;
      case 'keymetrics':
        return <KeyMetricsDetail jobs={jobs} partRequests={partRequests} users={users} />;
      case 'leaderboard':
        return <Leaderboard jobs={jobs} users={users} />;
      case 'devices':
        return <DevicesDetail devices={devices} customers={customers} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
          <div>
            <h2 className="text-[18px] font-medium text-gray-900">{cfg.title}</h2>
            <p className={`text-[13px] font-normal mt-0.5 ${cfg.accentColor}`}>{cfg.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
