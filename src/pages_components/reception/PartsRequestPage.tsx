import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { PartStatusBadge, Toast, useToast } from '../../components/ui';
import type { PartRequest } from '../../types';

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className = "" }: CardProps) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

interface ButtonProps {
  text: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  variant?: 'primary' | 'success' | 'danger' | 'outline' | 'outline_danger';
  className?: string;
  icon?: React.ComponentType<{ size?: number }>;
}

const Button = ({ text, onClick, variant = 'primary', className = "", icon: Icon }: ButtonProps) => {
  const styles: Record<string, string> = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    outline_danger: "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50",
  };
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

export const PartsRequestPage: React.FC = () => {
  const { partRequests, jobs, users, inventory, updatePartRequest } = useApp();
  const { toast, show } = useToast();
  const [filter, setFilter] = useState('Pending');

  /** Compute inventory availability for a part request at review time */
  const getInventoryAlert = (req: PartRequest) => {
    if (req.inventoryStatus) return req.inventoryStatus as string;
    const item = inventory.find((i) => i.name.toLowerCase() === req.partName.toLowerCase());
    if (!item) return 'not_found';
    if (item.quantity <= 0) return 'out_of_stock';
    if (item.quantity < (item.minStock ?? 5) || item.quantity < req.quantity) return 'low_stock';
    return 'available';
  };

  const InventoryAlertBanner = ({ req }: { req: PartRequest }) => {
    const status = getInventoryAlert(req);
    if (status === 'available') return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
        <span className="text-emerald-600 text-[13px]">✓</span>
        <p className="text-[12px] font-medium text-emerald-700">
          In stock
          {req.inventoryQuantity !== undefined && ` — ${req.inventoryQuantity} units available`}
        </p>
      </div>
    );
    if (status === 'low_stock') return (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
        <p className="text-[12px] font-medium text-amber-700">
          <strong>Low stock</strong>
          {req.inventoryQuantity !== undefined
            ? ` — only ${req.inventoryQuantity} unit(s) available (min: ${req.inventoryMinStock ?? 5}), requested: ${req.quantity}`
            : ` — quantity may be insufficient`}
        </p>
      </div>
    );
    if (status === 'out_of_stock') return (
      <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
        <AlertCircle size={14} className="text-rose-500 shrink-0" />
        <p className="text-[12px] font-medium text-rose-700">
          <strong>Out of stock</strong> — this part is currently unavailable in inventory
        </p>
      </div>
    );
    return (
      <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 mb-3">
        <AlertCircle size={14} className="text-gray-400 shrink-0" />
        <p className="text-[12px] font-medium text-gray-500">
          <strong>Not in inventory</strong> — this part is not listed in the inventory catalogue
        </p>
      </div>
    );
  };

  const filtered = partRequests.filter(r => filter === 'All' ? true : r.status === filter);
  const awaitingCount = partRequests.filter(r => r.status === 'AwaitingStock').length;
  const pendingCount  = partRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6">
      <PageHeader title="Inventory Logistics" subtitle="Manage and approve part requisition orders" />

      {/* ── Awaiting Stock banner ── */}
      {awaitingCount > 0 && (
        <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl px-5 py-4">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={16} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-purple-900">
              {awaitingCount} request{awaitingCount > 1 ? 's' : ''} waiting for stock
            </p>
            <p className="text-[12px] text-purple-600 mt-0.5">
              These parts are not available in inventory. Once stock is added or restocked in the Inventory page, they will automatically move to Pending for your approval.
            </p>
          </div>
        </div>
      )}

      <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit mb-6 flex-wrap gap-1">
        {['Pending', 'AwaitingStock', 'Approved', 'Rejected', 'All'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors flex items-center gap-2 ${filter === s ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
            {s === 'AwaitingStock' ? 'Awaiting Stock' : s}
            {s === 'Pending' && pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded text-[11px] uppercase tracking-wide ${filter === s ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'}`}>
                {pendingCount}
              </span>
            )}
            {s === 'AwaitingStock' && awaitingCount > 0 && (
              <span className={`px-2 py-0.5 rounded text-[11px] uppercase tracking-wide ${filter === s ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-600'}`}>
                {awaitingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-gray-300">
              <AlertCircle size={24} />
            </div>
            <p className="text-[13px] font-medium text-gray-500">No requests in this category</p>
          </div>
        )}
        {filtered.map((req) => {
          const engineer = users.find(u => u.id === req.engineerId);
          const job = jobs.find(j => j.id === req.jobId);
          const isAwaitingStock = req.status === 'AwaitingStock';
          return (
            <Card key={req.id} className={`flex flex-col sm:flex-row h-full ${isAwaitingStock ? 'border-purple-200' : ''}`}>
              <div className="p-5 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <PartStatusBadge status={req.status} />
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <h3 className="text-[18px] font-medium text-gray-900 mb-2">{req.partName}</h3>

                {isAwaitingStock ? (
                  <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 mb-3">
                    <AlertTriangle size={14} className="text-purple-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] font-medium text-purple-700">
                      {req.inventoryStatus === 'out_of_stock'
                        ? <><strong>Out of stock</strong> — 0 units in inventory. Add stock to unblock this request automatically.</>
                        : <><strong>Not in inventory</strong> — this part has no inventory entry. Add it to the inventory catalogue to unblock.</>
                      }
                    </p>
                  </div>
                ) : (
                  <InventoryAlertBanner req={req} />
                )}

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
              {isAwaitingStock && (
                <div className="flex sm:flex-col gap-2 justify-center bg-purple-50 border-t sm:border-t-0 sm:border-l border-purple-100 p-4 min-w-[140px]">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <AlertTriangle size={14} className="text-purple-500" />
                    </div>
                    <p className="text-[11px] font-medium text-purple-600 leading-snug">Waiting for stock</p>
                    <p className="text-[10px] text-purple-400 leading-snug">Auto-releases when inventory is restocked</p>
                  </div>
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
