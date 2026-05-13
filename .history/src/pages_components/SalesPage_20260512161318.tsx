import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingCart, Plus, X, Search, Package, TrendingUp,
  DollarSign, AlertTriangle, ChevronDown, ChevronRight,
  User, Phone, FileText, CheckCircle, Trash2,
} from 'lucide-react';
import type { Sale } from '../types';

// ── Shared UI primitives ─────────────────────────────────────────

const PageHeader = ({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const MetricCard = ({ title, value, icon: Icon, color, sub }: any) => {
  const colorMap: Record<string, string> = {
    teal: 'text-teal-500 bg-teal-50',
    green: 'text-green-500 bg-green-50',
    orange: 'text-orange-500 bg-orange-50',
    purple: 'text-purple-500 bg-purple-50',
  };
  const bgClass = colorMap[color] || colorMap.teal;
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        {sub && <span className="bg-gray-100 text-gray-500 text-[11px] font-medium px-2 py-1 rounded-lg">{sub}</span>}
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <h3 className="text-[18px] font-medium text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );
};

const Button = ({ text, onClick, variant = 'primary', className = '', icon: Icon, disabled }: any) => {
  const styles: any = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50',
    success: 'bg-green-500 text-white hover:bg-green-600 disabled:opacity-50',
    outline: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = 'text', required }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[12px] font-medium text-gray-600 uppercase tracking-wide">
      {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-400"
    />
  </div>
);

// ── New Sale Modal ────────────────────────────────────────────────

interface LineItem {
  inventoryItemId: string;
  quantity: number;
}

interface NewSaleModalProps {
  onClose: () => void;
  onCreated: (sale: Sale) => void;
}

const NewSaleModal: React.FC<NewSaleModalProps> = ({ onClose, onCreated }) => {
  const { inventory, customers, addSale, deleteCustomer } = useApp() as any;

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ inventoryItemId: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Deduplicate customers: keep only the first record per unique name+phone combo
  const uniqueCustomers = useMemo(() => {
    const seen = new Set<string>();
    return (customers as any[]).filter((c: any) => {
      const key = `${c.name.trim().toLowerCase()}|${c.phone.trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [customers]);

  const selectedCustomer = uniqueCustomers.find((c: any) => c.id === customerId);

  const handleDeleteCustomer = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    setDeleteError('');
    // Delete all duplicate records with the same name+phone
    const toDelete = (customers as any[]).filter((c: any) => {
      const target = uniqueCustomers.find((u: any) => u.id === deleteConfirmId);
      return target &&
        c.name.trim().toLowerCase() === target.name.trim().toLowerCase() &&
        c.phone.trim() === target.phone.trim();
    });
    let lastError = '';
    for (const c of toDelete) {
      const result = await deleteCustomer(c.id);
      if (!result.ok) lastError = result.error ?? 'Failed to delete customer.';
    }
    setDeleting(false);
    if (lastError) { setDeleteError(lastError); return; }
    setDeleteConfirmId('');
    setCustomerId('');
  };

  const availableItems = (inventory as any[]).filter(i => i.quantity > 0);

  const addLine = () => setLineItems(prev => [...prev, { inventoryItemId: '', quantity: 1 }]);
  const removeLine = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));

  const updateLine = (idx: number, field: keyof LineItem, val: string | number) => {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const getInvItem = (id: string) => (inventory as any[]).find(i => i.id === id);

  const total = lineItems.reduce((sum, li) => {
    const inv = getInvItem(li.inventoryItemId);
    return sum + (inv ? inv.unitCost * li.quantity : 0);
  }, 0);

  const handleSubmit = async () => {
    setError('');
    const validLines = lineItems.filter(li => li.inventoryItemId && li.quantity > 0);
    if (validLines.length === 0) {
      setError('Please add at least one item with a valid quantity.');
      return;
    }
    if (!companyName.trim() && !contactName.trim()) {
      setError('Please enter a company name or contact name.');
      return;
    }

    setSubmitting(true);
    const result = await addSale({
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      customerId: customerId || undefined,
      items: validLines.map(li => ({ inventoryItemId: li.inventoryItemId, quantity: Number(li.quantity) })),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Failed to create sale.');
      return;
    }
    onCreated(result.sale!);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl my-8 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <ShoppingCart size={16} className="text-teal-500" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">Record New Sale</h2>
              <p className="text-[11px] text-gray-400">Inventory will be deducted automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Buyer info */}
          <div>
            <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Buyer Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Company Name" value={companyName} onChange={setCompanyName} placeholder="e.g. Acme Corp" />
              <Input label="Contact Person" value={contactName} onChange={setContactName} placeholder="e.g. Ravi Kumar" />
              <Input label="Phone" value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-gray-600 uppercase tracking-wide">Existing Customer</label>
                <div className="flex gap-2">
                  <select
                    value={customerId}
                    onChange={e => { setCustomerId(e.target.value); setDeleteConfirmId(''); setDeleteError(''); }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">— None —</option>
                    {uniqueCustomers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                  {customerId && (
                    <button
                      type="button"
                      onClick={() => { setDeleteConfirmId(customerId); setDeleteError(''); }}
                      className="px-3 py-2 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                      title="Delete this customer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Delete confirmation */}
                {deleteConfirmId && selectedCustomer && (
                  <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 space-y-2">
                    <p className="text-[12px] font-medium text-rose-700">
                      Delete <strong>{selectedCustomer.name}</strong> ({selectedCustomer.phone})?
                      This cannot be undone.
                    </p>
                    {deleteError && (
                      <p className="text-[11px] text-rose-600 flex items-center gap-1">
                        <AlertTriangle size={12} className="shrink-0" />{deleteError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setDeleteConfirmId(''); setDeleteError(''); }}
                        className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteCustomer}
                        disabled={deleting}
                        className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition-colors"
                      >
                        {deleting ? 'Deleting…' : 'Yes, Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Items Sold</p>
              <button
                onClick={addLine}
                className="flex items-center gap-1.5 text-[12px] font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((li, idx) => {
                const inv = getInvItem(li.inventoryItemId);
                const maxQty = inv ? inv.quantity : 99999;
                const isOverstock = inv && li.quantity > inv.quantity;
                return (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <select
                        value={li.inventoryItemId}
                        onChange={e => updateLine(idx, 'inventoryItemId', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      >
                        <option value="">— Select item —</option>
                        {availableItems.map((i: any) => (
                          <option key={i.id} value={i.id}>
                            {i.name} (Stock: {i.quantity}) — ₹{i.unitCost.toLocaleString()}
                          </option>
                        ))}
                      </select>
                      {isOverstock && (
                        <p className="text-[11px] text-rose-500 mt-0.5 ml-1">
                          Only {inv.quantity} in stock
                        </p>
                      )}
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={li.quantity}
                      onChange={e => updateLine(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {inv && (
                      <span className="py-2 text-[13px] text-gray-500 whitespace-nowrap">
                        ₹{(inv.unitCost * li.quantity).toLocaleString()}
                      </span>
                    )}
                    {lineItems.length > 1 && (
                      <button onClick={() => removeLine(idx)} className="p-2 text-gray-400 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-4 flex justify-end">
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-right">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Total Amount</p>
                <p className="text-[20px] font-semibold text-gray-900 mt-0.5">₹{total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-gray-600 uppercase tracking-wide">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes about this sale..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none placeholder-gray-400"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[13px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5">
              <AlertTriangle size={14} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Button text="Cancel" variant="outline" onClick={onClose} />
          <Button
            text={submitting ? 'Recording Sale…' : 'Record Sale'}
            variant="success"
            icon={CheckCircle}
            onClick={handleSubmit}
            disabled={submitting}
          />
        </div>
      </div>
    </div>
  );
};

// ── Sale Row ──────────────────────────────────────────────────────

const SaleRow: React.FC<{ sale: Sale; users: any[] }> = ({ sale, users }) => {
  const [expanded, setExpanded] = useState(false);
  const creator = users.find((u: any) => u.id === sale.createdById);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Toggle icon */}
        <div className="text-gray-400 shrink-0">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>

        {/* Sale number */}
        <div className="w-32 shrink-0">
          <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-semibold px-2 py-1 rounded-md">
            <ShoppingCart size={11} />
            {sale.saleNumber}
          </span>
        </div>

        {/* Buyer */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-900 truncate">
            {sale.companyName || sale.contactName || 'Walk-in Customer'}
          </p>
          {sale.contactName && sale.companyName && (
            <p className="text-[11px] text-gray-400 truncate">{sale.contactName}</p>
          )}
        </div>

        {/* Items count */}
        <div className="hidden sm:flex items-center gap-1 text-[12px] text-gray-500 shrink-0 w-20">
          <Package size={12} />
          {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
        </div>

        {/* Date */}
        <div className="hidden md:block text-[11px] text-gray-400 shrink-0 w-28 text-right">
          {new Date(sale.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}
        </div>

        {/* Total */}
        <div className="text-[14px] font-semibold text-gray-900 shrink-0 w-28 text-right">
          ₹{sale.totalAmount.toLocaleString()}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 pt-3">
            {sale.contactName && (
              <div className="flex items-center gap-2 text-[12px] text-gray-600">
                <User size={13} className="text-gray-400" />
                {sale.contactName}
              </div>
            )}
            {sale.phone && (
              <div className="flex items-center gap-2 text-[12px] text-gray-600">
                <Phone size={13} className="text-gray-400" />
                {sale.phone}
              </div>
            )}
            {creator && (
              <div className="flex items-center gap-2 text-[12px] text-gray-600">
                <User size={13} className="text-teal-400" />
                Recorded by: <span className="font-medium">{creator.name}</span>
              </div>
            )}
          </div>

          {sale.notes && (
            <div className="flex gap-2 text-[12px] text-gray-500 mb-4">
              <FileText size={13} className="text-gray-400 mt-0.5 shrink-0" />
              {sale.notes}
            </div>
          )}

          {/* Items table */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-100 text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-center font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sale.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-900 font-medium">{item.itemName}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-gray-600">₹{item.unitPrice.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">₹{item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={3} className="px-3 py-2 text-right text-gray-600 font-medium">Total</td>
                  <td className="px-3 py-2 text-right text-[14px] font-bold text-gray-900">
                    ₹{sale.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main SalesPage ────────────────────────────────────────────────

export const SalesPage: React.FC = () => {
  const { sales, inventory, users, currentUser } = useApp() as any;
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (sales as Sale[]).filter(s =>
      s.saleNumber.toLowerCase().includes(q) ||
      s.companyName.toLowerCase().includes(q) ||
      s.contactName.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q)
    );
  }, [sales, search]);

  // Metrics
  const totalRevenue = (sales as Sale[]).reduce((sum, s) => sum + s.totalAmount, 0);
  const totalSales = (sales as Sale[]).length;
  const todaySales = (sales as Sale[]).filter(s => {
    const d = new Date(s.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const lowStockCount = (inventory as any[]).filter(i => i.quantity <= i.minStock).length;

  const handleCreated = (sale: Sale) => {
    setShowModal(false);
    setSuccessMsg(`Sale ${sale.saleNumber} recorded successfully!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const canRecord = currentUser?.role === 'admin' || currentUser?.role === 'reception';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        subtitle="Record direct product sales and track inventory changes"
        action={canRecord && (
          <Button
            text="Record Sale"
            variant="primary"
            icon={Plus}
            onClick={() => setShowModal(true)}
          />
        )}
      />

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-[13px] font-medium px-4 py-3 rounded-lg">
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-[13px] px-4 py-3 rounded-lg">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>{lowStockCount}</strong> inventory item{lowStockCount !== 1 ? 's are' : ' is'} at or below minimum stock level.
            {' '}<button onClick={() => {}} className="underline hover:no-underline font-medium">View Inventory</button>
          </span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales"
          value={totalSales}
          icon={ShoppingCart}
          color="teal"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Today's Sales"
          value={todaySales.length}
          icon={DollarSign}
          color="purple"
          sub={todaySales.length > 0 ? `₹${todayRevenue.toLocaleString()}` : undefined}
        />
        <MetricCard
          title="Low Stock Items"
          value={lowStockCount}
          icon={AlertTriangle}
          color="orange"
          sub={lowStockCount > 0 ? 'Alert' : undefined}
        />
      </div>

      {/* Sales list */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-gray-900">Sale History</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by sale #, company, contact..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-teal-500 w-64"
            />
          </div>
        </div>

        {/* Table header */}
        <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
          <div className="w-4" />
          <div className="w-32">Sale #</div>
          <div className="flex-1">Buyer</div>
          <div className="w-20">Items</div>
          <div className="hidden md:block w-28 text-right">Date</div>
          <div className="w-28 text-right">Amount</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ShoppingCart size={40} className="mb-3 opacity-40" />
            <p className="text-[13px] font-medium text-gray-500">
              {search ? 'No sales match your search' : 'No sales recorded yet'}
            </p>
            {!search && canRecord && (
              <p className="text-[12px] text-gray-400 mt-1">Click "Record Sale" to get started</p>
            )}
          </div>
        ) : (
          filtered.map(sale => (
            <SaleRow key={sale.id} sale={sale} users={users} />
          ))
        )}
      </Card>

      {showModal && (
        <NewSaleModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};