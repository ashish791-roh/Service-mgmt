import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Box, AlertTriangle, DollarSign, Layers, Search, Plus, X, Pencil, Trash2 } from 'lucide-react';

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

const MetricCard = ({ title, value, icon: Icon, color, sub }: any) => {
  const colorMap: Record<string, string> = {
    teal: "text-teal-500 bg-teal-50",
    cyan: "text-cyan-500 bg-cyan-50",
    green: "text-green-500 bg-green-50",
    orange: "text-orange-500 bg-orange-50",
    rose: "text-rose-500 bg-rose-50",
  };
  const bgClass = colorMap[color] || colorMap.teal;

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 relative overflow-hidden flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        {sub && <span className="bg-rose-100 text-rose-600 text-[11px] font-medium px-2 py-1 rounded-lg">{sub}</span>}
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <h3 className="text-[18px] font-medium text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );
};

const Button = ({ text, onClick, variant = 'primary', className = "", icon: Icon }: any) => {
  const styles: any = {
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

export const InventoryPage: React.FC = () => {
  const { inventory, updateInventory, addInventoryItem, editInventoryItem, deleteInventoryItem } = useApp() as any;
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stockAdjust, setStockAdjust] = useState<{ id: string; qty: string; action: 'add' | 'remove' } | null>(null);
  const [editItem, setEditItem] = useState<{ id: string; unitCost: string; minStock: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const [addForm, setAddForm] = useState({
    name: '', category: '', quantity: '', unitCost: '', minStock: '',
  });

  const categories = ['All', ...Array.from(new Set(inventory.map((i: any) => i.category)))];

  const filtered = inventory.filter((i: any) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || i.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const lowStockItems = inventory.filter((i: any) => i.quantity <= i.minStock);

  const handleAdd = () => {
    if (!addForm.name || !addForm.category || !addForm.quantity || !addForm.unitCost || !addForm.minStock) {
      alert('Fill all fields'); return;
    }
    addInventoryItem?.({
      name: addForm.name,
      category: addForm.category,
      quantity: parseInt(addForm.quantity),
      unitCost: parseFloat(addForm.unitCost),
      minStock: parseInt(addForm.minStock),
    });
    setShowAddModal(false);
    setAddForm({ name: '', category: '', quantity: '', unitCost: '', minStock: '' });
  };

  const handleStockAdjust = () => {
    if (!stockAdjust || !stockAdjust.qty) { alert('Enter quantity'); return; }
    const qty = parseInt(stockAdjust.qty);
    const item = inventory.find((i: any) => i.id === stockAdjust.id);
    if (!item) return;
    const newQty = stockAdjust.action === 'add'
      ? item.quantity + qty
      : Math.max(0, item.quantity - qty);
    updateInventory?.(stockAdjust.id, newQty);
    setStockAdjust(null);
  };

  const handleEditSave = () => {
    if (!editItem) return;
    const cost = parseFloat(editItem.unitCost);
    const min = parseInt(editItem.minStock);
    if (isNaN(cost) || cost < 0) { alert('Enter a valid unit cost'); return; }
    if (isNaN(min) || min < 0) { alert('Enter a valid minimum amount'); return; }
    editInventoryItem?.(editItem.id, { unitCost: cost, minStock: min });
    setEditItem(null);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteInventoryItem?.(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
      <PageHeader title="Inventory Log" subtitle="Supply chain & stock tracking" 
        action={<Button icon={Plus} text="New Item" variant="primary" onClick={() => setShowAddModal(true)} />} />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Items" value={inventory.length} icon={Box} color="cyan" />
        <MetricCard title="Low Stock" value={lowStockItems.length} icon={AlertTriangle} color="rose" sub="Critical" />
        <MetricCard title="Total Value" value={`₹${(inventory.reduce((s: number, i: any) => s + i.quantity * i.unitCost, 0) / 1000).toFixed(1)}k`} icon={DollarSign} color="green" />
        <MetricCard title="Categories" value={categories.length - 1} icon={Layers} color="teal" />
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <Card className="bg-rose-50 border-rose-200">
          <div className="px-6 py-4 flex items-center gap-4 border-b border-rose-100">
            <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-gray-900">Critical Stock Alert</h3>
              <p className="text-[11px] font-normal text-rose-600 uppercase tracking-wide">{lowStockItems.length} Items Below Threshold</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {lowStockItems.map((item: any) => (
              <div key={item.id} className="bg-white rounded-lg p-4 border border-rose-100 flex justify-between items-center">
                <div>
                  <p className="text-[13px] font-medium text-gray-900 mb-0.5">{item.name}</p>
                  <p className="text-[11px] font-medium text-rose-600 uppercase tracking-wide">{item.quantity} left in stock</p>
                </div>
                <button
                  onClick={() => setStockAdjust({ id: item.id, qty: '', action: 'add' })}
                  className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center font-medium hover:bg-rose-100 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-xl">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Search size={18} /></div>
          <input 
            value={search} onChange={e => setSearch(e.target.value)} 
            placeholder="Search parts, screens, components..." 
            className="w-full bg-white border border-gray-200 rounded-lg pl-12 pr-4 py-3 text-[13px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-gray-200 overflow-x-auto w-fit gap-1">
          {categories.map(cat => (
            <button key={String(cat)} onClick={() => setCategoryFilter(String(cat))}
              className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${categoryFilter === cat ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
              {String(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Item Name', 'Category', 'Quantity', 'Status', 'Unit Cost', 'Total Value', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item: any) => {
                const isLow = item.quantity <= item.minStock;
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isLow ? 'bg-rose-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <p className={`text-[13px] font-medium ${isLow ? 'text-rose-700' : 'text-gray-900'}`}>{item.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[11px] font-medium uppercase tracking-wide">{item.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-[18px] font-medium ${isLow ? 'text-rose-600' : 'text-gray-900'}`}>{item.quantity}</p>
                      <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide mt-0.5">Min: {item.minStock}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[11px] font-medium uppercase tracking-wide inline-block ${isLow ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                        {isLow ? 'Critical' : 'Healthy'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-gray-500">₹{item.unitCost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-[13px] font-medium text-gray-900">₹{(item.quantity * item.unitCost).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStockAdjust({ id: item.id, qty: '', action: 'add' })}
                          className="w-8 h-8 rounded-md bg-white border border-gray-200 hover:bg-green-50 text-gray-600 hover:text-green-600 flex items-center justify-center font-medium transition-colors"
                        >+</button>
                        <button
                          onClick={() => setStockAdjust({ id: item.id, qty: '', action: 'remove' })}
                          className="w-8 h-8 rounded-md bg-white border border-gray-200 hover:bg-rose-50 text-gray-600 hover:text-rose-600 flex items-center justify-center font-medium transition-colors"
                        >−</button>
                        <button
                          onClick={() => setEditItem({ id: item.id, name: item.name, unitCost: String(item.unitCost), minStock: String(item.minStock) })}
                          className="w-8 h-8 rounded-md bg-white border border-gray-200 hover:bg-teal-50 text-gray-600 hover:text-teal-600 flex items-center justify-center transition-colors"
                          title="Edit price / min stock"
                        ><Pencil size={13} /></button>
                        <button
                          onClick={() => setDeleteConfirm({ id: item.id, name: item.name })}
                          className="w-8 h-8 rounded-md bg-white border border-gray-200 hover:bg-rose-50 text-gray-600 hover:text-rose-600 flex items-center justify-center transition-colors"
                          title="Delete item"
                        ><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
                <Box size={24} />
              </div>
              <p className="text-[13px] font-medium text-gray-900 mb-1">No items found</p>
              <p className="text-[11px] font-normal text-gray-500">Try a different search or add new inventory items</p>
            </div>
          )}
        </div>
      </Card>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-[18px] font-medium text-gray-900">Add Component</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Item Name *</label>
                <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. LCD Screen 15.6 inch" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Category *</label>
                <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500" value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Screens, Batteries, Cables" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Initial Qty *</label>
                  <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500" type="number" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Min Threshold *</label>
                  <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500" type="number" value={addForm.minStock} onChange={e => setAddForm(f => ({ ...f, minStock: e.target.value }))} placeholder="5" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Unit Cost (₹) *</label>
                <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500" type="number" value={addForm.unitCost} onChange={e => setAddForm(f => ({ ...f, unitCost: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button text="Cancel" variant="outline" onClick={() => setShowAddModal(false)} className="w-full" />
              <Button text="Register Item" variant="success" onClick={handleAdd} className="w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {stockAdjust && (() => {
        const item = inventory.find((i: any) => i.id === stockAdjust.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h2 className="text-[18px] font-medium text-gray-900">{stockAdjust.action === 'add' ? 'Add Stock' : 'Remove Stock'}</h2>
                <button onClick={() => setStockAdjust(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className={`text-[11px] font-medium uppercase tracking-wide ${stockAdjust.action === 'add' ? 'text-green-600' : 'text-rose-600'}`}>{item?.name}</p>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex justify-between items-center">
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Current Stock</p>
                    <p className="text-[18px] font-medium text-gray-900">{item?.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Minimum</p>
                    <p className="text-[13px] font-medium text-gray-700">{item?.minStock}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Quantity to {stockAdjust.action === 'add' ? 'Add' : 'Remove'} *</label>
                  <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[18px] font-medium text-gray-900 focus:outline-none focus:border-teal-500 text-center" type="number" min="1" value={stockAdjust.qty} onChange={e => setStockAdjust(s => s ? { ...s, qty: e.target.value } : null)} placeholder="0" />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <Button text="Cancel" variant="outline" onClick={() => setStockAdjust(null)} className="w-full" />
                <Button text={stockAdjust.action === 'add' ? '+ Restock' : '− Deduct'} variant={stockAdjust.action === 'add' ? 'success' : 'danger'} onClick={handleStockAdjust} className="w-full" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Item Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-[18px] font-medium text-gray-900">Edit Item</h2>
                <p className="text-[11px] font-medium text-teal-600 uppercase tracking-wide mt-0.5">{editItem.name}</p>
              </div>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Unit Cost (₹) *</label>
                <input
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editItem.unitCost}
                  onChange={e => setEditItem(ei => ei ? { ...ei, unitCost: e.target.value } : null)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 uppercase tracking-wide mb-1">Minimum Stock Amount *</label>
                <input
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-teal-500"
                  type="number"
                  min="0"
                  value={editItem.minStock}
                  onChange={e => setEditItem(ei => ei ? { ...ei, minStock: e.target.value } : null)}
                  placeholder="5"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button text="Cancel" variant="outline" onClick={() => setEditItem(null)} className="w-full" />
              <Button text="Save Changes" variant="primary" onClick={handleEditSave} className="w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 size={16} />
                </div>
                <h2 className="text-[18px] font-medium text-gray-900">Delete Item</h2>
              </div>
              <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[13px] font-normal text-gray-600">
                Are you sure you want to delete <span className="font-semibold text-gray-900">"{deleteConfirm.name}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button text="Cancel" variant="outline" onClick={() => setDeleteConfirm(null)} className="w-full" />
              <Button text="Delete Item" variant="danger" onClick={handleDelete} className="w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};