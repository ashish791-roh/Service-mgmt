import React, { useState } from 'react';
import { Filter, ChevronLeft, ChevronRight, Download, RefreshCw, Clock, Database, AlertCircle } from 'lucide-react';

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

interface AuditLogRow {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string | null;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  meta: string | null;
}

const ENTITY_COLORS: Record<string, string> = {
  job:         'bg-blue-100 text-blue-700',
  customer:    'bg-teal-100 text-teal-700',
  payment:     'bg-green-100 text-green-700',
  user:        'bg-purple-100 text-purple-700',
  inventory:   'bg-orange-100 text-orange-700',
  partRequest: 'bg-yellow-100 text-yellow-700',
};

const ACTION_COLORS: Record<string, string> = {
  create:  'bg-emerald-100 text-emerald-700',
  update:  'bg-sky-100 text-sky-700',
  delete:  'bg-red-100 text-red-700',
  approve: 'bg-green-100 text-green-700',
  reject:  'bg-rose-100 text-rose-700',
};

const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-amber-100 text-amber-700',
  reception: 'bg-teal-100 text-teal-700',
  engineer:  'bg-cyan-100 text-cyan-700',
};

function auditBadge(map: Record<string, string>, value: string, fallback = 'bg-gray-100 text-gray-600') {
  const cls = map[value] ?? fallback;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {value}
    </span>
  );
}

function formatValue(raw: string | null): string {
  if (raw === null || raw === undefined) return '—';
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return JSON.stringify(parsed, null, 1);
    return String(parsed);
  } catch {
    return raw;
  }
}

function formatTs(ts: string): { date: string; time: string } {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
  };
}

function exportToCsv(rows: AuditLogRow[]) {
  const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Entity ID', 'Field', 'Old Value', 'New Value', 'Metadata'];
  
  const escape = (v: string | null) => {
    const clean = (v ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""');
    return `"${clean}"`;
  };

  const capitalize = (s: string | null) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const formatCsvValue = (raw: string | null): string => {
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join('; ');
      }
      return String(parsed);
    } catch {
      return raw;
    }
  };

  const formatTimestampForCsv = (ts: string) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `${dateStr} ${timeStr}`;
  };

  const lines = [
    headers.join(','),
    ...rows.map(r => [
      escape(formatTimestampForCsv(r.timestamp)),
      escape(r.userName),
      escape(capitalize(r.userRole)),
      escape(capitalize(r.action)),
      escape(capitalize(r.entity)),
      escape(r.entityId),
      escape(r.field),
      escape(formatCsvValue(r.oldValue)),
      escape(formatCsvValue(r.newValue)),
      escape(formatCsvValue(r.meta)),
    ].join(',')),
  ];

  const bom = '\ufeff';
  const csvContent = bom + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const AuditLogPage: React.FC = () => {
  const PAGE_SIZE = 50;

  const [rows, setRows]         = useState<AuditLogRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters
  const [search,   setSearch]   = useState('');
  const [entity,   setEntity]   = useState('');
  const [action,   setAction]   = useState('');
  const [userRole, setUserRole] = useState('');
  const [from,     setFrom]     = useState('');
  const [to,       setTo]       = useState('');

  const fetchLogs = React.useCallback(async (pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit',  String(PAGE_SIZE));
      params.set('offset', String(pg * PAGE_SIZE));
      if (search)   params.set('search', search);
      if (entity)   params.set('entity', entity);
      if (action)   params.set('action', action);
      if (from)     params.set('from', new Date(from).toISOString());
      if (to)       params.set('to', new Date(to + 'T23:59:59').toISOString());

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load');
      const data = await res.json();

      // client-side role filter (not exposed as server param)
      let filtered: AuditLogRow[] = data.rows;
      if (userRole) filtered = filtered.filter((r: AuditLogRow) => r.userRole === userRole);

      setRows(filtered);
      setTotal(data.total);
      setOffset(pg * PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [search, entity, action, userRole, from, to]);

  React.useEffect(() => { fetchLogs(0); }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE);

  const handleApply = () => fetchLogs(0);
  const handleReset = () => {
    setSearch(''); setEntity(''); setAction(''); setUserRole(''); setFrom(''); setTo('');
    setTimeout(() => fetchLogs(0), 0);
  };

  const inputCls = "bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-teal-500 transition-colors";
  const selectCls = inputCls;

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader 
        title="Audit Trail" 
        subtitle="Immutable ledger of system updates & actions" 
        action={
          <button 
            disabled={rows.length === 0} 
            onClick={() => exportToCsv(rows)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-lg font-medium text-[13px] transition-colors disabled:opacity-50"
          >
            <Download size={16} /> Export CSV
          </button>
        }
      />

      {/* Filter Control Board */}
      <Card className="bg-gray-50/50 p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-4">
          <Filter size={16} className="text-teal-500" />
          <span>Filter Audit Trail</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search user, notes..." className={inputCls} />
          
          <select value={entity} onChange={e => setEntity(e.target.value)} className={selectCls}>
            <option value="">All Entities</option>
            <option value="job">Job</option>
            <option value="customer">Customer</option>
            <option value="user">User</option>
            <option value="inventory">Inventory</option>
            <option value="payment">Payment</option>
            <option value="partRequest">Part Request</option>
          </select>

          <select value={action} onChange={e => setAction(e.target.value)} className={selectCls}>
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>

          <select value={userRole} onChange={e => setUserRole(e.target.value)} className={selectCls}>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="reception">Reception</option>
            <option value="engineer">Engineer</option>
          </select>

          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} placeholder="From Date" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} placeholder="To Date" />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={handleReset} className="px-4 py-2 text-[12px] font-medium text-gray-500 hover:text-gray-900 transition-colors">
            Reset Filters
          </button>
          <button onClick={handleApply} className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg text-[12px] font-medium transition-colors shadow-sm">
            Apply Filters
          </button>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-[13px] font-medium">{error}</p>
        </div>
      )}

      {/* Main Ledger Table */}
      <Card className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
            <RefreshCw size={24} className="text-teal-600 animate-spin" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Timestamp', 'Identity', 'Action', 'Target Entity', 'Key Field', 'State Diff', ''].map(h => (
                  <th key={h} className="px-6 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const ts = formatTs(row.timestamp);
                const isExpanded = expanded === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr 
                      onClick={() => setExpanded(isExpanded ? null : row.id)}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-gray-400" />
                          <div className="text-[13px]">
                            <p className="font-medium text-gray-900">{ts.date}</p>
                            <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">{ts.time}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[13px]">
                          <p className="font-semibold text-gray-900">{row.userName}</p>
                          <div className="mt-0.5">{auditBadge(ROLE_COLORS, row.userRole)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{auditBadge(ACTION_COLORS, row.action)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Database size={13} className="text-gray-400" />
                          <div className="text-[13px]">
                            <span className="font-medium text-gray-900">{auditBadge(ENTITY_COLORS, row.entity)}</span>
                            {row.entityId && <span className="font-mono text-[11px] text-gray-400 ml-2">#{row.entityId.slice(-8).toUpperCase()}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-semibold text-gray-800 font-mono">{row.field || '—'}</td>
                      <td className="px-6 py-4 max-w-[200px] truncate text-[12px] text-gray-500">
                        {row.newValue ? (
                          <span className="flex items-center gap-1.5 font-mono">
                            <span className="text-rose-500 line-through text-[11px]">{formatValue(row.oldValue)}</span>
                            <span className="text-gray-300">→</span>
                            <span className="text-emerald-600 font-medium text-[11px]">{formatValue(row.newValue)}</span>
                          </span>
                        ) : row.meta ? (
                          <span className="font-medium text-[11px] text-gray-400 font-mono truncate">{row.meta}</span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-[11px] font-semibold text-teal-600 hover:text-teal-700">
                          {isExpanded ? 'Collapse' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={7} className="px-8 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-gray-150 rounded-xl p-5 shadow-sm text-[12px]">
                            <div className="space-y-2">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Ledger References</p>
                              <div className="grid grid-cols-2 gap-y-1 text-gray-700">
                                <span>Record UUID:</span> <span className="font-mono text-gray-900 break-all">{row.id}</span>
                                <span>Actor UUID:</span> <span className="font-mono text-gray-900 break-all">{row.userId}</span>
                                <span>Target UUID:</span> <span className="font-mono text-gray-900 break-all">{row.entityId || '—'}</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Inspection Workspace</p>
                              {row.meta && (
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Metadata payload</p>
                                  <pre className="font-mono text-[10px] text-gray-700 whitespace-pre-wrap">{formatValue(row.meta)}</pre>
                                </div>
                              )}
                              {row.field && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                                    <p className="text-[10px] font-medium text-rose-700 uppercase tracking-wide mb-1">Old State</p>
                                    <pre className="font-mono text-[10.5px] text-rose-800 break-all">{formatValue(row.oldValue)}</pre>
                                  </div>
                                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                    <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide mb-1">New State</p>
                                    <pre className="font-mono text-[10.5px] text-emerald-800 break-all">{formatValue(row.newValue)}</pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <Database size={32} className="mx-auto mb-2 opacity-40 animate-pulse" />
                    <p className="text-[13px] font-medium text-gray-500">No ledger entries match current search filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <p className="text-[12px] text-gray-500 font-medium">
              Page {currentPage + 1} of {totalPages} · {total} entries total
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage <= 0}
                onClick={() => fetchLogs(currentPage - 1)}
                className="flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={currentPage >= totalPages - 1}
                onClick={() => fetchLogs(currentPage + 1)}
                className="flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
