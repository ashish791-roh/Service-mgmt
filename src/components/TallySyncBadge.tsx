import React from 'react';
import { Check, AlertCircle, Clock, RefreshCw } from 'lucide-react';

export type SyncStatus = 'synced' | 'completed' | 'pushed' | 'approved' | 'pending' | 'failed' | 'retrying' | 'processing';

interface TallySyncBadgeProps {
  status?: string | null;
  className?: string;
}

export const TallySyncBadge: React.FC<TallySyncBadgeProps> = ({ status, className = '' }) => {
  if (!status) return null;
  const s = status.toLowerCase() as SyncStatus;

  let bg = 'bg-slate-50 text-slate-500 border-slate-100';
  let Icon = Clock;
  let text = status;

  switch (s) {
    case 'synced':
    case 'completed':
    case 'pushed':
    case 'approved':
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-100';
      Icon = Check;
      text = 'Synced';
      break;
    case 'pending':
      bg = 'bg-amber-50 text-amber-600 border-amber-100';
      Icon = Clock;
      text = 'Pending';
      break;
    case 'failed':
      bg = 'bg-rose-50 text-rose-600 border-rose-100';
      Icon = AlertCircle;
      text = 'Failed';
      break;
    case 'retrying':
      bg = 'bg-indigo-50 text-indigo-600 border-indigo-100';
      Icon = RefreshCw;
      text = 'Retrying';
      break;
    case 'processing':
      bg = 'bg-blue-50 text-blue-600 border-blue-100';
      Icon = RefreshCw;
      text = 'Processing';
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${bg} ${className}`}>
      <Icon size={10} className={s === 'processing' || s === 'retrying' ? 'animate-spin' : ''} />
      <span>{text}</span>
    </span>
  );
};
