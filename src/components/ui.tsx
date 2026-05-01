import React, { useState } from 'react';
import type { JobStatus, PartRequestStatus } from '../types';

// ── StatusBadge ──────────────────────────────────────────────
export const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const map: Record<JobStatus, { cls: string; dot: string }> = {
    'New':         { cls: 'bg-slate-500/10 text-slate-300 border-slate-500/20',       dot: 'bg-slate-400' },
    'Assigned':    { cls: 'bg-blue-500/10 text-blue-300 border-blue-500/20',           dot: 'bg-blue-400' },
    'In Progress': { cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20',        dot: 'bg-amber-400' },
    'Completed':   { cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',  dot: 'bg-emerald-400' },
    'Delivered':   { cls: 'bg-purple-500/10 text-purple-300 border-purple-500/20',     dot: 'bg-purple-400' },
  };
  const { cls, dot } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {status}
    </span>
  );
};

// ── PartStatusBadge ───────────────────────────────────────────
export const PartStatusBadge: React.FC<{ status: PartRequestStatus }> = ({ status }) => {
  const map: Record<PartRequestStatus, string> = {
    'Pending':  'bg-amber-500/10 text-amber-300 border-amber-500/20',
    'Approved': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    'Rejected': 'bg-red-500/10 text-red-300 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status]}`}>
      {status}
    </span>
  );
};

// ── UrgencyDot ────────────────────────────────────────────────
export const UrgencyDot: React.FC<{ createdAt: string }> = ({ createdAt }) => {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days > 10) return <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 shadow-sm shadow-red-500/50 shrink-0" title="Pending > 10 days" />;
  if (days > 5)  return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 shrink-0" title="Pending > 5 days" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 shrink-0" title="Recently active" />;
};

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps { title: string; onClose: () => void; children: React.ReactNode; }
export const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-slate-900/95 rounded-2xl shadow-2xl shadow-slate-900/50 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up border border-slate-700/80" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(13,18,32,0.95))', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 sticky top-0 bg-slate-900/50 rounded-t-2xl z-10">
        <h3 className="text-base font-bold text-white font-display">{title}</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// ── StatCard ──────────────────────────────────────────────────
interface StatCardProps { label: string; value: number | string; icon: string; color: string; sub?: string; }
export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, sub }) => (
  <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-default relative overflow-hidden group hover:border-slate-600">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    <div className="relative flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-display font-extrabold mt-2 leading-none tracking-tight text-white`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-2 font-medium">{sub}</p>}
      </div>
      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl shrink-0 border border-slate-700">
        {icon}
      </div>
    </div>
  </div>
);

// ── SectionHeader ─────────────────────────────────────────────
interface SectionHeaderProps { title: string; subtitle?: string; action?: React.ReactNode; }
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-2xl font-display font-bold text-white tracking-tight">{title}</h1>
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// ── FormInput ─────────────────────────────────────────────────
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
export const FormInput: React.FC<FormInputProps> = ({ label, ...props }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-slate-600 transition-all bg-slate-900/50 text-white placeholder-slate-500 ${props.className ?? ''}`}
    />
  </div>
);

// ── FormSelect ────────────────────────────────────────────────
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label: string; options: { value: string; label: string }[]; placeholder?: string; }
export const FormSelect: React.FC<FormSelectProps> = ({ label, options, placeholder, ...props }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
    <select
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/50 hover:border-slate-600 transition-all text-white ${props.className ?? ''}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ── Textarea ──────────────────────────────────────────────────
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label: string; }
export const FormTextarea: React.FC<FormTextareaProps> = ({ label, ...props }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <textarea
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none hover:border-slate-300 transition-all bg-white text-slate-800 placeholder-slate-400 ${props.className ?? ''}`}
    />
  </div>
);

// ── Toggle ────────────────────────────────────────────────────
export const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    role="switch"
    aria-checked={checked}
    className={`relative w-11 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}
  >
    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
  </button>
);

// ── EmptyState ────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/80 flex items-center justify-center text-4xl mb-5 shadow-sm">
      {icon}
    </div>
    <h3 className="text-base font-display font-bold text-slate-700">{title}</h3>
    <p className="text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">{desc}</p>
  </div>
);

// ── Toast ──────────────────────────────────────────────────────
export const Toast: React.FC<{ message: string; type?: 'success' | 'error' | 'info' }> = ({ message, type = 'success' }) => {
  const config = {
    success: { bg: 'bg-emerald-600', icon: '✓', ring: 'ring-emerald-500/30' },
    error:   { bg: 'bg-red-600',     icon: '✕', ring: 'ring-red-500/30' },
    info:    { bg: 'bg-indigo-600',  icon: 'ℹ', ring: 'ring-indigo-500/30' },
  };
  const { bg, icon, ring } = config[type];
  return (
    <div className={`fixed bottom-6 right-6 z-[100] ${bg} text-white px-4 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 animate-[slideUp_0.3s_ease] ring-1 ${ring}`}>
      <span className={`w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-xs shrink-0 font-bold`}>{icon}</span>
      {message}
    </div>
  );
};

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const show = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

// ── Card ──────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; className?: string; noPad?: boolean }> = ({ children, className = '', noPad }) => (
  <div className={`bg-white rounded-2xl border border-slate-100/80 shadow-sm ${noPad ? '' : 'p-6'} ${className}`}>
    {children}
  </div>
);

// ── CardHeader ────────────────────────────────────────────────
export const CardHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
    <h2 className="font-display font-bold text-slate-800 text-base">{title}</h2>
    {action && <div>{action}</div>}
  </div>
);

// ── PrimaryButton ─────────────────────────────────────────────
export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }> = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

// ── SecondaryButton ───────────────────────────────────────────
export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }> = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all ${className}`}
  >
    {children}
  </button>
);

// ── SearchBar ─────────────────────────────────────────────────
interface SearchBarProps { value: string; onChange: (v: string) => void; placeholder?: string; }
export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="relative">
    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-400 hover:border-slate-300 transition-all"
    />
  </div>
);

// ── Table ─────────────────────────────────────────────────────
export const Table: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/60">
          {headers.map(h => (
            <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">{children}</tbody>
    </table>
  </div>
);

export const Tr: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <tr onClick={onClick} className={`hover:bg-slate-50/80 transition-colors ${onClick ? 'cursor-pointer' : ''}`}>
    {children}
  </tr>
);

export const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-5 py-3.5 text-sm text-slate-700 ${className}`}>{children}</td>
);
