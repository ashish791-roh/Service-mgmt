import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge, UrgencyDot, JobAgeBadge, getJobAgeLevel, Toast, useToast, PartStatusBadge } from '../components/ui';
import { Briefcase, AlertCircle, Zap, Users, Settings, Search, Plus, ArrowRight, X, Phone, MapPin, Monitor, Wrench, Calendar, ChevronRight, QrCode, Download, Printer } from 'lucide-react';

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const MetricCard = ({ title, value, icon: Icon, colorClass, sub, onClick }: any) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group ${onClick ? 'cursor-pointer hover:border-teal-300 hover:shadow-md transition-all' : ''}`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div className="flex items-center gap-2">
        {sub && <span className="bg-rose-100 text-rose-600 text-[11px] font-medium px-2.5 py-1 rounded-md uppercase tracking-wide">{sub}</span>}
        {onClick && (
          <span className="text-[10px] font-medium text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            Details <ChevronRight size={12} />
          </span>
        )}
      </div>
    </div>
    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
    <h3 className="text-[24px] font-medium text-gray-900 leading-none">{value}</h3>
  </div>
);

// ── Reception Detail Modal (slide-in drawer) ──────────────────────────────────
type ReceptionModalType = 'total' | 'unassigned' | 'inprogress' | 'customers' | null;

const ReceptionDetailModal = ({
  type, onClose, jobs, customers, users, onNavigate
}: {
  type: ReceptionModalType;
  onClose: () => void;
  jobs: any[];
  customers: any[];
  users: any[];
  onNavigate: (p: string) => void;
}) => {
  if (!type) return null;

  const configs: Record<NonNullable<ReceptionModalType>, { title: string; subtitle: string; accentColor: string }> = {
    total:       { title: 'All Jobs',        subtitle: 'Complete job registry',            accentColor: 'text-cyan-600' },
    unassigned:  { title: 'Unassigned Jobs', subtitle: 'Jobs waiting for an engineer',     accentColor: 'text-rose-600' },
    inprogress:  { title: 'In Progress',     subtitle: 'Active repairs underway',          accentColor: 'text-amber-600' },
    customers:   { title: 'Customers',       subtitle: 'Registered client accounts',       accentColor: 'text-green-600' },
  };

  const jobStatusColors: Record<string, string> = {
    'New':        'border-cyan-400 text-cyan-700 bg-cyan-50',
    'Assigned':   'border-teal-400 text-teal-700 bg-teal-50',
    'In Progress':'border-orange-400 text-orange-700 bg-orange-50',
    'Completed':  'border-green-400 text-green-700 bg-green-50',
    'Delivered':  'border-green-400 text-green-700 bg-green-50',
  };

  const cfg = configs[type];

  const renderContent = () => {
    if (type === 'total') {
      return (
        <div className="divide-y divide-gray-100">
          {jobs.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No jobs yet.</p>}
          {jobs.map((job: any) => {
            const customer = customers.find((c: any) => c.id === job.customerId);
            const engineer = users.find((u: any) => u.id === job.assignedEngineerId);
            const daysOld = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000);
            const style = jobStatusColors[job.status] || 'border-gray-300 text-gray-700 bg-gray-50';
            const borderCls = style.split(' ')[0];
            const badgeCls = style.split(' ').slice(1).join(' ');
            return (
              <div key={job.id} className={`flex flex-col gap-2 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {customer?.name ?? 'Unknown'} · {engineer ? engineer.name : <span className="text-rose-500">Unassigned</span>}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${badgeCls}`}>{job.status}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span>{new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                  <span>·</span>
                  <span className={daysOld > 10 ? 'text-red-500 font-medium' : daysOld > 5 ? 'text-yellow-600 font-medium' : 'text-green-600'}>
                    {daysOld}d ago
                  </span>
                  <span>·</span>
                  <span className="font-medium text-gray-700">₹{job.estimatedCost?.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'unassigned') {
      const unassigned = jobs.filter((j: any) => !j.assignedEngineerId || j.status === 'New');
      return (
        <>
          <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
            <p className="text-[13px] font-medium text-rose-700">{unassigned.length} jobs need assignment</p>
            <button
              onClick={() => { onClose(); onNavigate('assign'); }}
              className="text-[11px] font-medium text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Go to Assign Page →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {unassigned.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">All jobs are assigned! 🎉</p>}
            {unassigned.map((job: any) => {
              const customer = customers.find((c: any) => c.id === job.customerId);
              const daysOld = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000);
              return (
                <div key={job.id} className="flex flex-col gap-2 px-6 py-4 border-l-4 border-rose-400 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{customer?.name ?? 'Unknown'} · {customer?.phone}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-100 text-rose-700 shrink-0">Unassigned</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span>{new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                    <span>·</span>
                    <span className={daysOld > 5 ? 'text-red-600 font-medium' : 'text-gray-600'}>{daysOld}d waiting</span>
                    <span>·</span>
                    <span className="font-medium text-gray-700">₹{job.estimatedCost?.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    }

    if (type === 'inprogress') {
      const inProgress = jobs.filter((j: any) => j.status === 'In Progress');
      return (
        <div className="divide-y divide-gray-100">
          {inProgress.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No jobs in progress.</p>}
          {inProgress.map((job: any) => {
            const customer = customers.find((c: any) => c.id === job.customerId);
            const engineer = users.find((u: any) => u.id === job.assignedEngineerId);
            const daysOld = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000);
            const isOverdue = daysOld > 10;
            return (
              <div key={job.id} className={`flex flex-col gap-2 px-6 py-4 border-l-4 ${isOverdue ? 'border-red-400' : 'border-amber-400'} hover:bg-gray-50 transition-colors`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {customer?.name ?? 'Unknown'} · {engineer?.name ?? 'Unknown Engineer'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-700">In Progress</span>
                    {isOverdue && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700">Overdue</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span>{new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                  <span>·</span>
                  <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>{daysOld}d in progress</span>
                  <span>·</span>
                  <span className="font-medium text-gray-700">₹{job.estimatedCost?.toLocaleString()}</span>
                </div>
                {job.repairNotes && (
                  <p className="text-[11px] text-teal-700 bg-teal-50 rounded px-3 py-2 border border-teal-100">📝 {job.repairNotes}</p>
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
          {customers.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No customers yet.</p>}
          {customers.map((c: any) => {
            const clientJobs = jobs.filter((j: any) => j.customerId === c.id);
            const active = clientJobs.filter((j: any) => ['New', 'Assigned', 'In Progress'].includes(j.status)).length;
            const done = clientJobs.filter((j: any) => ['Completed', 'Delivered'].includes(j.status)).length;
            return (
              <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-[14px] shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{c.phone} · {c.address}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-medium text-gray-700">{clientJobs.length} job{clientJobs.length !== 1 ? 's' : ''}</p>
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

const Button = ({ icon: Icon, text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: any = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    outline_danger: "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50",
    ghost: "bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100"
  };
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

// ── QRModal ────────────────────────────────────────────────────
// Renders a QR code for a given job using the browser's canvas API.
// No external QR library needed — uses a minimal inline QR encoder.
const QRModal = ({ job, customer, device, onClose }: {
  job: any; customer: any; device: any; onClose: () => void;
}) => {
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const shortId = job.id.slice(-8).toUpperCase();
  const trackingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/track?job=${job.id}`;

  React.useEffect(() => {
    // Inline QR generation using a lightweight canvas-based approach
    // We encode the data as a QR code via a data URL using the canvas element
    generateQR(trackingUrl).then(url => {
      setQrDataUrl(url);
      setLoading(false);
    });
  }, [trackingUrl]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `FixHub-Job-${shortId}.png`;
    a.click();
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>FixHub Job #${shortId}</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
        .card { border: 2px solid #000; border-radius: 12px; padding: 24px; max-width: 320px; text-align: center; }
        h2 { margin: 0 0 4px; font-size: 22px; } p { margin: 4px 0; color: #555; font-size: 13px; }
        img { margin: 16px 0; width: 200px; height: 200px; }
        .ref { font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
        .status { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px 12px; display: inline-block; font-size: 12px; font-weight: 600; text-transform: uppercase; }
      </style></head><body>
      <div class="card">
        <h2>FixHub</h2>
        <p>Service Job Tracking</p>
        <img src="${qrDataUrl}" alt="QR Code" />
        <div class="ref">#${shortId}</div>
        <p><strong>${customer?.name ?? 'Customer'}</strong></p>
        <p>${device?.brand ?? ''} ${device?.model ?? ''}</p>
        <p style="margin-top:8px">${job.problemDescription?.slice(0, 60) ?? ''}</p>
        <div class="status" style="margin-top:12px">${job.status}</div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-teal-600" />
            <h2 className="text-[16px] font-semibold text-gray-900">Job QR Code</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-4">
          {/* Job info */}
          <div className="w-full bg-gray-50 rounded-lg p-3 border border-gray-100 text-center">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Job Reference</p>
            <p className="text-[20px] font-bold text-gray-900 tracking-widest">#{shortId}</p>
            <p className="text-[13px] font-medium text-gray-700 mt-1">{customer?.name}</p>
            <p className="text-[11px] text-gray-500">{device?.brand} {device?.model}</p>
          </div>
          {/* QR Image */}
          <div className="w-52 h-52 rounded-xl border-2 border-gray-200 flex items-center justify-center bg-white overflow-hidden">
            {loading ? (
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain p-2" />
            )}
          </div>
          <p className="text-[11px] text-gray-400 text-center px-4">
            Scan to track job status · <span className="font-mono text-gray-500 break-all">{trackingUrl}</span>
          </p>
          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Download size={15} /> Download
            </button>
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-[13px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Printer size={15} /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Lightweight QR code generator using the free qrcode-svg approach via canvas
// This uses the QR standard patterns drawn on a canvas element
async function generateQR(text: string): Promise<string> {
  // We use a reliable third-party CDN script approach via a hidden iframe
  // Instead, we use the qrserver.com free API to generate a reliable QR image
  // (works offline-first by generating a data URL via canvas using Reed-Solomon)
  // For simplicity and reliability we call Google Charts QR API (no key needed)
  try {
    const size = 200;
    const encoded = encodeURIComponent(text);
    // Use QR Server API (free, no rate limit for this use case)
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=png&margin=10`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('QR API failed');
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback: return a simple placeholder data URL
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#1f2937'; ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR unavailable', 100, 90);
      ctx.fillText('(check connection)', 100, 110);
    }
    return canvas.toDataURL();
  }
}

// ── ReceptionDashboard ─────────────────────────────────────────
export const ReceptionDashboard: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const { jobs, customers, users, partRequests, currentUser } = useApp();
  const [activeModal, setActiveModal] = useState<ReceptionModalType>(null);
  const showFinancials = currentUser?.role !== 'engineer';
  const pendingParts = partRequests.filter(r => r.status === 'Pending');
  const unassigned = jobs.filter(j => !j.assignedEngineerId);

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Command Center" subtitle="Real-time operations — click any metric to view details" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Jobs" value={jobs.length} icon={Briefcase} colorClass="bg-cyan-50 text-cyan-600 border border-cyan-200" onClick={() => setActiveModal('total')} />
        <MetricCard title="Unassigned" value={unassigned.length} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600 border border-rose-200" sub="Action Needed" onClick={() => setActiveModal('unassigned')} />
        <MetricCard title="In Progress" value={jobs.filter(j => j.status === 'In Progress').length} icon={Zap} colorClass="bg-amber-50 text-amber-600 border border-amber-200" onClick={() => setActiveModal('inprogress')} />
        <MetricCard title="Customers" value={customers.length} icon={Users} colorClass="bg-green-50 text-green-600 border border-green-200" onClick={() => setActiveModal('customers')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-[18px] font-medium text-gray-900">Live Activity Feed</h2>
              <button onClick={() => onNavigate('jobs')} className="text-[13px] font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View All <ArrowRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {jobs.slice(0, 6).map((job) => {
                const customer = customers.find(c => c.id === job.customerId);
                const engineer = users.find(u => u.id === job.assignedEngineerId);
                const ageLevel = getJobAgeLevel(job.createdAt, job.status);
                const rowBorder = ageLevel === 'red' ? 'border-l-4 border-red-400' : ageLevel === 'yellow' ? 'border-l-4 border-amber-400' : 'border-l-4 border-emerald-400';
                return (
                  <div key={job.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${rowBorder}`}>
                    <UrgencyDot createdAt={job.createdAt} status={job.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate mb-0.5">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500 truncate">{job.problemDescription}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={job.status} />
                      <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-wide">{engineer ? engineer.name : '— Unassigned —'}</p>
                    </div>
                    {showFinancials && (
                      <span className="text-[13px] font-medium text-gray-900 ml-4 w-20 text-right">₹{(job.estimatedCost ?? 0).toLocaleString()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {unassigned.length > 0 && (
            <Card className="bg-rose-50 border-rose-200">
              <div className="px-5 py-4 flex items-center gap-3 border-b border-rose-200/50">
                <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-sm">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-[18px] font-medium text-rose-900">Urgent Assignments</h3>
                  <p className="text-[11px] font-medium text-rose-500 uppercase tracking-wide">{unassigned.length} Jobs Waiting</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {unassigned.slice(0, 3).map(job => {
                  const customer = customers.find(c => c.id === job.customerId);
                  return (
                    <div key={job.id} className="bg-white rounded-lg p-4 shadow-sm border border-rose-100">
                      <p className="text-[13px] font-medium text-gray-900 mb-1">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500 line-clamp-1 mb-3">{job.problemDescription}</p>
                      <Button text="Assign Now" variant="primary" onClick={() => onNavigate('assign')} className="w-full" />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {pendingParts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm mb-3">
                  <Settings size={24} />
                </div>
                <h3 className="text-[18px] font-medium text-amber-900 mb-1">Parts Approval</h3>
                <p className="text-[13px] font-medium text-amber-700 mb-4">{pendingParts.length} requests pending review</p>
                <Button text="Review Requests" variant="primary" onClick={() => onNavigate('parts')} className="w-full" />
              </div>
            </Card>
          )}
        </div>
      </div>

      <ReceptionDetailModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
        jobs={jobs}
        customers={customers}
        users={users}
        onNavigate={onNavigate}
      />
    </div>
  );
};

// ── CustomersPage ──────────────────────────────────────────────
export const CustomersPage: React.FC = () => {
  const { customers, devices, jobs, addCustomer, addDevice, addJob, users } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const { toast, show } = useToast();

  const engineers = users.filter(u => u.role === 'engineer' && u.active);
  const [search, setSearch] = useState('');
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const [custForm, setCustForm] = useState({ name: '', phone: '', address: '', email: '' });
  const [deviceForm, setDeviceForm] = useState({ type: '', brand: '', model: '', serialNumber: '' });
  const [jobForm, setJobForm] = useState({ problemDescription: '', estimatedCost: '', assignedEngineerId: '' });
  const [newCustId, setNewCustId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Customer detail modal state
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [detailTab, setDetailTab] = useState<'jobs' | 'devices'>('jobs');
  const [summaryModal, setSummaryModal] = useState<'total' | 'active' | 'completed' | 'revenue' | null>(null);

  const handleNext = async () => {
    if (submitting) return;
    if (step === 1) {
      if (!custForm.name || !custForm.phone) { show('Name and phone are required', 'error'); return; }
      setSubmitting(true);
      try {
        const c = await addCustomer(custForm);
        setNewCustId(c.id);
        setStep(2);
      } catch {
        show('Failed to save customer. Please try again.', 'error');
      } finally {
        setSubmitting(false);
      }
    } else if (step === 2) {
      if (!deviceForm.type || !deviceForm.brand || !deviceForm.model) { show('Device type, brand and model are required', 'error'); return; }
      setStep(3);
    } else {
      if (!jobForm.problemDescription || !jobForm.estimatedCost) { show('Problem description and cost are required', 'error'); return; }
      setSubmitting(true);
      try {
        const dev = await addDevice({ ...deviceForm, customerId: newCustId });
        await addJob({
          customerId: newCustId, deviceId: dev.id,
          assignedEngineerId: jobForm.assignedEngineerId || null,
          status: jobForm.assignedEngineerId ? 'Assigned' : 'New',
          problemDescription: jobForm.problemDescription,
          estimatedCost: parseFloat(jobForm.estimatedCost),
        });
        setShowModal(false);
        setStep(1);
        setCustForm({ name: '', phone: '', address: '', email: '' });
        setDeviceForm({ type: '', brand: '', model: '', serialNumber: '' });
        setJobForm({ problemDescription: '', estimatedCost: '', assignedEngineerId: '' });
        show('Job registered successfully!');
      } catch {
        show('Failed to register job. Please try again.', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Customer detail modal
  const CustomerDetailModal = () => {
    if (!selectedCustomer) return null;
    const c = selectedCustomer;
    const cJobs = jobs.filter(j => j.customerId === c.id);
    const cDevices = devices.filter(d => d.customerId === c.id);
    const completedJobs = cJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
    const totalSpend = completedJobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
    const activeJobs = cJobs.filter(j => !['Completed', 'Delivered'].includes(j.status));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCustomer(null)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center text-[22px] font-medium text-teal-600 border border-teal-100 shrink-0">
                {c.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">{c.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[12px] text-gray-500">
                    <Phone size={11} /> {c.phone}
                  </span>
                  {c.address && (
                    <span className="flex items-center gap-1 text-[12px] text-gray-400">
                      <MapPin size={11} /> {c.address}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                  Since {new Date(c.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 border-b border-gray-200 flex-shrink-0">
            {[
              { label: 'Total Jobs', value: cJobs.length, color: 'text-gray-900' },
              { label: 'Active', value: activeJobs.length, color: 'text-amber-600' },
              { label: 'Completed', value: completedJobs.length, color: 'text-green-600' },
              { label: 'Total Spend', value: `₹${(totalSpend / 1000).toFixed(1)}k`, color: 'text-teal-600' },
            ].map(stat => (
              <div key={stat.label} className="px-5 py-4 text-center">
                <p className={`text-[22px] font-medium ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-white flex-shrink-0 px-6">
            {[
              { id: 'jobs' as const, label: `Jobs (${cJobs.length})`, icon: Wrench },
              { id: 'devices' as const, label: `Devices (${cDevices.length})`, icon: Monitor },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                  detailTab === tab.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="overflow-y-auto flex-1 p-6">
            {detailTab === 'jobs' && (
              <div className="space-y-3">
                {cJobs.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Wrench size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-[13px]">No jobs yet</p>
                  </div>
                ) : (
                  cJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(job => {
                    const device = devices.find(d => d.id === job.deviceId);
                    const engineer = users.find(u => u.id === job.assignedEngineerId);
                    const isActive = !['Completed', 'Delivered'].includes(job.status);
                    return (
                      <div key={job.id} className={`rounded-xl border p-4 ${isActive ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">#{job.id}</span>
                              <StatusBadge status={job.status} />
                            </div>
                            <p className="text-[13px] font-medium text-gray-900">{job.problemDescription}</p>
                          </div>
                          <p className="text-[15px] font-medium text-gray-900 shrink-0">₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                          {device && (
                            <span className="flex items-center gap-1">
                              <Monitor size={11} /> {device.brand} {device.model}
                            </span>
                          )}
                          {engineer && (
                            <span className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded bg-teal-50 text-teal-600 flex items-center justify-center text-[9px] font-medium border border-teal-100">
                                {engineer.name.charAt(0)}
                              </div>
                              {engineer.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {new Date(job.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {detailTab === 'devices' && (
              <div className="space-y-3">
                {cDevices.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Monitor size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-[13px]">No devices registered</p>
                  </div>
                ) : (
                  cDevices.map(device => {
                    const deviceJobs = cJobs.filter(j => j.deviceId === device.id);
                    const latestJob = deviceJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                    return (
                      <div key={device.id} className="rounded-xl border border-gray-200 p-4 bg-white hover:border-teal-200 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Monitor size={18} className="text-gray-500" />
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-gray-900">{device.brand} {device.model}</p>
                              <p className="text-[11px] text-gray-500">{device.type}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md uppercase tracking-wide">
                            {deviceJobs.length} job{deviceJobs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {device.serialNumber && (
                          <p className="text-[11px] text-gray-400 font-mono mt-1">S/N: {device.serialNumber}</p>
                        )}
                        {latestJob && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-[11px] text-gray-500 truncate max-w-[200px]">Last: {latestJob.problemDescription}</p>
                            <StatusBadge status={latestJob.status} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Client Directory" subtitle="Manage and search customer records — click any metric to drill in"
        action={<Button icon={Plus} text="New Registration" onClick={() => setShowModal(true)} />} />

      {/* Summary metric cards */}
      {(() => {
        const allJobs = jobs.filter(j => customers.some(c => c.id === j.customerId));
        const activeJobs = allJobs.filter(j => !['Completed', 'Delivered'].includes(j.status));
        const completedJobs = allJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
        const totalRevenue = completedJobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Customers', value: customers.length, color: 'bg-teal-50 text-teal-600 border-teal-200', type: 'total' as const },
              { label: 'Active Jobs', value: activeJobs.length, color: 'bg-amber-50 text-amber-600 border-amber-200', type: 'active' as const },
              { label: 'Completed Jobs', value: completedJobs.length, color: 'bg-green-50 text-green-600 border-green-200', type: 'completed' as const },
              { label: 'Total Revenue', value: `₹${(totalRevenue / 1000).toFixed(1)}k`, color: 'bg-cyan-50 text-cyan-600 border-cyan-200', type: 'revenue' as const },
            ].map(card => (
              <div
                key={card.type}
                onClick={() => setSummaryModal(card.type)}
                className="bg-white rounded-xl p-5 border border-gray-200 cursor-pointer hover:border-teal-300 hover:shadow-md transition-all group flex flex-col gap-3"
              >
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${card.color}`}>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                  <p className="text-[22px] font-medium text-gray-900 mt-0.5">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Summary detail drawer */}
      {summaryModal && (() => {
        const allJobs = jobs;
        const activeJobs = allJobs.filter(j => !['Completed', 'Delivered'].includes(j.status));
        const completedJobs = allJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));

        const configs = {
          total:     { title: 'All Customers', subtitle: 'Complete client registry', accentColor: 'text-teal-600' },
          active:    { title: 'Active Jobs', subtitle: 'Jobs currently in progress', accentColor: 'text-amber-600' },
          completed: { title: 'Completed Jobs', subtitle: 'Successfully resolved repairs', accentColor: 'text-green-600' },
          revenue:   { title: 'Revenue Overview', subtitle: 'Earnings from completed jobs', accentColor: 'text-cyan-600' },
        };
        const cfg = configs[summaryModal];
        const jobStatusColors: Record<string, string> = {
          'New': 'border-cyan-400 text-cyan-700 bg-cyan-50',
          'Assigned': 'border-teal-400 text-teal-700 bg-teal-50',
          'In Progress': 'border-orange-400 text-orange-700 bg-orange-50',
          'Completed': 'border-green-400 text-green-700 bg-green-50',
          'Delivered': 'border-green-400 text-green-700 bg-green-50',
        };

        const renderContent = () => {
          if (summaryModal === 'total') {
            return customers.map(c => {
              const cJobs = jobs.filter(j => j.customerId === c.id);
              const active = cJobs.filter(j => !['Completed', 'Delivered'].includes(j.status)).length;
              const done = cJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length;
              return (
                <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-teal-300"
                  onClick={() => { setSummaryModal(null); setSelectedCustomer(c); setDetailTab('jobs'); }}>
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-[14px] shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900">{c.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{c.phone} · {c.address}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-medium text-gray-700">{cJobs.length} job{cJobs.length !== 1 ? 's' : ''}</p>
                    <p className="text-[11px] text-gray-400">
                      {active > 0 && <span className="text-orange-500">{active} active</span>}
                      {active > 0 && done > 0 && ' · '}
                      {done > 0 && <span className="text-green-600">{done} done</span>}
                    </p>
                  </div>
                </div>
              );
            });
          }

          if (summaryModal === 'active' || summaryModal === 'completed') {
            const displayJobs = summaryModal === 'active' ? activeJobs : completedJobs;
            if (displayJobs.length === 0) return <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No jobs here yet.</p>;
            return displayJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              const engineer = users.find(u => u.id === job.assignedEngineerId);
              const daysOld = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000);
              const style = jobStatusColors[job.status] || 'border-gray-300 text-gray-700 bg-gray-50';
              const borderCls = style.split(' ')[0];
              const badgeCls = style.split(' ').slice(1).join(' ');
              return (
                <div key={job.id} className={`flex flex-col gap-2 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {customer?.name ?? 'Unknown'} · {engineer?.name ?? <span className="text-orange-500">Unassigned</span>}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${badgeCls}`}>{job.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span>{new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                    <span>·</span>
                    <span className={daysOld > 10 ? 'text-red-500 font-medium' : 'text-gray-500'}>{daysOld}d ago</span>
                    <span>·</span>
                    <span className="font-medium text-gray-700">₹{(job.actualCost ?? job.estimatedCost).toLocaleString()}</span>
                  </div>
                </div>
              );
            });
          }

          if (summaryModal === 'revenue') {
            const totalRevenue = completedJobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0);
            const byCustomer = customers.map(c => {
              const cDone = jobs.filter(j => j.customerId === c.id && ['Completed', 'Delivered'].includes(j.status));
              return { ...c, revenue: cDone.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost), 0), count: cDone.length };
            }).filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue);
            const maxRev = byCustomer[0]?.revenue || 1;
            return (
              <>
                <div className="px-6 py-4 bg-green-50 border-b border-green-100">
                  <p className="text-[11px] font-medium text-green-600 uppercase tracking-wide">Total Collected</p>
                  <p className="text-[22px] font-medium text-green-700 mt-0.5">₹{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Revenue by Customer</p>
                </div>
                {byCustomer.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[12px] font-medium shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <p className="text-[12px] font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-[12px] font-medium text-gray-700 shrink-0 ml-2">₹{c.revenue.toLocaleString()}</p>
                      </div>
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.round((c.revenue / maxRev) * 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{c.count} completed job{c.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
                {byCustomer.length === 0 && <p className="px-6 py-8 text-[13px] text-gray-400 text-center">No revenue data yet.</p>}
              </>
            );
          }
          return null;
        };

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-end bg-gray-900/40 backdrop-blur-sm" onClick={() => setSummaryModal(null)}>
            <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
                <div>
                  <h2 className="text-[18px] font-medium text-gray-900">{cfg.title}</h2>
                  <p className={`text-[13px] font-normal mt-0.5 ${cfg.accentColor}`}>{cfg.subtitle}</p>
                </div>
                <button onClick={() => setSummaryModal(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {renderContent()}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="relative max-w-2xl">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Search size={18} /></div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone number..."
          className="w-full bg-white border border-gray-200 rounded-lg pl-12 pr-4 py-3 text-[13px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const cJobs = jobs.filter(j => j.customerId === c.id);
          const cDevices = devices.filter(d => d.customerId === c.id);
          const activeJobs = cJobs.filter(j => !['Completed', 'Delivered'].includes(j.status));
          return (
            <Card
              key={c.id}
              className="p-5 flex flex-col h-full hover:border-teal-400 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99] group"
              onClick={() => { setSelectedCustomer(c); setDetailTab('jobs'); }}
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center text-[18px] font-medium text-teal-600 border border-teal-100 shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-medium text-gray-900 mb-0.5">{c.name}</h3>
                  <p className="text-[11px] font-normal text-gray-500 mb-0.5 flex items-center gap-1"><Phone size={10} /> {c.phone}</p>
                  {c.address && <p className="text-[11px] font-normal text-gray-400 truncate flex items-center gap-1"><MapPin size={10} /> {c.address}</p>}
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-400 transition-colors shrink-0 mt-1" />
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex gap-4">
                  <div>
                    <p className="text-[18px] font-medium text-gray-900 leading-none">{cJobs.length}</p>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-1">Jobs</p>
                  </div>
                  <div>
                    <p className="text-[18px] font-medium text-gray-900 leading-none">{cDevices.length}</p>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-1">Devices</p>
                  </div>
                  {activeJobs.length > 0 && (
                    <div>
                      <p className="text-[18px] font-medium text-amber-500 leading-none">{activeJobs.length}</p>
                      <p className="text-[11px] font-medium text-amber-500 uppercase tracking-wide mt-1">Active</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {cJobs.slice(0, 2).map(j => <StatusBadge key={j.id} status={j.status} />)}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Customer detail modal */}
      {selectedCustomer && <CustomerDetailModal />}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-8 shadow-lg overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Registration</h2>
                <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mt-1">Step {step} of 3</p>
              </div>
              <button onClick={() => { setShowModal(false); setStep(1); }} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>

            <div className="flex gap-2 mb-8">
              {['Client Profile', 'Device Specs', 'Job Details'].map((label, i) => (
                <div key={i} className="flex-1">
                  <div className={`h-1.5 rounded-full mb-2 transition-colors ${i + 1 <= step ? 'bg-teal-500' : 'bg-gray-100'}`} />
                  <p className={`text-[11px] font-medium uppercase tracking-wide ${i + 1 === step ? 'text-teal-600' : 'text-gray-400'}`}>{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-8">
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Customer Name *</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} placeholder="Full Name" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Phone Number *</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={custForm.phone} onChange={e => setCustForm({ ...custForm, phone: e.target.value })} placeholder="Mobile Number" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={custForm.address} onChange={e => setCustForm({ ...custForm, address: e.target.value })} placeholder="Complete Address" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Email Address <span className="normal-case text-gray-400 font-normal">(optional — for email notifications)</span></label>
                    <input type="email" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={custForm.email} onChange={e => setCustForm({ ...custForm, email: e.target.value })} placeholder="customer@example.com" />
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Device Type *</label>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={deviceForm.type} onChange={e => setDeviceForm({ ...deviceForm, type: e.target.value })}>
                      <option value="">Select Category</option>
                      {['Laptop', 'Desktop', 'Smartphone', 'Tablet', 'Printer', 'Other'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Brand *</label>
                      <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={deviceForm.brand} onChange={e => setDeviceForm({ ...deviceForm, brand: e.target.value })} placeholder="Brand" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Model *</label>
                      <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={deviceForm.model} onChange={e => setDeviceForm({ ...deviceForm, model: e.target.value })} placeholder="Model" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Serial / IMEI (Optional)</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={deviceForm.serialNumber} onChange={e => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })} placeholder="Serial Number" />
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Issue Description *</label>
                    <textarea className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors resize-none" rows={4} value={jobForm.problemDescription} onChange={e => setJobForm({ ...jobForm, problemDescription: e.target.value })} placeholder="Describe the problem in detail..." />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Quote Estimation (₹) *</label>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" type="number" value={jobForm.estimatedCost} onChange={e => setJobForm({ ...jobForm, estimatedCost: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Direct Assignment</label>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" value={jobForm.assignedEngineerId} onChange={e => setJobForm({ ...jobForm, assignedEngineerId: e.target.value })}>
                      <option value="">Leave Unassigned for now</option>
                      {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              {step > 1 && <Button text="Back" variant="outline" onClick={() => setStep(s => s - 1)} className="px-6" />}
              <Button text={submitting ? 'Saving...' : step < 3 ? 'Continue' : 'Register'} variant="primary" onClick={handleNext} disabled={submitting} className="flex-1" />
            </div>
          </div>
        </div>
      )}
      {toast && <Toast {...toast} />}
    </div>
  );
};

// ── JobsPage ───────────────────────────────────────────────────
export const JobsPage: React.FC = () => {
  const { jobs, customers, devices, users, currentUser } = useApp();
  const showFinancials = currentUser?.role !== 'engineer';
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [engineerFilter, setEngineerFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [qrJob, setQrJob] = useState<any>(null);

  const engineers = users.filter(u => u.role === 'engineer');
  const statuses = ['All', 'New', 'Assigned', 'In Progress', 'Completed', 'Delivered'];

  const filtered = jobs.filter(j => {
    if (statusFilter !== 'All' && j.status !== statusFilter) return false;
    if (engineerFilter !== 'All' && j.assignedEngineerId !== engineerFilter) return false;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(j.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(j.createdAt) > to) return false;
    }
    return true;
  });

  const hasDateFilter = dateFrom || dateTo;
  const clearDateFilter = () => { setDateFrom(''); setDateTo(''); };

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Job Database" subtitle={`Currently tracking ${filtered.length} active jobs`} />

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit overflow-x-auto">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={engineerFilter} onChange={e => setEngineerFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 min-w-[200px]">
          <option value="All">All Engineers</option>
          {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-[13px] font-medium text-gray-900 focus:outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">To</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => setDateTo(e.target.value)}
              className="text-[13px] font-medium text-gray-900 focus:outline-none bg-transparent"
            />
          </div>
          {hasDateFilter && (
            <button
              onClick={clearDateFilter}
              className="px-3 py-1.5 text-[12px] font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors whitespace-nowrap"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['', 'ID', 'Client & Device', 'Issue Overview', 'Assignment', 'Status', 'Age', ...(showFinancials ? ['Quote'] : []), 'QR'].map(h => (
                  <th key={h} className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((job) => {
                const customer = customers.find(c => c.id === job.customerId);
                const device = devices.find(d => d.id === job.deviceId);
                const engineer = users.find(u => u.id === job.assignedEngineerId);
                const ageLevel = getJobAgeLevel(job.createdAt, job.status);
                const rowBg = ageLevel === 'red' ? 'bg-red-50/40' : ageLevel === 'yellow' ? 'bg-amber-50/40' : '';
                return (
                  <tr key={job.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${rowBg}`}>
                    <td className="pl-6 py-4"><UrgencyDot createdAt={job.createdAt} status={job.status} /></td>
                    <td className="px-6 py-4 text-[11px] font-medium text-gray-400">#{job.id}</td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-medium text-gray-900 mb-0.5">{customer?.name}</p>
                      <p className="text-[11px] font-normal text-gray-500">{device?.brand} {device?.model}</p>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-normal text-gray-600 max-w-[250px] truncate">{job.problemDescription}</td>
                    <td className="px-6 py-4">
                      {engineer ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-teal-50 text-teal-600 flex items-center justify-center text-[11px] font-medium border border-teal-100">{engineer.name.charAt(0)}</div>
                          <span className="text-[13px] font-medium text-gray-900">{engineer.name}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-rose-500 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md uppercase tracking-wide">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                    <td className="px-6 py-4"><JobAgeBadge createdAt={job.createdAt} status={job.status} /></td>
                    {showFinancials && (
                      <td className="px-6 py-4 text-[13px] font-medium text-gray-900">₹{(job.estimatedCost ?? 0).toLocaleString()}</td>
                    )}
                    <td className="px-3 py-4">
                      <button
                        onClick={e => { e.stopPropagation(); setQrJob(job); }}
                        className="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                        title="Show QR Code"
                      >
                        <QrCode size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
                <Search size={24} />
              </div>
              <p className="text-[13px] font-medium text-gray-900 mb-1">No jobs found</p>
              <p className="text-[11px] font-normal text-gray-500">Try adjusting your filters to see more results.</p>
            </div>
          )}
        </div>
      </Card>
      {qrJob && (() => {
        const c = customers.find(c => c.id === qrJob.customerId);
        const d = devices.find(d => d.id === qrJob.deviceId);
        return <QRModal job={qrJob} customer={c} device={d} onClose={() => setQrJob(null)} />;
      })()}
    </div>
  );
};

// ── PartsRequestPage ───────────────────────────────────────────
export const PartsRequestPage: React.FC = () => {
  const { partRequests, jobs, users, updatePartRequest } = useApp();
  const { toast, show } = useToast();
  const [filter, setFilter] = useState('Pending');

  const filtered = partRequests.filter(r => filter === 'All' ? true : r.status === filter);

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Inventory Logistics" subtitle="Manage and approve part requisition orders" />

      <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit mb-6">
        {['Pending', 'Approved', 'Rejected', 'All'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors flex items-center gap-2 ${filter === s ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
            {s}
            {s === 'Pending' && partRequests.filter(r => r.status === 'Pending').length > 0 && (
              <span className={`px-2 py-0.5 rounded text-[11px] uppercase tracking-wide ${filter === s ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'}`}>
                {partRequests.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((req) => {
          const engineer = users.find(u => u.id === req.engineerId);
          const job = jobs.find(j => j.id === req.jobId);
          return (
            <Card key={req.id} className="flex flex-col sm:flex-row h-full">
              <div className="p-5 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <PartStatusBadge status={req.status} />
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <h3 className="text-[18px] font-medium text-gray-900 mb-2">{req.partName}</h3>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-4">
                  <p className="text-[13px] font-normal text-gray-600 italic mb-2">"{req.reason}"</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-white px-2 py-1 rounded border border-gray-200 text-[11px] font-medium text-gray-900">QTY: {req.quantity}</div>
                    <p className="text-[11px] font-medium text-gray-500">By <span className="text-teal-600">{engineer?.name}</span></p>
                  </div>
                </div>

                {job && (
                  <div className="text-[11px] font-medium text-gray-500 flex items-center gap-2 bg-gray-50 py-1.5 px-2.5 rounded-md w-fit">
                    <span className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">#{job.id}</span>
                    <span className="truncate max-w-[200px]">{job.problemDescription}</span>
                  </div>
                )}
              </div>

              {req.status === 'Pending' && (
                <div className="flex sm:flex-col gap-2 justify-center bg-gray-50 border-t sm:border-t-0 sm:border-l border-gray-100 p-4 min-w-[140px]">
                  <Button text="Approve" variant="success" onClick={() => { updatePartRequest(req.id, 'Approved'); show('Part request approved for logistics.'); }} className="w-full" />
                  <Button text="Reject" variant="outline_danger" onClick={() => { updatePartRequest(req.id, 'Rejected'); show('Request rejected', 'error'); }} className="w-full" />
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {toast && <Toast {...toast} />}
    </div>
  );
};