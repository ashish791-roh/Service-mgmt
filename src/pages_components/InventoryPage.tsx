import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Modal, Toast, useToast } from '../components/ui';

// ── Icons ────────────────────────────────────────────────────────
const Icons = {
  Box: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  AlertTriangle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  DollarSign: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Layers: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
};

// ── Interactive UI Components ────────────────────────────────────
const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
  >
    <div>
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight leading-tight">{title}</h1>
      <p className="text-sm font-bold text-violet-500 uppercase tracking-widest mt-2">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </motion.div>
);

const AnimatedCard = ({ children, delay = 0, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className={`bg-white rounded-[2rem] border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)] hover:border-violet-100 transition-all duration-300 overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);

const InteractiveStatCard = ({ title, value, icon, gradient, delay, sub }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    whileHover={{ scale: 1.02 }}
    className="relative bg-white rounded-3xl p-5 border border-slate-100 shadow-sm overflow-hidden group cursor-pointer"
  >
    <div className={`absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl group-hover:scale-150 group-hover:opacity-20 transition-all duration-500`} />
    
    <div className="flex justify-between items-start mb-4 relative z-10">
      <motion.div 
        whileHover={{ rotate: 10, scale: 1.1 }}
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}
      >
        {Icons[icon as keyof typeof Icons]}
      </motion.div>
      {sub && <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">{sub}</span>}
    </div>
    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <div className="flex items-end gap-3 relative z-10">
      <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{value}</h3>
    </div>
  </motion.div>
);

const GlowButton = ({ icon, text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: any = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_8px_16px_rgba(0,0,0,0.15)]",
    vivid: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_12px_25px_rgba(139,92,246,0.4)]",
    success: "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)]",
    danger: "bg-white border-2 border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200",
  };
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      onClick={onClick} 
      className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all ${styles[variant]} ${className}`}
    >
      {icon && <span className="text-lg">{Icons[icon as keyof typeof Icons]}</span>}
      {text}
    </motion.button>
  );
};

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
    <div className="max-w-[1400px] mx-auto pb-12 space-y-8">
      <PageHeader title="Inventory Log" subtitle="Supply chain & stock tracking" 
        action={<GlowButton icon="Plus" text="New Item" variant="vivid" onClick={() => setShowAddModal(true)} />} />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InteractiveStatCard title="Total Items" value={inventory.length} icon="Box" gradient="from-blue-600 to-cyan-400" delay={0.1} />
        <InteractiveStatCard title="Low Stock" value={lowStockItems.length} icon="AlertTriangle" gradient="from-rose-500 to-orange-400" sub="Critical" delay={0.2} />
        <InteractiveStatCard title="Total Value" value={`₹${(inventory.reduce((s: number, i: any) => s + i.quantity * i.unitCost, 0) / 1000).toFixed(1)}k`} icon="DollarSign" gradient="from-emerald-500 to-teal-400" delay={0.3} />
        <InteractiveStatCard title="Categories" value={categories.length - 1} icon="Layers" gradient="from-violet-600 to-fuchsia-500" delay={0.4} />
      </div>

      {/* Low stock alert */}
      <AnimatePresence>
        {lowStockItems.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <AnimatedCard delay={0.5} className="bg-gradient-to-br from-rose-50 to-orange-50 border-rose-100">
              <div className="px-6 py-5 flex items-center gap-4 border-b border-rose-100/50">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                  {Icons.AlertTriangle}
                </div>
                <div>
                  <h3 className="text-lg font-black text-rose-900">Critical Stock Alert</h3>
                  <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">{lowStockItems.length} Items Below Threshold</p>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {lowStockItems.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100/50 flex justify-between items-center group">
                    <div>
                      <p className="text-sm font-black text-slate-900 mb-1">{item.name}</p>
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{item.quantity} left in stock</p>
                    </div>
                    <button
                      onClick={() => setStockAdjust({ id: item.id, qty: '', action: 'add' })}
                      className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black hover:bg-rose-500 hover:text-white transition-colors"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </AnimatedCard>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 max-w-2xl">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-violet-500">{Icons.Search}</div>
          <input 
            value={search} onChange={e => setSearch(e.target.value)} 
            placeholder="Search parts, screens, components..." 
            className="w-full bg-white border-2 border-slate-100 rounded-[2rem] pl-14 pr-6 py-5 text-lg font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          />
        </div>
        <div className="flex bg-white p-2 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-x-auto w-fit">
          {categories.map(cat => (
            <button key={String(cat)} onClick={() => setCategoryFilter(String(cat))}
              className={`px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 whitespace-nowrap ${categoryFilter === cat ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
              {String(cat)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <AnimatedCard delay={0.6}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100/80">
                {['Item Name', 'Category', 'Quantity', 'Status', 'Unit Cost', 'Total Value', 'Actions'].map(h => (
                  <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              <AnimatePresence>
                {filtered.map((item: any, i: number) => {
                  const isLow = item.quantity <= item.minStock;
                  return (
                    <motion.tr 
                      key={item.id} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isLow ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="px-8 py-6">
                        <p className={`text-base font-black transition-colors ${isLow ? 'text-rose-600' : 'text-slate-900 group-hover:text-violet-600'}`}>{item.name}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">{item.category}</span>
                      </td>
                      <td className="px-8 py-6">
                        <p className={`text-2xl font-black tracking-tighter ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantity}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Min: {item.minStock}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${isLow ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                          {isLow ? 'Critical' : 'Healthy'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-500">₹{item.unitCost.toLocaleString()}</td>
                      <td className="px-8 py-6 text-lg font-black text-slate-900 tracking-tighter">₹{(item.quantity * item.unitCost).toLocaleString()}</td>
                      <td className="px-8 py-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setStockAdjust({ id: item.id, qty: '', action: 'add' })}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-emerald-500 text-slate-600 hover:text-white flex items-center justify-center font-black transition-colors shadow-sm"
                          >+</button>
                          <button
                            onClick={() => setStockAdjust({ id: item.id, qty: '', action: 'remove' })}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-rose-500 text-slate-600 hover:text-white flex items-center justify-center font-black transition-colors shadow-sm"
                          >−</button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📦</div>
              <p className="text-lg font-black text-slate-900 mb-1">No items found</p>
              <p className="text-sm font-bold text-slate-500">Try a different search or add new inventory items</p>
            </div>
          )}
        </div>
      </AnimatedCard>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full pointer-events-none" />

              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Add Component</h2>
                  <p className="text-sm font-bold text-violet-600 uppercase tracking-widest mt-1">Inventory Registration</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors font-bold text-xl">✕</button>
              </div>

              <div className="space-y-5 relative z-10">
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Item Name *</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. LCD Screen 15.6 inch" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Category *</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Screens, Batteries, Cables" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Initial Qty *</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" type="number" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Min Threshold *</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" type="number" value={addForm.minStock} onChange={e => setAddForm(f => ({ ...f, minStock: e.target.value }))} placeholder="5" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Unit Cost (₹) *</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all" type="number" value={addForm.unitCost} onChange={e => setAddForm(f => ({ ...f, unitCost: e.target.value }))} placeholder="0.00" />
                </div>
              </div>

              <div className="flex gap-4 mt-10 relative z-10">
                <GlowButton text="Cancel" variant="primary" onClick={() => setShowAddModal(false)} className="px-8 !bg-slate-100 !text-slate-700 hover:!bg-slate-200 shadow-none" />
                <GlowButton text="Register Item" variant="vivid" onClick={handleAdd} className="flex-1" />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Stock Adjust Modal */}
        {stockAdjust && (() => {
          const item = inventory.find((i: any) => i.id === stockAdjust.id);
          return (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-48 h-48 rounded-bl-full pointer-events-none opacity-20 ${stockAdjust.action === 'add' ? 'bg-gradient-to-bl from-emerald-500 to-transparent' : 'bg-gradient-to-bl from-rose-500 to-transparent'}`} />

                <div className="mb-8 relative z-10">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">{stockAdjust.action === 'add' ? 'Add Stock' : 'Remove Stock'}</h2>
                  <p className={`text-sm font-bold uppercase tracking-widest mt-1 ${stockAdjust.action === 'add' ? 'text-emerald-500' : 'text-rose-500'}`}>{item?.name}</p>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Stock</p>
                      <p className="text-3xl font-black text-slate-900 leading-none">{item?.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Minimum</p>
                      <p className="text-xl font-black text-slate-500 leading-none">{item?.minStock}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Quantity to {stockAdjust.action === 'add' ? 'Add' : 'Remove'} *</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-2xl font-black text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all text-center" type="number" min="1" value={stockAdjust.qty} onChange={e => setStockAdjust(s => s ? { ...s, qty: e.target.value } : null)} placeholder="0" />
                  </div>
                </div>

                <div className="flex gap-4 mt-10 relative z-10">
                  <GlowButton text="Cancel" variant="primary" onClick={() => setStockAdjust(null)} className="px-6 !bg-slate-100 !text-slate-700 hover:!bg-slate-200 shadow-none" />
                  <GlowButton text={stockAdjust.action === 'add' ? '+ Restock' : '− Deduct'} variant={stockAdjust.action === 'add' ? 'success' : 'danger'} onClick={handleStockAdjust} className="flex-1" />
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {toast && <Toast {...toast} />}
    </div>
  );
};