import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wrench, CheckCircle, Bell, Clipboard, Package, Activity, X, Clock, ChevronRight, QrCode, Download, Printer } from 'lucide-react';
import { generateQRCodeDataUrl } from '@/lib/qr';
import type { JobStatus, Job, Customer, Device } from '../types';
import { Toast, useToast, getJobAgeLevel, SLABadge } from '../components/ui';
import { JobDrawer } from '../components/JobDrawer';

// ── UI Component Props ───────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: 'teal' | 'cyan' | 'green' | 'orange';
  sub?: string;
  onClick?: () => void;
}

interface EngineerDetailModalProps {
  type: 'active' | 'pending' | 'completed' | 'overdue' | null;
  onClose: () => void;
  jobs: Job[];
  customers: Customer[];
  devices: Device[];
}

interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'success' | 'outline' | 'warning';
  className?: string;
}

interface QRModalProps {
  job: Job;
  customer?: Customer;
  device?: Device;
  onClose: () => void;
}

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, sub, onClick }) => {
  const colorMap: Record<string, string> = {
    teal: "text-teal-500 bg-teal-50",
    cyan: "text-cyan-500 bg-cyan-50",
    green: "text-green-500 bg-green-50",
    orange: "text-orange-500 bg-orange-50",
  };
  const bgClass = colorMap[color] || colorMap.teal;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border border-gray-200 relative overflow-hidden flex flex-col gap-4 ${onClick ? 'cursor-pointer hover:border-teal-300 hover:shadow-md transition-all group' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="flex items-center gap-2">
          {sub && <span className="bg-gray-100 text-gray-500 text-[11px] font-medium px-2 py-1 rounded-lg">{sub}</span>}
          {onClick && (
            <span className="text-[10px] font-medium text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Details <ChevronRight size={12} />
            </span>
          )}
        </div>
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <h3 className="text-[18px] font-medium text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );
};

// ── Engineer Detail Modal ─────────────────────────────────────────────────────
type EngineerModalType = 'active' | 'pending' | 'completed' | 'overdue' | null;

const EngineerDetailModal: React.FC<EngineerDetailModalProps> = ({
  type, onClose, jobs, customers, devices
}) => {
  if (!type) return null;

  const configs: Record<NonNullable<EngineerModalType>, { title: string; subtitle: string; accentColor: string }> = {
    active:    { title: 'Active Repairs',  subtitle: 'Jobs currently in pipeline',      accentColor: 'text-cyan-600' },
    pending:   { title: 'Pending Jobs',    subtitle: 'Jobs not yet started',            accentColor: 'text-orange-600' },
    completed: { title: 'Completed Jobs',  subtitle: 'Successfully resolved repairs',   accentColor: 'text-green-600' },
    overdue:   { title: 'SLA Breached',    subtitle: 'Jobs that have exceeded their SLA deadline', accentColor: 'text-red-600' },
  };

  const jobStatusColors: Record<string, string> = {
    'New':        'border-cyan-400 text-cyan-700 bg-cyan-50',
    'Assigned':   'border-teal-400 text-teal-700 bg-teal-50',
    'In Progress':'border-orange-400 text-orange-700 bg-orange-50',
    'Completed':  'border-green-400 text-green-700 bg-green-50',
    'Delivered':  'border-green-400 text-green-700 bg-green-50',
  };

  const getFilteredJobs = () => {
    if (type === 'active')    return jobs.filter(j => ['Assigned', 'In Progress'].includes(j.status));
    if (type === 'pending')   return jobs.filter(j => j.status === 'Assigned');
    if (type === 'completed') return jobs.filter(j => ['Completed', 'Delivered'].includes(j.status));
    if (type === 'overdue')   return jobs.filter(j => {
      if (!['Assigned', 'In Progress'].includes(j.status)) return false;
      const device = devices.find(d => d.id === j.deviceId);
      const ageLevel = getJobAgeLevel(j.createdAt, j.status as JobStatus, device?.type);
      return ageLevel === 'red';
    });
    return [];
  };

  const filteredJobs = getFilteredJobs();
  const cfg = configs[type];

  const renderJobRow = (job: Job) => {
    const customer = customers.find((c: Customer) => c.id === job.customerId);
    const device = devices.find((d: Device) => d.id === job.deviceId);
    const daysOld = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000);
    const style = jobStatusColors[job.status] || 'border-gray-300 text-gray-700 bg-gray-50';
    const borderCls = style.split(' ')[0];
    const badgeCls = style.split(' ').slice(1).join(' ');
    const isOverdue = daysOld > 10;
    const isWarning = daysOld > 5 && !isOverdue;

    return (
      <div key={job.id} className={`flex flex-col gap-2 px-6 py-4 border-l-4 ${borderCls} hover:bg-gray-50 transition-colors`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-900 truncate">{job.problemDescription}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {customer?.name ?? 'Unknown'} · {device?.brand} {device?.model}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${badgeCls}`}>{job.status}</span>
            {isOverdue && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700">Overdue</span>}
            {isWarning && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-yellow-100 text-yellow-700">Warning</span>}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-gray-500">
          <span>Created {new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
          <span>·</span>
          <span className={isOverdue ? 'text-red-600 font-semibold' : isWarning ? 'text-yellow-600 font-medium' : 'text-green-600'}>
            {daysOld}d ago
          </span>
          <span>·</span>
          <span className="font-medium text-gray-700">#{job.id}</span>
        </div>
        {job.repairNotes && (
          <p className="text-[11px] text-teal-700 bg-teal-50 rounded px-3 py-2 border border-teal-100">
            📝 {job.repairNotes}
          </p>
        )}
      </div>
    );
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
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <CheckCircle size={32} className="text-gray-300 mb-3" />
              <p className="text-[13px] font-medium text-gray-500">No jobs in this category</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredJobs.map(renderJobRow)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Button: React.FC<ButtonProps> = ({ text, onClick, variant = 'primary', className = "" }) => {
  const styles: Record<string, string> = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    warning: "bg-orange-500 text-white hover:bg-orange-600",
  };
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
      {text}
    </button>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'New': 'bg-cyan-50 text-cyan-700 border-l-2 border-cyan-500',
    'Assigned': 'bg-teal-50 text-teal-700 border-l-2 border-teal-500',
    'In Progress': 'bg-orange-50 text-orange-700 border-l-2 border-orange-500',
    'Completed': 'bg-green-50 text-green-700 border-l-2 border-green-500',
    'Delivered': 'bg-gray-100 text-gray-600 border-l-2 border-gray-400',
  };
  const style = styles[status] || 'bg-gray-50 text-gray-600 border-l-2 border-gray-400';
  return (
    <span className={`px-3 py-1 rounded-r text-[11px] font-medium uppercase tracking-wide inline-block ${style}`}>
      {status}
    </span>
  );
};

const PartStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'Pending': 'bg-orange-50 text-orange-700 border border-orange-200',
    'Approved': 'bg-teal-50 text-teal-700 border border-teal-200',
    'Rejected': 'bg-red-50 text-red-700 border border-red-200',
  };
  const style = styles[status] || 'bg-gray-50 text-gray-600 border border-gray-200';
  return (
    <span className={`px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide inline-block ${style}`}>
      {status}
    </span>
  );
};

// ── QRModal (shared logic, duplicated here to keep files self-contained) ───────
const QRModal: React.FC<QRModalProps> = ({ job, customer, device, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const shortId = job.id.slice(-8).toUpperCase();
  const trackingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/track?job=${job.id}`;

  React.useEffect(() => {
    let active = true;
    setLoading(true);

    generateQRCodeDataUrl(trackingUrl).then(url => {
      if (!active) return;
      setQrDataUrl(url);
      setLoading(false);
    });

    return () => {
      active = false;
    };
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
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { border: 2px solid #000; border-radius: 12px; padding: 24px; max-width: 320px; text-align: center; }
        h2 { margin: 0 0 4px; font-size: 22px; } p { margin: 4px 0; color: #555; font-size: 13px; }
        img { margin: 16px 0; width: 200px; height: 200px; }
        .ref { font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
        .status { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px 12px; display: inline-block; font-size: 12px; font-weight: 600; text-transform: uppercase; }
      </style></head><body>
      <div class="card">
        <h2>FixHub</h2><p>Service Job Tracking</p>
        <img src="${qrDataUrl}" alt="QR Code" />
        <div class="ref">#${shortId}</div>
        <p><strong>${customer?.name ?? ''}</strong></p>
        <p>${device?.brand ?? ''} ${device?.model ?? ''}</p>
        <p style="margin-top:8px">${(job.problemDescription ?? '').slice(0, 60)}</p>
        <div class="status" style="margin-top:12px">${job.status}</div>
      </div></body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-teal-600" />
            <h2 className="text-[16px] font-semibold text-gray-900">Job QR Code</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="w-full bg-gray-50 rounded-lg p-3 border border-gray-100 text-center">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Job Reference</p>
            <p className="text-[20px] font-bold text-gray-900 tracking-widest">#{shortId}</p>
            <p className="text-[13px] font-medium text-gray-700 mt-1">{customer?.name}</p>
            <p className="text-[11px] text-gray-500">{device?.brand} {device?.model}</p>
          </div>
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
          <div className="flex gap-3 w-full">
            <button onClick={handleDownload} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
              <Download size={15} /> Download
            </button>
            <button onClick={handlePrint} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-[13px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
              <Printer size={15} /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export const EngineerDashboard: React.FC = () => {
  const { currentUser, jobs, notifications, markNotificationRead, customers, devices, slaTiers } = useApp();
  const [activeModal, setActiveModal] = useState<EngineerModalType>(null);
  if (!currentUser) return null;

  const myJobs = jobs.filter(j => j.assignedEngineerId === currentUser.id);
  const myNotifs = notifications.filter(n => n.userId === currentUser.id && !n.read);
  const active = myJobs.filter(j => ['Assigned', 'In Progress'].includes(j.status));
  const completed = myJobs.filter(j => ['Completed', 'Delivered'].includes(j.status));

  const pending = myJobs.filter(j => j.status === 'Assigned');
  const overdueCount = active.filter(j => {
    const device = devices.find(d => d.id === j.deviceId);
    return getJobAgeLevel(j.createdAt, j.status, device?.type) === 'red';
  }).length;

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Workspace Overview" subtitle={`Welcome back, ${currentUser.name} — click any card to view details`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MetricCard title="Active Repairs" value={active.length} icon={Wrench} color="cyan" sub="In Pipeline" onClick={() => setActiveModal('active')} />
        <MetricCard title="Pending" value={pending.length} icon={Clock} color="orange" sub="Not Started" onClick={() => setActiveModal('pending')} />
        <MetricCard title="Completed" value={completed.length} icon={CheckCircle} color="green" sub="Total" onClick={() => setActiveModal('completed')} />
        <MetricCard title="Overdue" value={overdueCount} icon={Bell} color="orange" sub={overdueCount > 0 ? "SLA Breached" : ""} onClick={() => setActiveModal('overdue')} />
      </div>

      {myNotifs.length > 0 && (
        <Card className="bg-orange-50 border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <h3 className="text-[13px] font-medium text-gray-900">Recent Alerts</h3>
          </div>
          <div className="space-y-2">
            {myNotifs.map((n) => (
              <div key={n.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-orange-100">
                <p className="text-[13px] font-normal text-gray-700">{n.message}</p>
                <button onClick={() => markNotificationRead(n.id)} className="text-[11px] bg-orange-100 text-orange-700 px-3 py-1 rounded-md hover:bg-orange-200 font-medium uppercase tracking-wide ml-4 shrink-0 transition-colors">
                  Mark read
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-[13px] font-medium text-gray-900">Active Job Pipeline</h2>
        </div>
        {active.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
              <CheckCircle size={24} />
            </div>
            <p className="text-[13px] font-medium text-gray-900 mb-1">Queue Empty</p>
            <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">You are completely caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {active.map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              const device = devices.find(d => d.id === job.deviceId);
              const ageLevel = getJobAgeLevel(job.createdAt, job.status, device?.type);
              const borderColor = ageLevel === 'red' ? 'border-red-400' : ageLevel === 'yellow' ? 'border-amber-400' : 'border-teal-400';
              return (
                <div key={job.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${borderColor}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded">#{job.id}</span>
                      <StatusBadge status={job.status} />
                      <SLABadge
                        createdAt={job.createdAt}
                        status={job.status}
                        deviceType={device?.type}
                        tiers={slaTiers}
                      />
                    </div>
                    <p className="text-[13px] font-medium text-gray-900 mb-0.5">{customer?.name}</p>
                    <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide mb-2">{device?.brand} {device?.model} {device?.type ? `· ${device.type}` : ''}</p>
                    <p className="text-[13px] font-normal text-gray-600 max-w-2xl">{job.problemDescription}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <EngineerDetailModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
        jobs={myJobs}
        customers={customers}
        devices={devices}
      />
    </div>
  );
};

export const MyJobsPage: React.FC = () => {
  const { currentUser, jobs, customers, devices, partRequests, inventory, updateJobStatus, addPartRequest } = useApp();
  const [selectedJob, setSelectedJob] = useState<{ id: string; hasPendingParts: boolean } | null>(null);
  const [showPartModal, setShowPartModal] = useState<string | null>(null);
  const [selectedDrawerJobId, setSelectedDrawerJobId] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{ status: string; notes: string }>({ status: '', notes: '' });
  const [partForm, setPartForm] = useState({ partName: '', quantity: '1', reason: '' });
  const [qrJob, setQrJob] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast, show } = useToast();

  if (!currentUser) return null;
  const myJobs = jobs.filter(j => j.assignedEngineerId === currentUser.id);

  const JOB_STATUSES: JobStatus[] = ['Assigned', 'In Progress', 'Completed'];

  const handleStatusUpdate = async (jobId: string) => {
    if (!statusUpdate.status) { show('Please select a status', 'error'); return; }
    const result = await updateJobStatus(jobId, statusUpdate.status as JobStatus, statusUpdate.notes);
    if (result.ok) {
      setSelectedJob(null);
      show('Job status updated successfully!', 'success');
    } else {
      show(result.error ?? 'Failed to update status', 'error');
    }
  };

  const handlePartRequest = (jobId: string) => {
    if (!partForm.partName || !partForm.reason) { show('Please fill all required fields', 'error'); return; }
    addPartRequest({ jobId, engineerId: currentUser.id, ...partForm, quantity: parseInt(partForm.quantity) });
    setShowPartModal(null);
    setPartForm({ partName: '', quantity: '1', reason: '' });
    show('Parts request submitted successfully!', 'success');
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Job Queue" subtitle="Manage repairs and order parts" />

      {myJobs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Clipboard size={24} />
          </div>
          <p className="text-[18px] font-medium text-gray-900 mb-1">No jobs assigned</p>
          <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">Jobs will appear here once dispatched.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {myJobs.map((job) => {
            const customer = customers.find(c => c.id === job.customerId);
            const device = devices.find(d => d.id === job.deviceId);
            const myPartReqs = partRequests.filter(r => r.jobId === job.id);
            const hasPendingParts = myPartReqs.some(r => r.status === 'Pending' || r.status === 'AwaitingStock');
            const isCompleted = ['Completed', 'Delivered'].includes(job.status);
            
            return (
              <Card key={job.id} className="flex flex-col">
                <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4 bg-gray-50/50">
                  <div className="w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide bg-gray-200 px-2 py-1 rounded">#{job.id}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-[18px] font-medium text-gray-900">{customer?.name}</h3>
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">📞 {customer?.phone}</span>
                    </div>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{device?.brand} {device?.model} • {device?.type}</p>
                  </div>
                </div>

                <div className="p-5 flex-1 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Activity size={12} /> Issue Description
                    </p>
                    <p className="text-[13px] font-normal text-gray-700">{job.problemDescription}</p>
                  </div>
                  
                  {job.repairNotes && (
                    <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                      <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mb-1">Repair Notes</p>
                      <p className="text-[13px] font-normal text-teal-900">{job.repairNotes}</p>
                    </div>
                  )}

                  {myPartReqs.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Package size={12} /> Parts Ordered
                      </p>
                      <div className="flex flex-col gap-2">
                        {myPartReqs.map(r => (
                          <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                            <span className="font-medium text-[13px] text-gray-700">{r.partName} <span className="text-gray-400 ml-1">×{r.quantity}</span></span>
                            <div className="flex items-center gap-2 shrink-0">
                              {r.status === 'Pending' && r.inventoryStatus && r.inventoryStatus !== 'available' && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  r.inventoryStatus === 'out_of_stock' ? 'bg-rose-100 text-rose-600' :
                                  r.inventoryStatus === 'low_stock' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {r.inventoryStatus === 'out_of_stock' ? 'Out of stock' :
                                   r.inventoryStatus === 'low_stock' ? 'Low stock' : 'Not in inventory'}
                                </span>
                              )}
                              <PartStatusBadge status={r.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                      {hasPendingParts && (
                        <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                        <p className="text-[11px] font-medium text-amber-700">
                            Parts pending approval — you cannot mark this job as Completed until reception approves or rejects all part requests.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-5 bg-gray-50 border-t border-gray-200 flex gap-3">
                  {!isCompleted ? (
                    <>
                      <Button text="Open Workspace" variant="primary" onClick={() => setSelectedDrawerJobId(job.id)} className="flex-1" />
                      <Button text="Update Status" variant="outline" onClick={() => { setSelectedJob({ id: job.id, hasPendingParts }); setStatusUpdate({ status: job.status, notes: job.repairNotes ?? '' }); }} />
                      <Button text="Order Part" variant="warning" onClick={() => setShowPartModal(job.id)} className="flex-1" />
                    </>
                  ) : (
                    <div className="w-full text-center py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide bg-gray-200 rounded-lg">
                      Job Concluded
                    </div>
                  )}
                  <button
                    onClick={() => setQrJob(job)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors shrink-0"
                    title="Show QR Code"
                  >
                    <QrCode size={18} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-[18px] font-medium text-gray-900">Update Status</h2>
              <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedJob.hasPendingParts && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                  <p className="text-[11px] font-medium text-amber-700">
                    Parts pending approval — <strong>Completed</strong> is disabled until reception approves or rejects all part requests.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">New Status *</label>
                <select 
                  value={statusUpdate.status} onChange={e => setStatusUpdate(s => ({ ...s, status: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500"
                >
                  <option value="" disabled>Select phase...</option>
                  {JOB_STATUSES.map(s => (
                    <option
                      key={s}
                      value={s}
                      disabled={s === 'Completed' && selectedJob.hasPendingParts}
                    >
                      {s === 'Completed' && selectedJob.hasPendingParts ? 'Completed (pending parts approval)' : s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Repair Notes (Optional)</label>
                <textarea 
                  value={statusUpdate.notes} onChange={e => setStatusUpdate(s => ({ ...s, notes: e.target.value }))}
                  placeholder="Log technical details or issues..." rows={4}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-normal text-gray-700 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button text="Cancel" variant="outline" onClick={() => setSelectedJob(null)} className="w-full" />
              <Button text="Save Update" variant="success" onClick={() => handleStatusUpdate(selectedJob.id)} className="w-full" />
            </div>
          </div>
        </div>
      )}

      {showPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-[18px] font-medium text-gray-900">Order Parts</h2>
              <button onClick={() => setShowPartModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Part Name *</label>
                <input 
                  value={partForm.partName} 
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onChange={e => {
                    setPartForm(f => ({ ...f, partName: e.target.value }));
                    setShowSuggestions(true);
                  }} 
                  placeholder="e.g. iPhone 13 Screen Assembly"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-orange-500" 
                />
                
                {/* Autocomplete Dropdown */}
                {showSuggestions && partForm.partName.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto">
                    {(() => {
                      const matches = inventory.filter(i => i.name.toLowerCase().includes(partForm.partName.toLowerCase()));
                      if (matches.length === 0) return (
                         <div className="px-3 py-2 text-[12px] text-gray-500 italic">No matching parts in inventory.</div>
                      );
                      return matches.map(item => (
                        <div 
                          key={item.id}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                          onClick={() => {
                            setPartForm(f => ({ ...f, partName: item.name }));
                            setShowSuggestions(false);
                          }}
                        >
                          <span className="text-[13px] font-medium text-gray-900">{item.name}</span>
                          {item.quantity > 0 ? (
                            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">In Stock ({item.quantity})</span>
                          ) : (
                            <span className="text-[11px] font-medium text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">Out of Stock</span>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Quantity *</label>
                <input type="number" min="1" value={partForm.quantity} onChange={e => setPartForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Reason / Diagnostics *</label>
                <textarea value={partForm.reason} onChange={e => setPartForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why is this component required?" rows={3}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-normal text-gray-700 focus:outline-none focus:border-orange-500 resize-none" />
              </div>

              {/* ── Non-blocking inventory awareness notice ── */}
              {partForm.partName.trim().length > 0 && (() => {
                const match = inventory.find(i => i.name.toLowerCase() === partForm.partName.toLowerCase().trim());
                const requested = parseInt(partForm.quantity) || 1;
                if (!match) return (
                  <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-gray-400 shrink-0 mt-0.5">ℹ</span>
                    <p className="text-[12px] font-medium text-gray-500">
                      This part has been <strong>Assigned</strong>. Your request will still be submitted for admin review.
                    </p>
                  </div>
                );
                if (match.quantity <= 0) return (
                  <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    <span className="text-rose-500 shrink-0 mt-0.5">⚠</span>
                    <p className="text-[12px] font-medium text-rose-700">
                      <strong>Out of stock</strong> — 0 units available. Admin will be alerted when you submit.
                    </p>
                  </div>
                );
                if (match.quantity < (match.minStock ?? 5) || match.quantity < requested) return (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
                    <p className="text-[12px] font-medium text-amber-700">
                      <strong>Low stock</strong> — only {match.quantity} unit(s) available{requested > match.quantity ? `, but you requested ${requested}` : ''}. Admin will be alerted.
                    </p>
                  </div>
                );
                return null;
              })()}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button text="Cancel" variant="outline" onClick={() => setShowPartModal(null)} className="w-full" />
              <Button text="Submit Request" variant="warning" onClick={() => handlePartRequest(showPartModal)} className="w-full" />
            </div>
          </div>
        </div>
      )}
      {qrJob && (() => {
        const c = customers.find(c => c.id === qrJob.customerId);
        const d = devices.find(d => d.id === qrJob.deviceId);
        return <QRModal job={qrJob} customer={c} device={d} onClose={() => setQrJob(null)} />;
      })()}
      {selectedDrawerJobId && <JobDrawer jobId={selectedDrawerJobId} onClose={() => setSelectedDrawerJobId(null)} />}
      {toast && <Toast {...toast} />}
    </div>
  );
};