import React, { useState } from 'react';
import type { JobStatus, PartRequestStatus } from '../types';

// ── StatusBadge ──────────────────────────────────────────────
export const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const map: Record<JobStatus, string> = {
    'New': 'bg-slate-100 text-slate-700 border-slate-200',
    'Assigned': 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Delivered': 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status]}`}>
      {status}
    </span>
  );
};

// ── PartStatusBadge ───────────────────────────────────────────
export const PartStatusBadge: React.FC<{ status: PartRequestStatus }> = ({ status }) => {
  const map: Record<PartRequestStatus, string> = {
    'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
    'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Rejected': 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status]}`}>
      {status}
    </span>
  );
};

// ── UrgencyDot ────────────────────────────────────────────────
export const UrgencyDot: React.FC<{ createdAt: string }> = ({ createdAt }) => {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days > 10) return <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" title="Pending > 10 days" />;
  if (days > 5) return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5" title="Pending > 5 days" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5" title="Recently active" />;
};

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps { title: string; onClose: () => void; children: React.ReactNode; }
export const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// ── StatCard ──────────────────────────────────────────────────
interface StatCardProps { label: string; value: number | string; icon: string; color: string; sub?: string; }
export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, sub }) => (
  <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`text-2xl p-2.5 rounded-xl bg-slate-50`}>{icon}</div>
    </div>
  </div>
);

// ── FormInput ─────────────────────────────────────────────────
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
export const FormInput: React.FC<FormInputProps> = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
    <input {...props} className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${props.className ?? ''}`} />
  </div>
);

// ── FormSelect ────────────────────────────────────────────────
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label: string; options: { value: string; label: string }[]; placeholder?: string; }
export const FormSelect: React.FC<FormSelectProps> = ({ label, options, placeholder, ...props }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
    <select {...props} className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition ${props.className ?? ''}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ── Textarea ──────────────────────────────────────────────────
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label: string; }
export const FormTextarea: React.FC<FormTextareaProps> = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
    <textarea {...props} className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition ${props.className ?? ''}`} />
  </div>
);

// ── Toggle ────────────────────────────────────────────────────
export const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}>
    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow ${checked ? 'translate-x-5' : ''}`} />
  </button>
);

// ── EmptyState ────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-bold text-slate-700">{title}</h3>
    <p className="text-sm text-slate-400 mt-1">{desc}</p>
  </div>
);

// ── useToast ──────────────────────────────────────────────────
export const Toast: React.FC<{ message: string; type?: 'success' | 'error' | 'info' }> = ({ message, type = 'success' }) => {
  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', info: 'bg-indigo-500' };
  return (
    <div className={`fixed bottom-6 right-6 z-[100] ${colors[type]} text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 animate-[slideUp_0.3s_ease]`}>
      {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} {message}
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
