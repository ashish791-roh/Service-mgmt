'use client';

import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../components/ui';
import { Button } from './ReceptionUIComponents';
import { X } from 'lucide-react';
import type { Job } from '../../../types';

interface CustomerRegistrationWizardProps {
  onClose: () => void;
  onSuccess: (newJob: Job) => void;
}

export const CustomerRegistrationWizard: React.FC<CustomerRegistrationWizardProps> = ({
  onClose,
  onSuccess,
}) => {
  const { addCustomer, addDevice, addJob, users } = useApp();
  const { show } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [newCustId, setNewCustId] = useState('');

  const [custForm, setCustForm] = useState({ name: '', phone: '', address: '', email: '' });
  const [deviceForm, setDeviceForm] = useState({ type: '', brand: '', model: '', serialNumber: '' });
  const [jobForm, setJobForm] = useState({
    problemDescription: '',
    estimatedCost: '',
    advanceAmount: '',
    assignedEngineerId: '',
    linkedJobId: '',
  });

  const engineers = users.filter((u) => u.role === 'engineer' && u.active);

  const handleNext = async () => {
    if (submitting) return;
    if (step === 1) {
      if (!custForm.name || !custForm.phone) {
        show('Name and phone are required', 'error');
        return;
      }
      setSubmitting(true);
      try {
        const c = await addCustomer(custForm);
        setNewCustId(c.id);
        setStep(2);
      } catch (err) {
        show('Failed to save customer. Please try again.', 'error');
      } finally {
        setSubmitting(false);
      }
    } else if (step === 2) {
      if (!deviceForm.type || !deviceForm.brand || !deviceForm.model) {
        show('Device type, brand and model are required', 'error');
        return;
      }
      setStep(3);
    } else {
      if (!jobForm.problemDescription || !jobForm.estimatedCost) {
        show('Problem description and cost are required', 'error');
        return;
      }
      setSubmitting(true);
      try {
        const dev = await addDevice({ ...deviceForm, customerId: newCustId });
        const newJob = await addJob({
          customerId: newCustId,
          deviceId: dev.id,
          assignedEngineerId: jobForm.assignedEngineerId || null,
          status: jobForm.assignedEngineerId ? 'Assigned' : 'New',
          problemDescription: jobForm.problemDescription,
          estimatedCost: parseFloat(jobForm.estimatedCost),
          advanceAmount: jobForm.advanceAmount ? parseFloat(jobForm.advanceAmount) : undefined,
          linkedJobId: jobForm.linkedJobId || undefined,
        });

        // Callback with the newly created job
        onSuccess(newJob);
      } catch (err) {
        show('Failed to register job. Please try again.', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-8 shadow-lg overflow-hidden relative">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-[18px] font-medium text-gray-900">Registration</h2>
            <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mt-1">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-8">
          {['Client Profile', 'Device Specs', 'Job Details'].map((label, i) => (
            <div key={i} className="flex-1">
              <div
                className={`h-1.5 rounded-full mb-2 transition-colors ${i + 1 <= step ? 'bg-teal-500' : 'bg-gray-100'}`}
              />
              <p
                className={`text-[11px] font-medium uppercase tracking-wide ${
                  i + 1 === step ? 'text-teal-600' : 'text-gray-400'
                }`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4 mb-8">
          {step === 1 && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Customer Name *
                </label>
                <input
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Phone Number *
                </label>
                <input
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  type="tel"
                  maxLength={15}
                  value={custForm.phone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    setCustForm({ ...custForm, phone: v });
                  }}
                  placeholder="Mobile Number"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Address
                </label>
                <input
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  value={custForm.address}
                  onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                  placeholder="Complete Address"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Email Address <span className="normal-case text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  value={custForm.email}
                  onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Device Type *
                </label>
                <select
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  value={deviceForm.type}
                  onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {['Laptop', 'Desktop', 'Smartphone', 'Tablet', 'Printer', 'Other'].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Brand *
                  </label>
                  <input
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                    value={deviceForm.brand}
                    onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })}
                    placeholder="Brand"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Model *
                  </label>
                  <input
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                    value={deviceForm.model}
                    onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })}
                    placeholder="Model"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Serial / IMEI (Optional)
                </label>
                <input
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  value={deviceForm.serialNumber}
                  onChange={(e) => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })}
                  placeholder="Serial Number"
                />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Issue Description *
                </label>
                <textarea
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors resize-none"
                  rows={4}
                  value={jobForm.problemDescription}
                  onChange={(e) => setJobForm({ ...jobForm, problemDescription: e.target.value })}
                  placeholder="Describe the problem in detail..."
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Quote Estimation (₹) *
                </label>
                <input
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  type="number"
                  value={jobForm.estimatedCost}
                  onChange={(e) => setJobForm({ ...jobForm, estimatedCost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Advance / Deposit Collected (₹)
                </label>
                <input
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  type="number"
                  min="0"
                  value={jobForm.advanceAmount}
                  onChange={(e) => setJobForm({ ...jobForm, advanceAmount: e.target.value })}
                  placeholder="0.00 (optional)"
                />
                {jobForm.advanceAmount && parseFloat(jobForm.advanceAmount) > 0 && jobForm.estimatedCost && (
                  <p className="mt-1 text-[11px] text-teal-600 font-medium">
                    Balance due at delivery: ₹
                    {Math.max(
                      parseFloat(jobForm.estimatedCost) - parseFloat(jobForm.advanceAmount),
                      0
                    ).toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Direct Assignment
                </label>
                <select
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  value={jobForm.assignedEngineerId}
                  onChange={(e) => setJobForm({ ...jobForm, assignedEngineerId: e.target.value })}
                >
                  <option value="">Leave Unassigned for now</option>
                  {engineers.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Linked Warranty Job (Optional)
                </label>
                <input
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors font-mono"
                  value={jobForm.linkedJobId}
                  onChange={(e) => setJobForm({ ...jobForm, linkedJobId: e.target.value })}
                  placeholder="e.g. j-123456"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          {step > 1 && <Button text="Back" variant="outline" onClick={() => setStep((s) => s - 1)} className="px-6" />}
          <Button
            text={submitting ? 'Saving...' : step < 3 ? 'Continue' : 'Register'}
            variant="primary"
            onClick={handleNext}
            disabled={submitting}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};
