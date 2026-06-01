import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingCart, Plus, X, Search, Package, TrendingUp,
  DollarSign, AlertTriangle, ChevronDown, ChevronRight,
  User, Phone, FileText, CheckCircle, Trash2,
} from 'lucide-react';
import type { Sale, Customer, User as UserType, InventoryItem } from '../types';

// ── UI Component Props ───────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: 'teal' | 'green' | 'orange' | 'purple';
  sub?: string;
}

interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'success' | 'outline' | 'danger';
  className?: string;
  icon?: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
}

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

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

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, sub }) => {
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

const Button: React.FC<ButtonProps> = ({ text, onClick, variant = 'primary', className = '', icon: Icon, disabled }) => {
  const styles: Record<string, string> = {
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

const Input: React.FC<InputProps> = ({ label, value, onChange, placeholder, type = 'text', required }) => (
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
  customRate: string; // editable rate string; empty means use inventory default
}

interface NewSaleModalProps {
  onClose: () => void;
  onCreated: (sale: Sale) => void;
}

const NewSaleModal: React.FC<NewSaleModalProps> = ({ onClose, onCreated }) => {
  const appContext = useApp();
  const { inventory, customers, addSale, currentUser } = appContext as {
    inventory: InventoryItem[];
    customers: Customer[];
    addSale: (data: any) => Promise<{ ok: boolean; error?: string; sale?: Sale }>;
    currentUser: UserType | null;
  };
  const canEditRate = currentUser?.role === 'admin';

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ inventoryItemId: '', quantity: 1, customRate: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Deduplicate customers: keep only the first record per unique name+phone combo
  const uniqueCustomers = useMemo(() => {
    const seen = new Set<string>();
    return customers.filter((c: Customer) => {
      const key = `${c.name.trim().toLowerCase()}|${c.phone.trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [customers]);

  const availableItems = (inventory as InventoryItem[]).filter(i => i.quantity > 0);

  const addLine = () => setLineItems(prev => [...prev, { inventoryItemId: '', quantity: 1, customRate: '' }]);
  const removeLine = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));

  const updateLine = (idx: number, field: keyof LineItem, val: string | number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      // When item changes, reset customRate so it defaults to new item's inventory price
      if (field === 'inventoryItemId') updated.customRate = '';
      return updated;
    }));
  };

  const getInvItem = (id: string) => (inventory as InventoryItem[]).find(i => i.id === id);

  const getEffectiveRate = (li: LineItem) => {
    const inv = getInvItem(li.inventoryItemId);
    if (!inv) return 0;
    const custom = parseFloat(li.customRate);
    return !isNaN(custom) && li.customRate.trim() !== '' ? custom : inv.unitCost;
  };

  const total = lineItems.reduce((sum, li) => {
    return sum + getEffectiveRate(li) * li.quantity;
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
      items: validLines.map(li => ({
        inventoryItemId: li.inventoryItemId,
        quantity: Number(li.quantity),
        unitPrice: (() => {
          const custom = parseFloat(li.customRate);
          return !isNaN(custom) && li.customRate.trim() !== '' ? custom : undefined;
        })(),
      })),
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
                <select
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">— None —</option>
                  {uniqueCustomers.map((c: Customer) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
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
                const effectiveRate = getEffectiveRate(li);
                return (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <select
                        value={li.inventoryItemId}
                        onChange={e => updateLine(idx, 'inventoryItemId', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      >
                        <option value="">— Select item —</option>
                        {availableItems.map((i: InventoryItem) => (
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
                    {/* Editable rate — visible only to admin */}
                    {canEditRate && inv && (
                      <div className="flex flex-col gap-0.5">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₹</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={li.customRate}
                            placeholder={String(inv.unitCost)}
                            onChange={e => updateLine(idx, 'customRate', e.target.value)}
                            className="w-28 border border-amber-300 bg-amber-50 rounded-lg pl-6 pr-2 py-2 text-[13px] text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-amber-400"
                            title="Edit rate (Admin only)"
                          />
                        </div>
                        <p className="text-[10px] text-amber-600 text-center">Rate ✏️</p>
                      </div>
                    )}
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
                        ₹{(effectiveRate * li.quantity).toLocaleString()}
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

const SaleRow: React.FC<{ sale: Sale; users: UserType[] }> = ({ sale, users }) => {
  const [expanded, setExpanded] = useState(false);
  const creator = users.find((u: UserType) => u.id === sale.createdById);

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
  const appContext = useApp();
  const { inventory, users, currentUser, stats } = appContext as {
    inventory: InventoryItem[];
    users: UserType[];
    currentUser: UserType | null;
    stats: any;
  };
  const [showModal, setShowModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    todaySalesCount: 0,
    todayRevenue: 0,
  });

  const limit = 15;

  const fetchSalesList = async (page: number, searchTerm: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (res.ok && data.sales) {
        setSalesList(data.sales);
        setTotalSalesCount(data.total);
        setTotalPages(Math.ceil(data.total / limit) || 1);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sales list', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
      setCurrentPage(1); // Reset to first page on search change
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  React.useEffect(() => {
    fetchSalesList(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  const handleCreated = (sale: Sale) => {
    setShowModal(false);
    setSuccessMsg(`Sale ${sale.saleNumber} recorded successfully!`);
    setTimeout(() => setSuccessMsg(''), 4000);
    // Refresh page 1
    if (currentPage === 1) {
      fetchSalesList(1, debouncedSearch);
    } else {
      setCurrentPage(1);
    }
  };

  const lowStockCount = stats?.lowStockCount ?? (inventory as InventoryItem[]).filter(i => i.quantity <= i.minStock).length;
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
          </span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales"
          value={totalSalesCount}
          icon={ShoppingCart}
          color="teal"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${metrics.totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Today's Sales"
          value={metrics.todaySalesCount}
          icon={DollarSign}
          color="purple"
          sub={metrics.todaySalesCount > 0 ? `₹${metrics.todayRevenue.toLocaleString()}` : undefined}
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
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
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

        {loading ? (
          <div className="flex justify-center items-center py-16 text-gray-500 text-[13px]">
            Loading sales...
          </div>
        ) : salesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ShoppingCart size={40} className="mb-3 opacity-40" />
            <p className="text-[13px] font-medium text-gray-500">
              {searchValue ? 'No sales match your search' : 'No sales recorded yet'}
            </p>
            {!searchValue && canRecord && (
              <p className="text-[12px] text-gray-400 mt-1">Click "Record Sale" to get started</p>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {salesList.map(sale => (
                <SaleRow key={sale.id} sale={sale} users={users} />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-gray-50">
              <p className="text-[12px] text-gray-500">
                Showing <span className="font-medium text-gray-800">{(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalSalesCount)}</span> of <span className="font-medium text-gray-800">{totalSalesCount.toLocaleString()}</span> sales
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="text-[12px] text-gray-500 px-1">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
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