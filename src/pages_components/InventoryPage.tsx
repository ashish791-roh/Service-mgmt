import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard, Modal, FormInput, Toast, useToast, EmptyState } from '../components/ui';

// NOTE: Drop this into ReceptionPages.tsx replacing the existing InventoryPage export,
// AND add updateInventory to AppContext (see AppContext.patch.ts)

export const InventoryPage: React.FC = () => {
  const { inventory, updateInventory, addInventoryItem } = useApp() as any;
  const { toast, show } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stockAdjust, setStockAdjust] = useState<{ id: string; qty: string; action: 'add' | 'remove' } | null>(null);

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
      show('Fill all fields', 'error'); return;
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
    show('Item added to inventory!');
  };

  const handleStockAdjust = () => {
    if (!stockAdjust || !stockAdjust.qty) { show('Enter quantity', 'error'); return; }
    const qty = parseInt(stockAdjust.qty);
    const item = inventory.find((i: any) => i.id === stockAdjust.id);
    if (!item) return;
    const newQty = stockAdjust.action === 'add'
      ? item.quantity + qty
      : Math.max(0, item.quantity - qty);
    updateInventory?.(stockAdjust.id, { quantity: newQty });
    setStockAdjust(null);
    show(`Stock ${stockAdjust.action === 'add' ? 'added' : 'removed'} successfully!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">Parts and stock management</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
        >
          + Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={inventory.length} icon="📦" color="text-slate-800" />
        <StatCard label="Low Stock" value={lowStockItems.length} icon="⚠️" color="text-red-600" sub="Below minimum" />
        <StatCard label="Total Value" value={`₹${inventory.reduce((s: number, i: any) => s + i.quantity * i.unitCost, 0).toLocaleString()}`} icon="💰" color="text-emerald-600" />
        <StatCard label="Categories" value={categories.length - 1} icon="🗂" color="text-indigo-600" />
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🚨</span>
            <h3 className="font-bold text-red-700">Low Stock Alert ({lowStockItems.length} items)</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item: any) => (
              <div key={item.id} className="bg-white border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{item.quantity} left</span>
                <button
                  onClick={() => setStockAdjust({ id: item.id, qty: '', action: 'add' })}
                  className="text-xs text-indigo-500 font-semibold hover:underline"
                >
                  Restock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200">
          {categories.map(cat => (
            <button key={String(cat)} onClick={() => setCategoryFilter(String(cat))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${categoryFilter === cat ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {String(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left">
              {['Item', 'Category', 'Stock', 'Min Stock', 'Unit Cost', 'Total Value', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((item: any) => {
              const isLow = item.quantity <= item.minStock;
              return (
                <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isLow ? 'bg-red-50/20' : ''}`}>
                  <td className="px-5 py-3.5 font-semibold text-sm text-slate-700">{item.name}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{item.category}</span>
                  </td>
                  <td className={`px-5 py-3.5 text-sm font-bold ${isLow ? 'text-red-600' : 'text-slate-700'}`}>{item.quantity}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{item.minStock}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">₹{item.unitCost.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-slate-700">₹{(item.quantity * item.unitCost).toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isLow ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {isLow ? '⚠ Low Stock' : '✓ OK'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setStockAdjust({ id: item.id, qty: '', action: 'add' })}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition"
                      >+ Add</button>
                      <button
                        onClick={() => setStockAdjust({ id: item.id, qty: '', action: 'remove' })}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition"
                      >– Remove</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon="📦" title="No items found" desc="Try a different search or add new inventory items" />}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <Modal title="Add Inventory Item" onClose={() => setShowAddModal(false)}>
          <div className="space-y-4">
            <FormInput label="Item Name *" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. LCD Screen 15.6 inch" />
            <FormInput label="Category *" value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Screens, Batteries, Cables" />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Initial Quantity *" type="number" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
              <FormInput label="Min Stock Level *" type="number" value={addForm.minStock} onChange={e => setAddForm(f => ({ ...f, minStock: e.target.value }))} placeholder="5" />
            </div>
            <FormInput label="Unit Cost (₹) *" type="number" value={addForm.unitCost} onChange={e => setAddForm(f => ({ ...f, unitCost: e.target.value }))} placeholder="0.00" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={handleAdd} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">Add Item</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Stock Adjust Modal */}
      {stockAdjust && (() => {
        const item = inventory.find((i: any) => i.id === stockAdjust.id);
        return (
          <Modal
            title={stockAdjust.action === 'add' ? `Restock: ${item?.name}` : `Remove Stock: ${item?.name}`}
            onClose={() => setStockAdjust(null)}
          >
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-600">Current stock: <strong className="text-slate-800">{item?.quantity}</strong></p>
                <p className="text-sm text-slate-600">Min stock: <strong className="text-slate-800">{item?.minStock}</strong></p>
              </div>
              <FormInput
                label={`Quantity to ${stockAdjust.action === 'add' ? 'Add' : 'Remove'} *`}
                type="number" min="1"
                value={stockAdjust.qty}
                onChange={e => setStockAdjust(s => s ? { ...s, qty: e.target.value } : null)}
                placeholder="0"
              />
              {stockAdjust.qty && item && (
                <div className="bg-indigo-50 rounded-xl px-4 py-3">
                  <p className="text-sm text-indigo-700">
                    New stock will be: <strong>
                      {stockAdjust.action === 'add'
                        ? item.quantity + parseInt(stockAdjust.qty || '0')
                        : Math.max(0, item.quantity - parseInt(stockAdjust.qty || '0'))
                      }
                    </strong>
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStockAdjust(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                <button
                  onClick={handleStockAdjust}
                  className={`flex-1 font-semibold px-4 py-2.5 rounded-xl text-sm transition text-white ${stockAdjust.action === 'add' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-500 hover:bg-red-400'}`}
                >
                  {stockAdjust.action === 'add' ? '+ Add Stock' : '− Remove Stock'}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {toast && <Toast {...toast} />}
    </div>
  );
};