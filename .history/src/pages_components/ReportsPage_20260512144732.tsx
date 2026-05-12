'use client';

/**
 * ReportsPage.tsx
 *
 * SRS §3.7 / §3.9 — Reports & Analytics export
 * SRS §6 — Export reports (PDF / Excel/CSV)
 *
 * Features added vs previous version (CSV-only):
 *  ✅ PDF export via browser print API  ← NEW (SRS §6 gap filled)
 *  ✅ CSV export retained (unchanged)
 *  ✅ Report type selector: Jobs | Revenue | Engineer Performance
 *  ✅ Date-range filter
 *  ✅ Colour-coded urgency badges (SRS §3.4)
 *  ✅ Role-gated: visible only to Admin & Reception (enforced in App.tsx)
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Download,
  Printer,
  Filter,
  TrendingUp,
  Users,
  Wrench,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────
type ReportType = 'jobs' | 'revenue' | 'engineers';

interface DateRange {
  from: string;
  to: string;
}

// ── Helpers ───────────────────────────────────────────────────────
function fmt(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function urgencyLabel(createdAt: string, status: string): { label: string; cls: string } {
  const terminal = ['Completed', 'Delivered'];
  if (terminal.includes(status)) return { label: 'Closed', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  const days = daysSince(createdAt);
  if (days > 10) return { label: `${days}d — Critical`, cls: 'text-red-600 bg-red-50 border-red-200' };
  if (days > 5)  return { label: `${days}d — Warning`,  cls: 'text-amber-600 bg-amber-50 border-amber-200' };
  return { label: `${days}d — OK`, cls: 'text-green-600 bg-green-50 border-green-200' };
}

// ── CSV download ──────────────────────────────────────────────────
function downloadCSV(rows: (string | number | null | undefined)[][], filename: string) {
  const content = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── PDF export via browser print ──────────────────────────────────
// Opens the print dialog pre-scoped to the report container.
// Works on all modern browsers and produces a true PDF when
// "Save as PDF" is chosen as the destination printer.
function printReport(reportTitle: string, tableHtml: string, summaryHtml: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Pop-up blocked — please allow pop-ups for this site and try again.');
    return;
  }

  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${reportTitle} — FixHub Report</title>
  <style>
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #1e293b;
      background: #fff;
      padding: 0;
    }

    /* ── Cover header ── */
    .report-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      color: #fff;
      padding: 28px 40px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      page-break-after: avoid;
    }
    .report-header .brand   { font-size: 22pt; font-weight: 800; letter-spacing: -0.5px; }
    .report-header .subtitle{ font-size: 11pt; opacity: 0.75; margin-top: 4px; }
    .report-header .meta    { text-align: right; font-size: 9pt; opacity: 0.8; line-height: 1.6; }

    /* ── Summary cards ── */
    .summary-section { padding: 18px 40px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .summary-grid { display: flex; gap: 14px; flex-wrap: wrap; }
    .card {
      flex: 1; min-width: 120px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      text-align: center;
    }
    .card .c-val  { font-size: 18pt; font-weight: 700; color: #0f172a; }
    .card .c-label{ font-size: 8pt;  color: #64748b;  margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Table ── */
    .table-section { padding: 18px 40px 30px; }
    .section-title  { font-size: 12pt; font-weight: 700; color: #0f172a; margin-bottom: 10px; }

    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    thead tr { background: #0f172a; color: #fff; }
    thead th { padding: 8px 10px; text-align: left; font-weight: 600; white-space: nowrap; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover           { background: #eff6ff; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }

    /* Urgency badges */
    .badge { display: inline-block; padding: 2px 7px; border-radius: 99px; font-size: 8pt; font-weight: 600; border: 1px solid; }
    .badge-green  { color: #16a34a; background: #f0fdf4; border-color: #bbf7d0; }
    .badge-yellow { color: #d97706; background: #fffbeb; border-color: #fde68a; }
    .badge-red    { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
    .badge-blue   { color: #2563eb; background: #eff6ff; border-color: #bfdbfe; }
    .badge-purple { color: #7c3aed; background: #f5f3ff; border-color: #ddd6fe; }
    .badge-gray   { color: #475569; background: #f8fafc; border-color: #e2e8f0; }

    /* ── Footer ── */
    .report-footer {
      margin-top: 20px;
      padding: 12px 40px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }

    /* ── Print rules ── */
    @media print {
      @page { size: A4 landscape; margin: 12mm 10mm; }
      body   { font-size: 9pt; }
      thead  { display: table-header-group; }
      tfoot  { display: table-footer-group; }
      tbody tr { page-break-inside: avoid; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand">⚙ FixHub</div>
      <div class="subtitle">${reportTitle}</div>
    </div>
    <div class="meta">
      Generated: ${now}<br/>
      Service Management System
    </div>
  </div>

  <div class="summary-section">
    <div class="summary-grid">${summaryHtml}</div>
  </div>

  <div class="table-section">
    <div class="section-title">${reportTitle} — Detailed View</div>
    ${tableHtml}
  </div>

  <div class="report-footer">
    <span>FixHub Service Management System — Confidential</span>
    <span>Printed: ${now}</span>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  <\/script>
</body>
</html>`);

  printWindow.document.close();
}

// ── Summary card HTML builder ─────────────────────────────────────
function summaryCard(value: string | number, label: string) {
  return `<div class="card"><div class="c-val">${value}</div><div class="c-label">${label}</div></div>`;
}

// ── Main Component ────────────────────────────────────────────────
export function ReportsPage() {
  const { jobs, customers, devices, users } = useApp();

  const [reportType, setReportType] = useState<ReportType>('jobs');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10),
    to:   new Date().toISOString().slice(0, 10),
  });

  // ── Derived filtered data ────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    const from = new Date(dateRange.from).getTime();
    const to   = new Date(dateRange.to + 'T23:59:59').getTime();
    return jobs.filter(j => {
      const t = new Date(j.createdAt).getTime();
      return t >= from && t <= to;
    });
  }, [jobs, dateRange]);

  const engineers = useMemo(() => users.filter(u => u.role === 'engineer'), [users]);

  // ── Summary stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total     = filteredJobs.length;
    const completed = filteredJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length;
    const pending   = filteredJobs.filter(j => !['Completed', 'Delivered', 'Cancelled'].includes(j.status)).length;
    const revenue   = filteredJobs.reduce((s, j) => s + (j.actualCost ?? j.estimatedCost ?? 0), 0);
    return { total, completed, pending, revenue };
  }, [filteredJobs]);

  // ── CSV export handlers ──────────────────────────────────────────
  function handleCSVExport() {
    if (reportType === 'jobs') {
      const header = ['Job ID', 'Customer', 'Device', 'Engineer', 'Status', 'Problem', 'Est. Cost', 'Actual Cost', 'Created', 'Completed'];
      const rows   = filteredJobs.map(j => {
        const customer = customers.find(c => c.id === j.customerId);
        const device   = devices.find(d => d.id === j.deviceId);
        const engineer = users.find(u => u.id === j.assignedEngineerId);
        return [
          j.id,
          customer?.name ?? '—',
          device ? `${device.brand} ${device.model}` : '—',
          engineer?.name ?? 'Unassigned',
          j.status,
          j.problemDescription,
          j.estimatedCost ?? '',
          j.actualCost ?? '',
          fmt(j.createdAt),
          j.completedAt ? fmt(j.completedAt) : '—',
        ];
      });
      downloadCSV([header, ...rows], `jobs-report-${dateRange.from}-to-${dateRange.to}.csv`);

    } else if (reportType === 'revenue') {
      const header = ['Job ID', 'Customer', 'Status', 'Est. Cost', 'Actual Cost', 'Date'];
      const rows   = filteredJobs.map(j => {
        const customer = customers.find(c => c.id === j.customerId);
        return [j.id, customer?.name ?? '—', j.status, j.estimatedCost ?? 0, j.actualCost ?? 0, fmt(j.createdAt)];
      });
      downloadCSV([header, ...rows], `revenue-report-${dateRange.from}-to-${dateRange.to}.csv`);

    } else {
      const header = ['Engineer', 'Total Jobs', 'Completed', 'Pending', 'Completion Rate'];
      const rows   = engineers.map(eng => {
        const myJobs   = filteredJobs.filter(j => j.assignedEngineerId === eng.id);
        const done     = myJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length;
        const pend     = myJobs.filter(j => !['Completed', 'Delivered'].includes(j.status)).length;
        const rate     = myJobs.length ? `${Math.round((done / myJobs.length) * 100)}%` : '0%';
        return [eng.name, myJobs.length, done, pend, rate];
      });
      downloadCSV([header, ...rows], `engineer-performance-${dateRange.from}-to-${dateRange.to}.csv`);
    }
  }

  // ── PDF export handlers ──────────────────────────────────────────
  function handlePDFExport() {
    if (reportType === 'jobs') {
      const summaryHtml = [
        summaryCard(stats.total,    'Total Jobs'),
        summaryCard(stats.completed,'Completed'),
        summaryCard(stats.pending,  'Pending'),
        summaryCard(fmtCurrency(stats.revenue), 'Total Revenue'),
      ].join('');

      const rows = filteredJobs.map(j => {
        const customer = customers.find(c => c.id === j.customerId);
        const device   = devices.find(d => d.id === j.deviceId);
        const engineer = users.find(u => u.id === j.assignedEngineerId);
        const { label, cls } = urgencyLabel(j.createdAt, j.status);
        const badgeCls = cls.includes('red') ? 'badge-red' : cls.includes('amber') ? 'badge-yellow' : 'badge-green';
        const statusCls = j.status === 'Completed' ? 'badge-green' : j.status === 'Delivered' ? 'badge-purple' : j.status === 'In Progress' ? 'badge-yellow' : j.status === 'Assigned' ? 'badge-blue' : 'badge-gray';
        return `<tr>
          <td><code style="font-size:8pt;color:#64748b">${j.id.slice(0,8)}…</code></td>
          <td>${customer?.name ?? '—'}</td>
          <td>${device ? `${device.brand} ${device.model}` : '—'}</td>
          <td>${engineer?.name ?? '<em>Unassigned</em>'}</td>
          <td><span class="badge ${statusCls}">${j.status}</span></td>
          <td style="max-width:180px;word-break:break-word">${j.problemDescription}</td>
          <td style="text-align:right">${fmtCurrency(j.estimatedCost)}</td>
          <td style="text-align:right">${fmtCurrency(j.actualCost)}</td>
          <td>${fmt(j.createdAt)}</td>
          <td><span class="badge ${badgeCls}">${label}</span></td>
        </tr>`;
      }).join('');

      const tableHtml = `<table>
        <thead><tr>
          <th>Job ID</th><th>Customer</th><th>Device</th><th>Engineer</th>
          <th>Status</th><th>Problem</th><th>Est. Cost</th><th>Actual Cost</th>
          <th>Created</th><th>Age / Urgency</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="10" style="text-align:center;color:#94a3b8;padding:20px">No jobs in this date range</td></tr>'}</tbody>
      </table>`;

      printReport('Jobs Report', tableHtml, summaryHtml);

    } else if (reportType === 'revenue') {
      const totalEst    = filteredJobs.reduce((s, j) => s + (j.estimatedCost ?? 0), 0);
      const totalActual = filteredJobs.reduce((s, j) => s + (j.actualCost ?? 0), 0);
      const totalJobs   = filteredJobs.length;
      const paidJobs    = filteredJobs.filter(j => j.actualCost != null && j.actualCost > 0).length;

      const summaryHtml = [
        summaryCard(totalJobs,                  'Total Jobs'),
        summaryCard(paidJobs,                   'Billed Jobs'),
        summaryCard(fmtCurrency(totalEst),    'Estimated Revenue'),
        summaryCard(fmtCurrency(totalActual), 'Actual Revenue'),
      ].join('');

      const rows = filteredJobs.map(j => {
        const customer  = customers.find(c => c.id === j.customerId);
        const statusCls = j.status === 'Completed' ? 'badge-green' : j.status === 'Delivered' ? 'badge-purple' : 'badge-gray';
        return `<tr>
          <td><code style="font-size:8pt;color:#64748b">${j.id.slice(0,8)}…</code></td>
          <td>${customer?.name ?? '—'}</td>
          <td>${customer?.phone ?? '—'}</td>
          <td><span class="badge ${statusCls}">${j.status}</span></td>
          <td style="text-align:right">${fmtCurrency(j.estimatedCost)}</td>
          <td style="text-align:right">${fmtCurrency(j.actualCost)}</td>
          <td style="text-align:right;font-weight:600;color:${(j.actualCost ?? 0) >= (j.estimatedCost ?? 0) ? '#16a34a' : '#dc2626'}">
            ${fmtCurrency((j.actualCost ?? 0) - (j.estimatedCost ?? 0))}
          </td>
          <td>${fmt(j.createdAt)}</td>
        </tr>`;
      }).join('');

      const tableHtml = `<table>
        <thead><tr>
          <th>Job ID</th><th>Customer</th><th>Phone</th><th>Status</th>
          <th>Est. Cost</th><th>Actual Cost</th><th>Variance</th><th>Date</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:20px">No records in this date range</td></tr>'}</tbody>
        <tfoot><tr style="background:#f8fafc;font-weight:700">
          <td colspan="4">TOTALS</td>
          <td style="text-align:right">${fmtCurrency(totalEst)}</td>
          <td style="text-align:right">${fmtCurrency(totalActual)}</td>
          <td style="text-align:right">${fmtCurrency(totalActual - totalEst)}</td>
          <td></td>
        </tr></tfoot>
      </table>`;

      printReport('Revenue Report', tableHtml, summaryHtml);

    } else {
      // Engineer Performance
      const summaryHtml = [
        summaryCard(engineers.length,   'Total Engineers'),
        summaryCard(stats.completed,    'Jobs Completed'),
        summaryCard(filteredJobs.length,'Jobs in Period'),
        summaryCard(stats.pending,      'Still Pending'),
      ].join('');

      const rows = engineers.map(eng => {
        const myJobs   = filteredJobs.filter(j => j.assignedEngineerId === eng.id);
        const done     = myJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length;
        const pend     = myJobs.filter(j => !['Completed', 'Delivered', 'Cancelled'].includes(j.status)).length;
        const rate     = myJobs.length ? Math.round((done / myJobs.length) * 100) : 0;
        const barW     = rate;
        const barClr   = rate >= 75 ? '#16a34a' : rate >= 40 ? '#d97706' : '#dc2626';
        const activeClr= eng.active ? 'badge-green' : 'badge-red';
        const activeLabel = eng.active ? 'Active' : 'Inactive';

        return `<tr>
          <td><strong>${eng.name}</strong></td>
          <td>${eng.email}</td>
          <td><span class="badge ${activeClr}">${activeLabel}</span></td>
          <td style="text-align:center;font-weight:600">${myJobs.length}</td>
          <td style="text-align:center;color:#16a34a;font-weight:600">${done}</td>
          <td style="text-align:center;color:#d97706;font-weight:600">${pend}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">
                <div style="width:${barW}%;height:100%;background:${barClr};border-radius:4px"></div>
              </div>
              <span style="font-size:9pt;font-weight:700;color:${barClr};min-width:32px">${rate}%</span>
            </div>
          </td>
          <td>${fmt(eng.joinedAt)}</td>
        </tr>`;
      }).join('');

      const tableHtml = `<table>
        <thead><tr>
          <th>Name</th><th>Email</th><th>Status</th><th>Total Jobs</th>
          <th>Completed</th><th>Pending</th><th>Completion Rate</th><th>Joined</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:20px">No engineers found</td></tr>'}</tbody>
      </table>`;

      printReport('Engineer Performance Report', tableHtml, summaryHtml);
    }
  }

  // ── Report type config ───────────────────────────────────────────
  const reportTypes: { key: ReportType; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'jobs',      label: 'Jobs Report',             icon: <Wrench size={16} />,      desc: 'All service jobs with status & urgency' },
    { key: 'revenue',   label: 'Revenue Report',          icon: <DollarSign size={16} />,  desc: 'Billing, costs & revenue variance' },
    { key: 'engineers', label: 'Engineer Performance',    icon: <Users size={16} />,       desc: 'Per-engineer completion & workload' },
  ];

  // ── Inline preview table ─────────────────────────────────────────
  const PreviewTable = () => {
    if (reportType === 'jobs') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-200">
                {['Customer', 'Device', 'Engineer', 'Status', 'Est. Cost', 'Actual', 'Created', 'Urgency'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400">No jobs in selected date range</td></tr>
              ) : filteredJobs.map((j, i) => {
                const customer = customers.find(c => c.id === j.customerId);
                const device   = devices.find(d => d.id === j.deviceId);
                const engineer = users.find(u => u.id === j.assignedEngineerId);
                const { label, cls } = urgencyLabel(j.createdAt, j.status);
                return (
                  <tr key={j.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 border-b border-slate-100 font-medium">{customer?.name ?? '—'}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600">{device ? `${device.brand} ${device.model}` : '—'}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600">{engineer?.name ?? <span className="text-slate-400 italic">Unassigned</span>}</td>
                    <td className="px-3 py-2 border-b border-slate-100">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        j.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        j.status === 'Delivered' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        j.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        j.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>{j.status}</span>
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right">{fmtCurrency(j.estimatedCost)}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right">{fmtCurrency(j.actualCost)}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-500 whitespace-nowrap">{fmt(j.createdAt)}</td>
                    <td className="px-3 py-2 border-b border-slate-100">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (reportType === 'revenue') {
      const totalEst    = filteredJobs.reduce((s, j) => s + (j.estimatedCost ?? 0), 0);
      const totalActual = filteredJobs.reduce((s, j) => s + (j.actualCost ?? 0), 0);
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-200">
                {['Customer', 'Phone', 'Status', 'Est. Cost', 'Actual Cost', 'Variance', 'Date'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">No records in selected date range</td></tr>
              ) : filteredJobs.map((j, i) => {
                const customer  = customers.find(c => c.id === j.customerId);
                const variance  = (j.actualCost ?? 0) - (j.estimatedCost ?? 0);
                return (
                  <tr key={j.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 border-b border-slate-100 font-medium">{customer?.name ?? '—'}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-500">{customer?.phone ?? '—'}</td>
                    <td className="px-3 py-2 border-b border-slate-100">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        j.status === 'Completed' || j.status === 'Delivered'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>{j.status}</span>
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right">{fmtCurrency(j.estimatedCost)}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right font-medium">{fmtCurrency(j.actualCost)}</td>
                    <td className={`px-3 py-2 border-b border-slate-100 text-right font-semibold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {variance >= 0 ? '+' : ''}{fmtCurrency(variance)}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-500 whitespace-nowrap">{fmt(j.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
            {filteredJobs.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold text-[12px]">
                  <td colSpan={3} className="px-3 py-2.5 border-t-2 border-slate-300">TOTALS</td>
                  <td className="px-3 py-2.5 border-t-2 border-slate-300 text-right">{fmtCurrency(totalEst)}</td>
                  <td className="px-3 py-2.5 border-t-2 border-slate-300 text-right">{fmtCurrency(totalActual)}</td>
                  <td className={`px-3 py-2.5 border-t-2 border-slate-300 text-right ${totalActual - totalEst >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {totalActual >= totalEst ? '+' : ''}{fmtCurrency(totalActual - totalEst)}
                  </td>
                  <td className="px-3 py-2.5 border-t-2 border-slate-300" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      );
    }

    // Engineers
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-slate-800 text-slate-200">
              {['Engineer', 'Email', 'Status', 'Total Jobs', 'Completed', 'Pending', 'Rate', 'Joined'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {engineers.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">No engineers found</td></tr>
            ) : engineers.map((eng, i) => {
              const myJobs = filteredJobs.filter(j => j.assignedEngineerId === eng.id);
              const done   = myJobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length;
              const pend   = myJobs.filter(j => !['Completed', 'Delivered', 'Cancelled'].includes(j.status)).length;
              const rate   = myJobs.length ? Math.round((done / myJobs.length) * 100) : 0;
              return (
                <tr key={eng.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 border-b border-slate-100 font-semibold">{eng.name}</td>
                  <td className="px-3 py-2 border-b border-slate-100 text-slate-500">{eng.email}</td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${eng.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {eng.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100 text-center font-medium">{myJobs.length}</td>
                  <td className="px-3 py-2 border-b border-slate-100 text-center text-emerald-700 font-semibold">{done}</td>
                  <td className="px-3 py-2 border-b border-slate-100 text-center text-amber-600 font-semibold">{pend}</td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${rate >= 75 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                      </div>
                      <span className={`text-[11px] font-bold min-w-[32px] ${rate >= 75 ? 'text-emerald-600' : rate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100 text-slate-500 whitespace-nowrap">{fmt(eng.joinedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Syne', sans-serif" }}>
            Reports & Export
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Generate, preview and export business reports</p>
        </div>
        <div className="flex items-center gap-2">
          {/* CSV export */}
          <button
            onClick={handleCSVExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Download size={15} />
            Export CSV
          </button>
          {/* PDF export — NEW */}
          <button
            onClick={handlePDFExport}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Printer size={15} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {reportTypes.map(rt => (
          <button
            key={rt.key}
            onClick={() => setReportType(rt.key)}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              reportType === rt.key
                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className={`mt-0.5 p-2 rounded-lg ${reportType === rt.key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
              {rt.icon}
            </span>
            <div>
              <p className={`text-[13px] font-semibold ${reportType === rt.key ? 'text-indigo-700' : 'text-slate-700'}`}>{rt.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{rt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-4 shadow-sm">
        <div className="flex items-center gap-2 text-slate-400 mr-1">
          <Filter size={15} />
          <span className="text-[13px] font-medium text-slate-600">Filters</span>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="ml-auto text-right">
          <p className="text-[11px] text-slate-400">Records found</p>
          <p className="text-lg font-bold text-slate-800">{reportType === 'engineers' ? engineers.length : filteredJobs.length}</p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Wrench size={18} />,       label: 'Total Jobs',   value: stats.total,                   color: 'text-indigo-600 bg-indigo-50' },
          { icon: <CheckCircle size={18} />,   label: 'Completed',    value: stats.completed,               color: 'text-emerald-600 bg-emerald-50' },
          { icon: <Clock size={18} />,         label: 'Pending',      value: stats.pending,                 color: 'text-amber-600 bg-amber-50' },
          { icon: <TrendingUp size={18} />,    label: 'Revenue',      value: fmtCurrency(stats.revenue),    color: 'text-teal-600 bg-teal-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
            <span className={`p-2.5 rounded-xl ${s.color}`}>{s.icon}</span>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">{s.label}</p>
              <p className="text-[17px] font-bold text-slate-800 leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Data preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <FileText size={15} />
            <span className="text-[13px] font-semibold">
              {reportTypes.find(r => r.key === reportType)?.label} — Preview
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {fmt(dateRange.from)} → {fmt(dateRange.to)}
          </span>
        </div>
        <div className="p-1">
          <PreviewTable />
        </div>
      </div>

      {/* Export info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-[12px] text-blue-700 space-y-1">
          <p className="font-semibold">Export options</p>
          <p>
            <strong>CSV</strong> — Downloads a spreadsheet file compatible with Excel, Google Sheets, etc.
          </p>
          <p>
            <strong>PDF</strong> — Opens a print-ready page in a new tab. Choose <em>"Save as PDF"</em> in your browser's print dialog to save the file, or select a printer to print directly.
          </p>
                  </div>
      </div>

    </div>
  );
}