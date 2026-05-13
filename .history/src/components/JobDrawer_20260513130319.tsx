import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge, getJobAgeLevel, SLAProgressBar, Toast, useToast } from './ui';
import { X, CheckCircle, Clock, User, ShieldAlert, Star, Activity, AlertCircle, Image as ImageIcon, Upload, ShieldCheck } from 'lucide-react';
import type { ChecklistItem } from '../types';
import { loadWarrantyConfig, getWarrantyDays } from '../lib/warrantyConfig';

export const JobDrawer = ({ jobId, onClose }: { jobId: string, onClose: () => void }) => {
  const { jobs, customers, devices, users, currentUser, updateJobStatus, uploadJobPhoto, slaTiers } = useApp();
  const { toast, show } = useToast();
  
  const job = jobs.find(j => j.id === jobId);
  
  // Need this hook before early return
  const [checklist, setChecklist] = useState<ChecklistItem[]>(job?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  const [rating, setRating] = useState<number>(job?.rating || 0);
  const [feedback, setFeedback] = useState<string>(job?.feedback || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  if (!job || !currentUser) return null;
  
  const customer = customers.find(c => c.id === job.customerId);
  const device = devices.find(d => d.id === job.deviceId);
  const engineer = users.find(u => u.id === job.assignedEngineerId);
  const ageLevel = getJobAgeLevel(job.createdAt, job.status, device?.type);

  const isEngineer = currentUser.role === 'engineer';
  const canEditChecklist = isEngineer && job.assignedEngineerId === currentUser.id && job.status !== 'Completed' && job.status !== 'Delivered';
  const canRate = (currentUser.role === 'admin' || currentUser.role === 'reception') && (job.status === 'Completed' || job.status === 'Delivered');

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

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col animate-[slideLeft_0.3s_ease]" onClick={e => e.stopPropagation()}>
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
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

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
                return (
                  <div key={act.id} className="relative flex items-start gap-4">
                    {i !== (job.activities?.length || 0) - 1 && (
                      <div className="absolute top-6 left-[11px] w-0.5 h-full bg-gray-100 -ml-px" />
                    )}
                    <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100 z-10">
                      <div className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-[13px] font-medium text-gray-900">{act.action}</p>
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
                <button
                  onClick={handleSaveCSAT}
                  disabled={saving}
                  className="w-full bg-gray-900 text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Feedback'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {toast && <Toast {...toast} />}
    </div>
  );
};
