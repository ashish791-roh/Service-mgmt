import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge, getJobAgeLevel, SLAProgressBar, Toast, useToast } from './ui';
import { X, CheckCircle, Clock, User, ShieldAlert, Star, Activity, AlertCircle, Image as ImageIcon, Upload, ShieldCheck, Edit2, ArrowRightLeft, Save } from 'lucide-react';
import type { ChecklistItem } from '../types';
import { loadWarrantyConfig, getWarrantyDays } from '../lib/warrantyConfig';
import { motion } from 'framer-motion';
import { MotionButton } from './MotionButton';

const drawerVariants = {
  hidden:  { x: '100%', opacity: 0 },
  visible: { x: 0,      opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 38, mass: 0.9 } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] } },
} as const;

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.22 } },
} as const;

export const JobDrawer = ({ jobId, onClose }: { jobId: string, onClose: () => void }) => {
  const { jobs, customers, devices, users, currentUser, updateJobStatus, updateJob, uploadJobPhoto, slaTiers } = useApp();
  const { toast, show } = useToast();
  
  const job = jobs.find(j => j.id === jobId);
  
  // Need this hook before early return
  const [checklist, setChecklist] = useState<ChecklistItem[]>(job?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  const [rating, setRating] = useState<number>(job?.rating || 0);
  const [feedback, setFeedback] = useState<string>(job?.feedback || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Job Edit State (admin/reception) ─────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    problemDescription: job?.problemDescription ?? '',
    estimatedCost: job?.estimatedCost?.toString() ?? '',
    advanceAmount: job?.advanceAmount?.toString() ?? '',
  });
  const [editSaving, setEditSaving] = useState(false);

  // ── Reassign State (admin/reception) ─────────────────────────────
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignEngineerId, setReassignEngineerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignSaving, setReassignSaving] = useState(false);

  if (!job || !currentUser) return null;
  
  const customer = customers.find(c => c.id === job.customerId);
  const device = devices.find(d => d.id === job.deviceId);
  const engineer = users.find(u => u.id === job.assignedEngineerId);
  const ageLevel = getJobAgeLevel(job.createdAt, job.status, device?.type);

  const isEngineer = currentUser.role === 'engineer';
  const isAdminOrReception = currentUser.role === 'admin' || currentUser.role === 'reception';
  const canEditChecklist = isEngineer && job.assignedEngineerId === currentUser.id && job.status !== 'Completed' && job.status !== 'Delivered';
  const canRate = isAdminOrReception && (job.status === 'Completed' || job.status === 'Delivered');
  // Admin/reception can edit job details at any time (except Delivered)
  const canEditJob = isAdminOrReception && job.status !== 'Delivered';
  // Admin/reception can reassign engineer when job is not Completed/Delivered
  const canReassign = isAdminOrReception && !['Completed', 'Delivered'].includes(job.status);
  const activeEngineers = users.filter(u => u.role === 'engineer' && u.active);

  const handleToggleChecklist = async (id: string) => {
    if (!canEditChecklist) return;
    const updated = checklist.map(item => item.id === id ? { ...item, done: !item.done } : item);
    setChecklist(updated);
    await updateJobStatus(job.id, job.status, job.repairNotes, updated, job.rating, job.feedback, job.linkedJobId);
  };

  const handleAddChecklist = async () => {
    if (!newChecklistItem.trim() || !canEditChecklist) return;
    const updated = [...checklist, { id: Date.now().toString(), text: newChecklistItem, done: false }];
    setChecklist(updated);
    setNewChecklistItem('');
    await updateJobStatus(job.id, job.status, job.repairNotes, updated, job.rating, job.feedback, job.linkedJobId);
  };

  const handleSaveCSAT = async () => {
    setSaving(true);
    const res = await updateJobStatus(job.id, job.status, job.repairNotes, checklist, rating, feedback, job.linkedJobId);
    setSaving(false);
    if (res.ok) show('Feedback saved!');
    else show(res.error || 'Failed to save', 'error');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const res = await uploadJobPhoto(job.id, file, type);
    setUploadingPhoto(false);

    if (res.ok) {
      show(`${type === 'before' ? 'Intake' : 'Post-Repair'} photo uploaded successfully!`);
    } else {
      show(res.error || 'Failed to upload photo', 'error');
    }
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    const res = await updateJob(job.id, {
      problemDescription: editForm.problemDescription,
      estimatedCost: parseFloat(editForm.estimatedCost) || 0,
      advanceAmount: editForm.advanceAmount ? parseFloat(editForm.advanceAmount) : undefined,
    });
    setEditSaving(false);
    if (res.ok) {
      show('Job details updated successfully!');
      setEditOpen(false);
    } else {
      show(res.error || 'Failed to update job details', 'error');
    }
  };

  const handleReassign = async () => {
    if (!reassignEngineerId) return;
    setReassignSaving(true);
    const res = await updateJob(job.id, {
      assignedEngineerId: reassignEngineerId,
      reassignReason: reassignReason.trim() || undefined,
    });
    setReassignSaving(false);
    if (res.ok) {
      const eng = activeEngineers.find(e => e.id === reassignEngineerId);
      show(`Job ${engineer ? 'reassigned' : 'assigned'} to ${eng?.name ?? 'engineer'} successfully!`);
      setReassignOpen(false);
      setReassignEngineerId('');
      setReassignReason('');
    } else {
      show(res.error || 'Failed to reassign job', 'error');
    }
  };

  // ── Activity icon/colour helper ───────────────────────────────────
  const getActivityStyle = (action: string) => {
    if (action === 'Job Reassigned') return { dot: 'bg-orange-500', ring: 'bg-orange-50 border-orange-200', text: 'text-orange-700' };
    if (action === 'Engineer Assigned') return { dot: 'bg-teal-500', ring: 'bg-teal-50 border-teal-100', text: 'text-teal-700' };
    if (action === 'Job Details Edited') return { dot: 'bg-blue-500', ring: 'bg-blue-50 border-blue-100', text: 'text-blue-700' };
    return { dot: 'bg-teal-500', ring: 'bg-teal-50 border-teal-100', text: 'text-teal-700' };
  };

  return (
    <>
      <motion.div
        data-drawer
        className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      />
      <motion.div
        data-drawer
        className="fixed top-0 right-0 bottom-0 z-[100] w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden"
        variants={drawerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div>
            <h2 className="text-[18px] font-medium text-gray-900 flex items-center gap-2">
              Job #{job.id.slice(-6).toUpperCase()}
              <StatusBadge status={job.status} />
            </h2>
            <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">
              Created {new Date(job.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEditJob && (
              <button
                onClick={() => { setEditForm({ problemDescription: job.problemDescription ?? '', estimatedCost: job.estimatedCost?.toString() ?? '', advanceAmount: job.advanceAmount?.toString() ?? '' }); setEditOpen(v => !v); setReassignOpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${editOpen ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`}
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            {canReassign && (
              <button
                onClick={() => { setReassignEngineerId(job.assignedEngineerId ?? ''); setReassignReason(''); setReassignOpen(v => !v); setEditOpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${reassignOpen ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-700'}`}
              >
                <ArrowRightLeft size={13} /> {engineer ? 'Reassign' : 'Assign'}
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Edit Job Details Panel ── */}
        {editOpen && canEditJob && (
          <div className="shrink-0 border-b border-blue-200 bg-blue-50 px-6 py-4 space-y-3">
            <p className="text-[12px] font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-2"><Edit2 size={13} /> Edit Job Details</p>
            <div>
              <label className="text-[11px] font-medium text-gray-600 mb-1 block">Problem Description</label>
              <textarea
                rows={3}
                value={editForm.problemDescription}
                onChange={e => setEditForm(f => ({ ...f, problemDescription: e.target.value }))}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 focus:outline-none resize-none bg-white"
                placeholder="Describe the problem..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-600 mb-1 block">Estimated Cost (₹)</label>
                <input
                  type="number"
                  value={editForm.estimatedCost}
                  onChange={e => setEditForm(f => ({ ...f, estimatedCost: e.target.value }))}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 focus:outline-none bg-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-600 mb-1 block">Advance Amount (₹)</label>
                <input
                  type="number"
                  value={editForm.advanceAmount}
                  onChange={e => setEditForm(f => ({ ...f, advanceAmount: e.target.value }))}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 focus:outline-none bg-white"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving || !editForm.problemDescription.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save size={13} /> {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ── Reassign Engineer Panel ── */}
        {reassignOpen && canReassign && (
          <div className="shrink-0 border-b border-orange-200 bg-orange-50 px-6 py-4 space-y-3">
            <p className="text-[12px] font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-2">
              <ArrowRightLeft size={13} /> {engineer ? 'Reassign Engineer' : 'Assign Engineer'}
            </p>
            {engineer && (
              <p className="text-[11px] text-orange-600 bg-orange-100 rounded-lg px-3 py-2 border border-orange-200">
                Currently assigned to: <span className="font-semibold">{engineer.name}</span>
              </p>
            )}
            <div>
              <label className="text-[11px] font-medium text-gray-600 mb-1 block">Select Engineer</label>
              <select
                value={reassignEngineerId}
                onChange={e => setReassignEngineerId(e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:border-orange-400 focus:outline-none bg-white"
              >
                <option value="">Select engineer...</option>
                {activeEngineers.filter(e => e.id !== job.assignedEngineerId).map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600 mb-1 block">
                Reason for {engineer ? 'Reassignment' : 'Assignment'} {engineer && <span className="text-red-500">*</span>}
              </label>
              <textarea
                rows={2}
                value={reassignReason}
                onChange={e => setReassignReason(e.target.value)}
                placeholder={engineer ? 'e.g. Engineer on leave, specialist required, workload balancing...' : 'e.g. Best match for this repair type...'}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:border-orange-400 focus:outline-none resize-none bg-white"
              />
              {engineer && !reassignReason.trim() && (
                <p className="text-[10px] text-orange-600 mt-1">A reason is recommended for audit trail purposes</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReassignOpen(false)} className="px-4 py-2 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={reassignSaving || !reassignEngineerId}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <ArrowRightLeft size={13} /> {reassignSaving ? 'Saving...' : (engineer ? 'Confirm Reassignment' : 'Assign Engineer')}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {ageLevel === 'red' && job.status !== 'Completed' && job.status !== 'Delivered' && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <h4 className="text-[13px] font-medium text-red-800">SLA Breached</h4>
                <p className="text-[11px] text-red-600 mt-1 mb-3">This job has exceeded its {device?.type ?? 'device'} SLA deadline. Engineer and admins have been notified.</p>
                <SLAProgressBar createdAt={job.createdAt} status={job.status} deviceType={device?.type} tiers={slaTiers} />
              </div>
            </div>
          )}
          {ageLevel === 'yellow' && job.status !== 'Completed' && job.status !== 'Delivered' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <h4 className="text-[13px] font-medium text-amber-800">SLA Warning</h4>
                <p className="text-[11px] text-amber-600 mt-1 mb-3">This job is approaching its SLA deadline. Please prioritise resolution.</p>
                <SLAProgressBar createdAt={job.createdAt} status={job.status} deviceType={device?.type} tiers={slaTiers} />
              </div>
            </div>
          )}

          {job.linkedJobId && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <ShieldAlert size={16} />
                <span className="text-[13px] font-medium">Warranty Claim / Rework</span>
              </div>
              <span className="text-[11px] font-medium bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md tracking-wide">
                Ref: #{job.linkedJobId.slice(-6).toUpperCase()}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Customer</p>
              <p className="text-[13px] font-medium text-gray-900">{customer?.name}</p>
              <p className="text-[11px] text-gray-500">{customer?.phone}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Device</p>
              <p className="text-[13px] font-medium text-gray-900">{device?.brand} {device?.model}</p>
              <p className="text-[11px] text-gray-500">{device?.type}</p>
            </div>
          </div>
          
          {engineer && (
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mb-1">Assigned Engineer</p>
                <p className="text-[13px] font-medium text-teal-900 flex items-center gap-2">
                  <User size={14} className="text-teal-600" />
                  {engineer.name}
                </p>
              </div>
            </div>
          )}

          {/* Warranty Certificate — shown when job is Completed or Delivered */}
          {(job.status === 'Completed' || job.status === 'Delivered') && (() => {
            const warrantyEntries = loadWarrantyConfig();
            const days = getWarrantyDays(device?.type, warrantyEntries);
            if (days === 0) return null;
            return (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-teal-900">Warranty Certificate</p>
                    <p className="text-[11px] text-teal-600 mt-0.5">{days}-day warranty issued on completion</p>
                  </div>
                </div>
                <a
                  href={`/api/jobs/${job.id}/warranty`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg transition-colors shrink-0"
                >
                  Download PDF
                </a>
              </div>
            );
          })()}

          <div>
            <h3 className="text-[13px] font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Activity size={16} className="text-gray-400" /> Issue Description
            </h3>
            <p className="text-[13px] text-gray-700 bg-white border border-gray-200 rounded-xl p-4 leading-relaxed">
              {job.problemDescription}
            </p>
          </div>

          {/* Cost info */}
          {isAdminOrReception && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Estimated Cost</p>
                <p className="text-[15px] font-semibold text-gray-900">₹{(job.estimatedCost ?? 0).toLocaleString()}</p>
              </div>
              {(job.advanceAmount ?? 0) > 0 && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Advance Paid</p>
                  <p className="text-[15px] font-semibold text-green-700">₹{(job.advanceAmount ?? 0).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          {/* Checklist Section */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-[13px] font-medium text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-teal-500" /> Repair Checklist
            </h3>
            <div className="space-y-2 mb-3">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleToggleChecklist(item.id)}
                    disabled={!canEditChecklist}
                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 disabled:opacity-50"
                  />
                  <span className={`text-[13px] ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'} flex-1`}>
                    {item.text}
                  </span>
                </div>
              ))}
              {checklist.length === 0 && <p className="text-[11px] text-gray-400 italic">No checklist items added.</p>}
            </div>
            {canEditChecklist && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddChecklist()}
                  placeholder="Add a new task..."
                  className="flex-1 text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none"
                />
                <button onClick={handleAddChecklist} className="bg-teal-50 text-teal-700 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-teal-100 transition-colors">
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Photos Section */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
                <ImageIcon size={16} className="text-blue-500" /> Device Photos
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Before Photos */}
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Intake (Before)</p>
                <div className="space-y-2">
                  {(job.photos || []).filter(p => p.type === 'before').map(p => (
                    <div key={p.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                      <img src={p.url} alt="Before repair" className="w-full h-24 object-cover" />
                    </div>
                  ))}
                  {isEngineer && (
                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload size={16} className="text-gray-400 mb-1" />
                        <p className="text-[10px] text-gray-500 font-medium">Upload Intake</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, 'before')} disabled={uploadingPhoto} />
                    </label>
                  )}
                </div>
              </div>

              {/* After Photos */}
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Post-Repair (After)</p>
                <div className="space-y-2">
                  {(job.photos || []).filter(p => p.type === 'after').map(p => (
                    <div key={p.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                      <img src={p.url} alt="After repair" className="w-full h-24 object-cover" />
                    </div>
                  ))}
                  {isEngineer && (
                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload size={16} className="text-gray-400 mb-1" />
                        <p className="text-[10px] text-gray-500 font-medium">Upload Post-Repair</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, 'after')} disabled={uploadingPhoto} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-[13px] font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-gray-400" /> Activity Timeline
            </h3>
            <div className="space-y-4 pl-2">
              {(job.activities || []).map((act, i) => {
                const actUser = users.find(u => u.id === act.userId);
                const style = getActivityStyle(act.action);
                const isReassignment = act.action === 'Job Reassigned';
                return (
                  <div key={act.id} className="relative flex items-start gap-4">
                    {i !== (job.activities?.length || 0) - 1 && (
                      <div className="absolute top-6 left-[11px] w-0.5 h-full bg-gray-100 -ml-px" />
                    )}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border z-10 ${style.ring}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    </div>
                    <div className={`flex-1 pb-4 ${isReassignment ? `rounded-lg border px-3 py-2 ${style.ring}` : ''}`}>
                      <p className={`text-[13px] font-medium ${isReassignment ? style.text : 'text-gray-900'} flex items-center gap-1.5`}>
                        {isReassignment && <ArrowRightLeft size={12} className={style.text} />}
                        {act.action}
                      </p>
                      {act.details && <p className="text-[11px] text-gray-500 mt-0.5">{act.details}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{new Date(act.createdAt).toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-gray-300">•</span>
                        <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1"><User size={10} /> {actUser?.name || 'System'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!job.activities || job.activities.length === 0) && (
                <p className="text-[11px] text-gray-400 italic">No activities logged yet.</p>
              )}
            </div>
          </div>

          {/* CSAT Section */}
          {canRate && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-[13px] font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Star size={16} className="text-amber-400" /> Customer Satisfaction
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                      <Star size={24} className={rating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Customer feedback notes..."
                  rows={3}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:border-amber-500 focus:outline-none resize-none"
                />
                <MotionButton
                  loading={saving}
                  variant="primary"
                  onClick={handleSaveCSAT}
                  className="w-full"
                >
                  Save Feedback
                </MotionButton>
              </div>
            </div>
          )}
        </div>
      </motion.div>
      {toast && <Toast {...toast} />}
    </>
  );
};