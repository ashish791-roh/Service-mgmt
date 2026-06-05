'use client';

import React, { useEffect, useState } from 'react';
import {
  RefreshCcw,
  Cloud,
  ShieldCheck,
  Upload,
  CheckCircle,
  AlertCircle,
  Trash2,
  Search,
  FileText,
  X,
  Check,
  Edit2,
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Sliders,
  Database,
  Inbox,
  Layers
} from 'lucide-react';
import {
  saveTallySettingsToAPI,
  testTallyConnectionAPI,
  loadTallyStats,
  uploadTallyDocument,
  loadTallyDocuments,
  approveTallyDocument,
  deleteTallyDocument
} from '../lib/tallySettings';
import { motion, AnimatePresence } from 'framer-motion';

interface TallySettingsForm {
  enabled: boolean;
  host: string;
  port: number;
  companyName: string;
  syncStatus: string;
  lastTestedAt?: string;
  mockMode?: boolean;
  autoPushOnApproval?: boolean;
}

interface TallyDashboardStats {
  totalDocuments: number;
  autoApproved: number;
  pushed: number;
  pendingReviews: number;
  failedEntries: number;
  successRate: number;
}

function validateGstinChecksum(gstin: string): boolean {
  if (!gstin || gstin.length !== 15) return false;
  const cleanGstin = gstin.toUpperCase();
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let totalSum = 0;
  for (let i = 0; i < 14; i++) {
    const char = cleanGstin[i];
    const val = chars.indexOf(char);
    if (val === -1) return false;
    const factor = (i % 2 === 0) ? 1 : 2;
    const product = val * factor;
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    totalSum += quotient + remainder;
  }
  const z = totalSum % 36;
  const cVal = (36 - z) % 36;
  return cleanGstin[14] === chars[cVal];
}

export const TallyIntegrationPage: React.FC = () => {
  const [settings, setSettings] = useState<TallySettingsForm>({
    enabled: false,
    host: 'localhost',
    port: 9000,
    companyName: 'FixHub Service Center',
    syncStatus: 'idle',
    mockMode: false,
    autoPushOnApproval: true,
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState<TallyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [documentType, setDocumentType] = useState('invoice');
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>(null);

  // Phase 3 States
  const [currentTab, setCurrentTab] = useState<'queue' | 'dashboard'>('queue');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'pending' | 'pushed' | 'failed' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startEditing = (doc: any) => {
    setEditingDocId(doc.id);
    setEditingData(JSON.parse(JSON.stringify(doc.extractedData)));
  };

  const handleFieldChange = (field: string, val: any) => {
    setEditingData((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    if (!editingData || !editingData.items) return;
    const updatedItems = [...editingData.items];
    const item = { ...updatedItems[index], [field]: val };

    const qty = parseInt(item.quantity, 10) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;

    const baseAmount = qty * rate;
    const wasIntrastate = item.cgst > 0 || item.sgst > 0 || (item.cgst === 0 && item.sgst === 0 && item.igst === 0);

    const halfRate = taxRate / 2 / 100;
    const fullRate = taxRate / 100;

    const cgst = wasIntrastate ? parseFloat((baseAmount * halfRate).toFixed(2)) : 0;
    const sgst = wasIntrastate ? parseFloat((baseAmount * halfRate).toFixed(2)) : 0;
    const igst = !wasIntrastate ? parseFloat((baseAmount * fullRate).toFixed(2)) : 0;
    const taxAmount = parseFloat((cgst + sgst + igst).toFixed(2));
    const total = parseFloat((baseAmount + taxAmount).toFixed(2));

    updatedItems[index] = {
      ...item,
      quantity: qty,
      rate,
      taxRate,
      taxAmount,
      cgst,
      sgst,
      igst,
      total,
    };

    const totalAmount = updatedItems.reduce((sum, it) => sum + it.total, 0);
    setEditingData((prev: any) => ({
      ...prev,
      items: updatedItems,
      totalAmount,
    }));
  };

  const fetchState = async () => {
    setLoading(true);
    try {
      const payload = await loadTallyStats();
      setSettings(payload.settings);
      setStats(payload.stats);
      try {
        const docs = await loadTallyDocuments();
        setDocuments(docs.documents ?? []);
      } catch (e) {
        console.warn('Failed to load documents', e);
      }
    } catch (error) {
      console.error(error);
      setMessage('Unable to load Tally settings and stats.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDocument = async (docId: string, customData?: any, force?: boolean) => {
    try {
      const res = await approveTallyDocument(docId, 'approve', customData, force);
      if (res.ok) {
        const body = await res.json();
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: body.status || 'approved', extractedData: customData || d.extractedData } : d));
        setEditingDocId(null);
        setEditingData(null);
        fetchState();
      } else if (res.status === 409) {
        const body = await res.json();
        if (confirm((body.message || 'Warning: Duplicate document detected.') + "\n\nDo you want to approve this document anyway?")) {
          await handleApproveDocument(docId, customData, true);
        }
      } else {
        const body = await res.json();
        alert(body?.error || 'Failed to approve document.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error during approval.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const res = await deleteTallyDocument(docId);
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
        setDeletingId(null);
        setMessage('Document deleted successfully.');
        setMessageType('success');
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
        fetchState();
      } else {
        const body = await res.json();
        alert(body?.error || 'Failed to delete document.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error during deletion.');
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    try {
      const response = await uploadTallyDocument(file, documentType);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || 'Upload failed');
      }
      setUploadResult(`Uploaded "${file.name}" successfully.`);
      if (body.document?.extractedData) {
        setUploadResult(prev => `${prev} OCR Confidence: ${(body.document.extractedData.confidence * 100).toFixed(0)}%`);
      }
      await fetchState();
    } catch (error) {
      console.error(error);
      setUploadResult(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const updateField = <K extends keyof TallySettingsForm>(key: K, value: TallySettingsForm[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await saveTallySettingsToAPI({
        enabled: settings.enabled,
        host: settings.host,
        port: settings.port,
        companyName: settings.companyName,
        mockMode: !!settings.mockMode,
        autoPushOnApproval: !!settings.autoPushOnApproval,
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error || 'Failed to save settings.');
      }
      setMessage('Tally settings saved successfully.');
      setMessageType('success');
      setTimeout(() => setMessage(null), 3000);
      await fetchState();
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'Save failed.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const response = await testTallyConnectionAPI({
        enabled: settings.enabled,
        host: settings.host,
        port: settings.port,
        companyName: settings.companyName,
        mockMode: settings.mockMode,
      });
      const body = await response.json();
      if (!response.ok || !body.result?.success) {
        throw new Error(body.result?.message || body?.error || 'Connection test failed.');
      }
      setMessage(body.result.message || 'Connection test succeeded.');
      setMessageType('success');
      await fetchState();
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'Connection test failed.');
      setMessageType('error');
    } finally {
      setTesting(false);
    }
  };

  // Filter documents based on search and status
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.extractedData?.invoiceNumber && String(doc.extractedData.invoiceNumber).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.extractedData?.customerName && String(doc.extractedData.customerName).toLowerCase().includes(searchQuery.toLowerCase()));

    if (queueStatusFilter === 'all') return matchesSearch;
    if (queueStatusFilter === 'pending') return matchesSearch && doc.status === 'pending';
    if (queueStatusFilter === 'pushed') return matchesSearch && (doc.status === 'pushed' || doc.status === 'approved');
    if (queueStatusFilter === 'failed') return matchesSearch && (doc.status === 'failed' || doc.status === 'rejected');
    return matchesSearch;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pushed':
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100/60';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-100/60';
      case 'rejected':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-100/60';
    }
  };

  const statsList = [
    { label: 'Total Invoices', value: stats?.totalDocuments ?? 0, icon: FileText, color: 'text-blue-600 bg-blue-50/50 border-blue-100' },
    { label: 'Pending Review', value: stats?.pendingReviews ?? 0, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50/50 border-amber-100' },
    { label: 'Auto Approved', value: stats?.autoApproved ?? 0, icon: CheckCircle, color: 'text-teal-600 bg-teal-50/50 border-teal-100' },
    { label: 'Pushed to Tally', value: stats?.pushed ?? 0, icon: Cloud, color: 'text-emerald-600 bg-emerald-50/50 border-emerald-100' },
    { label: 'Failed Syncs', value: stats?.failedEntries ?? 0, icon: Ban, color: 'text-rose-600 bg-rose-50/50 border-rose-100' },
    { label: 'Sync Success Rate', value: `${stats?.successRate ?? 0}%`, icon: ArrowUpRight, color: 'text-purple-600 bg-purple-50/50 border-purple-100' }
  ];

  if (loading && documents.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-slate-400 font-medium">Loading Tally settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-white border border-gray-150 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 rounded-full border border-teal-100">
              TallyPrime ERP
            </span>
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Database size={12} />
              Company: {settings.companyName || 'Not Set'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">TallyPrime Integration Center</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Configure host sync settings, test real-time connectivity, and review extracted document vouchers.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 relative">
          <button
            onClick={() => setCurrentTab('queue')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 z-10 ${currentTab === 'queue' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <FileText size={14} />
            Document Queue
            {documents.filter(d => d.status === 'pending').length > 0 && (
              <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold animate-pulse">
                {documents.filter(d => d.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 z-10 ${currentTab === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <Sliders size={14} />
            Config & Status
          </button>
        </div>
      </div>

      {/* Floating System Messages */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-2xl border px-4 py-3 text-sm font-medium flex items-center gap-2 shadow-sm ${messageType === 'success'
                ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                : messageType === 'error'
                  ? 'text-rose-700 bg-rose-50 border-rose-100'
                  : 'text-slate-700 bg-slate-50 border-slate-100'
              }`}
          >
            {messageType === 'success' ? <CheckCircle size={16} /> : messageType === 'error' ? <AlertCircle size={16} /> : <ShieldCheck size={16} />}
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {currentTab === 'queue' ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] items-start">
          {/* Main Review and Upload Section */}
          <div className="space-y-6">
            {/* Drag and Drop Uploader Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-3xl border-2 border-dashed p-8 text-center transition-all ${dragActive
                  ? 'border-teal-500 bg-teal-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                } shadow-sm`}
            >
              <input
                id="file-upload-input"
                type="file"
                onChange={handleUpload}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-3">
                <div className={`p-4 rounded-full bg-teal-50 text-teal-600 border border-teal-100 transition-transform ${dragActive ? 'scale-110' : ''}`}>
                  <Upload size={24} />
                </div>
                <div>
                  <label htmlFor="file-upload-input" className="cursor-pointer font-bold text-sm text-teal-600 hover:text-teal-500">
                    Click to upload invoice
                  </label>
                  <span className="text-slate-500 text-sm"> or drag and drop file here</span>
                </div>
                <p className="text-xs text-slate-400">PDF, JPG, PNG up to 10MB (MIME-validated)</p>

                {/* Uploader Document Type Selector */}
                <div className="mt-2 flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/40 text-xs">
                  <span className="px-2 text-slate-500 font-semibold">Classification:</span>
                  <select
                    value={documentType}
                    onChange={e => setDocumentType(e.target.value)}
                    className="bg-white rounded-lg border border-slate-200 px-2 py-0.5 font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="gst-invoice">GST Invoice</option>
                    <option value="supplier-bill">Supplier Bill</option>
                    <option value="receipt">Receipt</option>
                  </select>
                </div>

                {uploading && (
                  <div className="absolute inset-0 bg-white/95 rounded-3xl flex items-center justify-center backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-semibold text-slate-700 animate-pulse">Running OCR & parsing schema...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {uploadResult && (
              <div className="rounded-2xl border border-slate-250 bg-slate-50 p-4 text-xs font-semibold text-slate-750 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  {uploadResult}
                </span>
                <button onClick={() => setUploadResult(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Filter and Search Bar Row */}
            <div className="bg-white rounded-3xl border border-slate-150 p-4 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice number, file, customer name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-teal-500 transition-colors bg-slate-50/50"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Tabs */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/30 text-xs">
                {(['pending', 'pushed', 'failed', 'all'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setQueueStatusFilter(tab)}
                    className={`px-3 py-1.5 font-semibold rounded-md capitalize transition-all ${queueStatusFilter === tab
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {tab === 'pushed' ? 'Pushed/Approved' : tab === 'failed' ? 'Failed/Rejected' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Documents Queue List */}
            <div className="space-y-4">
              {filteredDocuments.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-3 border border-slate-100">
                    <Inbox size={20} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No documents found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    There are no vouchers matching your active filters. Try clearing your search query or uploading a new file.
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredDocuments.map(doc => {
                    const isEditing = editingDocId === doc.id;
                    const confidenceColor = doc.confidence >= 0.9
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                      : doc.confidence >= 0.7
                        ? 'text-amber-700 bg-amber-50 border-amber-100'
                        : 'text-rose-700 bg-rose-50 border-rose-100';

                    return (
                      <motion.div
                        key={doc.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 hover:border-slate-250 transition-colors"
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <div className="flex items-center flex-wrap gap-2">
                              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                                <FileText size={14} className="text-slate-400" />
                                {doc.fileName}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                {doc.documentType}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                              Uploaded {new Date(doc.createdAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Confidence Score */}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${confidenceColor}`}>
                              OCR Score: {((doc.confidence ?? 0) * 100).toFixed(0)}%
                            </span>
                            {/* Status Badge */}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusStyle(doc.status)}`}>
                              {doc.status}
                            </span>
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 text-xs">
                          <div>
                            <p className="font-semibold text-slate-400 text-[10px] uppercase">Invoice Number</p>
                            <p className="font-semibold text-slate-800 mt-1">{doc.extractedData?.invoiceNumber || '—'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-400 text-[10px] uppercase">Invoice Date</p>
                            <p className="font-semibold text-slate-800 mt-1">{doc.extractedData?.invoiceDate || '—'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-400 text-[10px] uppercase">Total Bill</p>
                            <p className="font-bold text-slate-800 mt-1">₹{(doc.extractedData?.totalAmount ?? 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-400 text-[10px] uppercase">Customer / Vendor</p>
                            <p className="font-semibold text-slate-850 mt-1 truncate max-w-[120px]">{doc.extractedData?.customerName || doc.extractedData?.supplierName || '—'}</p>
                          </div>
                        </div>

                        {/* Detailed information row (GSTIN, retry queue) */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {doc.extractedData?.gstNumber && doc.extractedData.gstNumber !== 'UNKNOWN' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-medium">GSTIN:</span>
                              <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">{doc.extractedData.gstNumber}</span>
                              {validateGstinChecksum(doc.extractedData.gstNumber) ? (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/30">Checksum OK</span>
                              ) : (
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/50 animate-pulse">Checksum Error</span>
                              )}
                            </div>
                          )}

                          {doc.retryCount > 0 && doc.status === 'failed' && (
                            <div className="flex items-center gap-1.5 text-rose-600 font-semibold bg-rose-50/50 px-2 py-0.5 rounded border border-rose-100/20">
                              <AlertTriangle size={12} />
                              <span>Retries: {doc.retryCount}/3</span>
                              {doc.nextRetryAt && (
                                <span className="text-[10px] text-slate-400 font-normal">Next retry: {new Date(doc.nextRetryAt).toLocaleTimeString()}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Actions Footer */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                          <div className="flex gap-2">
                            {!isEditing && doc.status === 'pending' && (
                              <button
                                onClick={() => startEditing(doc)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1"
                              >
                                <Edit2 size={12} />
                                Review & Edit
                              </button>
                            )}
                            {!isEditing && doc.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveDocument(doc.id)}
                                  className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-500 transition-colors flex items-center gap-1"
                                >
                                  <Check size={14} />
                                  Approve Voucher
                                </button>
                                <button
                                  onClick={async () => {
                                    const res = await approveTallyDocument(doc.id, 'reject');
                                    if (res.ok) {
                                      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'rejected' } : d));
                                      fetchState();
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 border border-rose-100/50 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>

                          {/* Delete Document Option (Phase 3 Inline Confirm) */}
                          <div className="flex items-center gap-2">
                            {deletingId === doc.id ? (
                              <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-100">
                                <span className="text-[10px] text-rose-700 font-bold px-2">Permanently delete?</span>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-500 text-[11px] font-semibold hover:bg-slate-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(doc.id)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100/40 transition-colors"
                                title="Delete Document"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Review Edit Panel */}
                        {isEditing && editingData && (
                          <div className="border-t border-slate-100 pt-4 mt-3 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Sliders size={12} />
                              Correct Extracted Ledger Fields
                            </h4>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block">
                                <span className="text-[11px] font-semibold text-slate-500">Invoice Number</span>
                                <input
                                  value={editingData.invoiceNumber || ''}
                                  onChange={e => handleFieldChange('invoiceNumber', e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 transition-colors"
                                />
                              </label>
                              <label className="block">
                                <span className="text-[11px] font-semibold text-slate-500">Invoice Date (YYYY-MM-DD)</span>
                                <input
                                  value={editingData.invoiceDate || ''}
                                  onChange={e => handleFieldChange('invoiceDate', e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 transition-colors"
                                />
                              </label>
                              <label className="block">
                                <span className="text-[11px] font-semibold text-slate-500">Customer Name</span>
                                <input
                                  value={editingData.customerName || ''}
                                  onChange={e => handleFieldChange('customerName', e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-500 transition-colors"
                                />
                              </label>
                              <label className="block">
                                <span className="text-[11px] font-semibold text-slate-500">Supplier Name</span>
                                <input
                                  value={editingData.supplierName || ''}
                                  onChange={e => handleFieldChange('supplierName', e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-500 transition-colors"
                                />
                              </label>
                              <label className="block">
                                <span className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                                  <span>GST Number</span>
                                  {editingData.gstNumber && editingData.gstNumber !== 'UNKNOWN' && (
                                    validateGstinChecksum(editingData.gstNumber) ? (
                                      <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-bold border border-emerald-100/30">Checksum OK</span>
                                    ) : (
                                      <span className="text-[9px] text-rose-600 bg-rose-50 px-1 py-0.2 rounded font-bold border border-rose-100/50">Checksum Error</span>
                                    )
                                  )}
                                </span>
                                <input
                                  value={editingData.gstNumber || ''}
                                  onChange={e => handleFieldChange('gstNumber', e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-teal-500 transition-colors"
                                />
                              </label>
                              <label className="block">
                                <span className="text-[11px] font-semibold text-slate-500">Payment Mode</span>
                                <input
                                  value={editingData.paymentMode || ''}
                                  onChange={e => handleFieldChange('paymentMode', e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-500 transition-colors"
                                />
                              </label>
                              <label className="block sm:col-span-2">
                                <span className="text-[11px] font-semibold text-slate-500">Total Amount (₹)</span>
                                <input
                                  type="number"
                                  value={editingData.totalAmount || 0}
                                  onChange={e => handleFieldChange('totalAmount', parseFloat(e.target.value) || 0)}
                                  className="mt-1 w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-500 transition-colors bg-teal-50/10"
                                />
                              </label>
                            </div>

                            {/* Line Items Table */}
                            {editingData.items && editingData.items.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[11px] font-semibold text-slate-500 block">Line Items breakdown</span>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                  {editingData.items.map((item: any, idx: number) => (
                                    <div key={idx} className="p-3 border border-slate-150 rounded-2xl bg-white grid gap-2 sm:grid-cols-[2.5fr_1fr_1.25fr_1.5fr_1.25fr] items-end">
                                      <label className="block">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Item Description</span>
                                        <input value={item.name} onChange={e => handleItemChange(idx, 'name', e.target.value)} className="mt-0.5 w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:border-teal-500 outline-none" />
                                      </label>
                                      <label className="block">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Qty</span>
                                        <input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} className="mt-0.5 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-bold text-slate-800" />
                                      </label>
                                      <label className="block">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Rate (₹)</span>
                                        <input type="number" value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} className="mt-0.5 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-bold text-slate-800" />
                                      </label>
                                      <label className="block">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">GST Bracket</span>
                                        <select value={item.taxRate} onChange={e => handleItemChange(idx, 'taxRate', parseFloat(e.target.value))} className="mt-0.5 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 bg-white cursor-pointer">
                                          <option value="5">5% GST</option>
                                          <option value="12">12% GST</option>
                                          <option value="18">18% GST</option>
                                          <option value="28">28% GST</option>
                                        </select>
                                      </label>
                                      <div className="text-right pb-1 text-xs font-bold text-slate-700">
                                        ₹{item.total?.toFixed(2) ?? '0.00'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Editing Actions */}
                            <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                              <button
                                onClick={() => { setEditingDocId(null); setEditingData(null); }}
                                className="px-4 py-2 rounded-xl border border-slate-250 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleApproveDocument(doc.id, editingData)}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
                              >
                                Save & Approve
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Sidebar Telemetry Block */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Layers size={16} className="text-teal-600" />
                  Stats Board
                </h3>
                <button
                  onClick={fetchState}
                  className="text-xs font-bold text-teal-600 hover:text-teal-500 transition-colors"
                >
                  Sync
                </button>
              </div>

              <div className="grid gap-3">
                <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Review Queue</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.pendingReviews ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                    <AlertTriangle size={16} />
                  </div>
                </div>

                <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pushed Vouchers</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.pushed ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <CheckCircle size={16} />
                  </div>
                </div>

                <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Failed syncs</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.failedEntries ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                    <Ban size={16} />
                  </div>
                </div>

                {/* Accuracy progress bar */}
                <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                    <span>OCR accuracy rate</span>
                    <span className="text-purple-600 font-bold">{stats?.successRate ?? 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats?.successRate ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Audit log reminder */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm text-xs text-slate-500 flex gap-3">
              <ShieldCheck className="text-teal-600 shrink-0 mt-0.5" size={16} />
              <p className="leading-relaxed">
                FixHub tracks all document uploads, voucher approvals, manual corrections, and deletions in the audit logs to maintain absolute compliance.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Configuration and Status Tab */
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-start">
          {/* Settings Panel */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-base text-slate-850 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders size={18} className="text-teal-600" />
              TallyPrime Configuration Settings
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="rounded-2xl border border-slate-250 p-4 bg-slate-50/60 col-span-2">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Enable Background synchronization</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateField('enabled', !settings.enabled)}
                    className={`inline-flex h-9 w-18 items-center rounded-full p-1 transition ${settings.enabled ? 'bg-teal-500' : 'bg-gray-200'}`}
                  >
                    <span className={`h-7 w-7 rounded-full bg-white shadow-sm transition-transform ${settings.enabled ? 'translate-x-9' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-xs font-bold text-slate-700">{settings.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </label>

              <label className="block col-span-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company name</span>
                <input
                  value={settings.companyName}
                  onChange={e => updateField('companyName', e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-250 bg-white px-4 py-2.5 text-xs text-slate-850 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-semibold"
                  placeholder="Tally company name (exact casing)"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tally host</span>
                <input
                  value={settings.host}
                  onChange={e => updateField('host', e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-250 bg-white px-4 py-2.5 text-xs text-slate-850 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-mono font-semibold"
                  placeholder="localhost"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tally port</span>
                <input
                  type="number"
                  min={1}
                  value={settings.port}
                  onChange={e => updateField('port', Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-250 bg-white px-4 py-2.5 text-xs text-slate-850 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-semibold"
                />
              </label>

              <label className="block col-span-2 border border-slate-150 p-4 rounded-2xl bg-slate-50/20">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Features & Simulation</span>
                <div className="space-y-2 text-xs font-semibold text-slate-650">
                  <div className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      id="mock-mode-settings"
                      type="checkbox"
                      checked={!!settings.mockMode}
                      onChange={e => updateField('mockMode', e.target.checked)}
                      className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 outline-none"
                    />
                    <label htmlFor="mock-mode-settings">Enable mock Tally push (Simulate success without local ERP running)</label>
                  </div>
                  <div className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      id="auto-push-settings"
                      type="checkbox"
                      checked={!!settings.autoPushOnApproval}
                      onChange={e => updateField('autoPushOnApproval', e.target.checked)}
                      className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 outline-none"
                    />
                    <label htmlFor="auto-push-settings">Automatically push to TallyPrime when approving documents</label>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                Save configurations
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !settings.enabled}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-250 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
              >
                <RefreshCcw size={14} className={testing ? 'animate-spin' : ''} />
                Run ping test
              </button>
            </div>
          </div>

          {/* Telemetry and Info */}
          <div className="space-y-6">
            {/* Live Stats Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
                <CheckCircle size={16} className="text-teal-600" />
                Connection telemetry
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-semibold text-slate-500">Sync Status</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border ${settings.syncStatus === 'ready'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                    {settings.syncStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-semibold text-slate-500">Last Checked</span>
                  <span className="font-semibold text-slate-700">
                    {settings.lastTestedAt ? new Date(settings.lastTestedAt).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* General Stats overview */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-sm text-slate-850 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
                <Layers size={16} className="text-slate-500" />
                Aggregated system statistics
              </h3>
              <div className="grid gap-3 grid-cols-2">
                {statsList.map(item => (
                  <div key={item.label} className="rounded-2xl border border-slate-150 p-4 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                    <p className="text-lg font-bold text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
