import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Banknote, Hourglass, ShoppingCart, User, Phone, FileText, Package, X, Printer } from 'lucide-react';
import type { Sale } from '../../types';
import { printSaleInvoice } from './InvoicePrinter';
import { motion, AnimatePresence } from 'framer-motion';

const modalVariants = {
  hidden:  { opacity: 0, scale: 0.94, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { type: 'spring', stiffness: 480, damping: 36 } },
  exit:    { opacity: 0, scale: 0.96, y: 8,  transition: { duration: 0.15 } },
} as const;

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
} as const;

const Card = React.forwardRef<HTMLDivElement, { children: React.ReactNode, className?: string }>(
  ({ children, className = "" }, ref) => (
    <div ref={ref} className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {children}
    </div>
  )
);
Card.displayName = 'Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
  highlight?: boolean;
}

const MetricCard = ({ title, value, icon: Icon, color, sub, highlight }: MetricCardProps) => {
  const colorMap: Record<string, string> = {
    teal: "text-teal-500 bg-teal-50",
    cyan: "text-cyan-500 bg-cyan-50",
    green: "text-green-500 bg-green-50",
    orange: "text-orange-500 bg-orange-50",
    purple: "text-purple-500 bg-purple-50",
    red: "text-red-500 bg-red-50",
  };
  const bgClass = colorMap[color] || colorMap.teal;

  return (
    <div className={`bg-white rounded-xl p-5 border relative overflow-hidden flex flex-col gap-4 ${highlight ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        {sub && <span className="bg-gray-100 text-gray-500 text-[11px] font-medium px-2 py-1 rounded-lg">{sub}</span>}
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <h3 className={`text-[18px] font-medium mt-1 ${highlight ? 'text-green-600' : 'text-gray-900'}`}>{value}</h3>
      </div>
    </div>
  );
};

interface ButtonProps {
  text: string;
  onClick?: () => void;
  variant?: 'primary' | 'success' | 'outline';
  className?: string;
  icon?: React.ElementType;
}

const Button = ({ text, onClick, variant = 'primary', className = "", icon: Icon }: ButtonProps) => {
  const styles: Record<string, string> = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
  };
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className}`}>
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

export const SalesPaymentsTab: React.FC = () => {
  const { sales, markSalePaid } = useApp();

  const [salePaymentModal, setSalePaymentModal] = useState<Sale | null>(null);
  const [saleFilter, setSaleFilter] = useState<'unpaid' | 'paid' | 'all'>('unpaid');

  // ── Sales billing data ─────────────────────────────────────────────────────
  const salesList: Sale[] = (sales as Sale[]) ?? [];
  const unpaidSales = salesList.filter(s => !s.paidAt);
  const paidSales = salesList.filter(s => !!s.paidAt);
  const displaySales = saleFilter === 'unpaid' ? unpaidSales : saleFilter === 'paid' ? paidSales : salesList;
  const totalSalesRevenue = paidSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const pendingSalesAmount = unpaidSales.reduce((sum, s) => sum + s.totalAmount, 0);

  const handleMarkSalePaid = async (sale: Sale) => {
    const result = await markSalePaid(sale.id);
    if (result.ok) {
      setSalePaymentModal(null);
    } else {
      alert(result.error ?? 'Failed to mark sale as paid.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sales metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Pending Payment" value={`₹${pendingSalesAmount.toLocaleString()}`} icon={Hourglass} color="orange" sub={`${unpaidSales.length} sales`} />
        <MetricCard title="Collected from Sales" value={`₹${totalSalesRevenue.toLocaleString()}`} icon={Banknote} color="green" sub={`${paidSales.length} paid`} highlight={paidSales.length > 0} />
        <MetricCard title="Total Sales" value={salesList.length} icon={ShoppingCart} color="teal" />
      </div>

      {/* Pending payment alert */}
      {unpaidSales.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between p-5 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Hourglass size={20} />
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-gray-900">{unpaidSales.length} Sales Pending Payment</h3>
              <p className="text-[11px] font-normal text-orange-600 uppercase tracking-wide mt-1">Collect ₹{pendingSalesAmount.toLocaleString()} in outstanding payments</p>
            </div>
          </div>
        </div>
      )}

      {/* Sales filter tabs */}
      <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit gap-1">
        {[
          { id: 'unpaid' as const, label: `Pending Payment (${unpaidSales.length})` },
          { id: 'paid' as const, label: `Paid (${paidSales.length})` },
          { id: 'all' as const, label: 'All Sales' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setSaleFilter(tab.id)}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${saleFilter === tab.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sales table */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-[13px] font-medium text-gray-900">
            {saleFilter === 'unpaid' ? 'Sales Pending Payment' : saleFilter === 'paid' ? 'Paid Sales' : 'All Sales'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Sale #', 'Buyer', 'Items', 'Date', 'Amount', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displaySales.map((sale: Sale) => {
                const isPaid = !!sale.paidAt;
                return (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-semibold px-2 py-1 rounded-md">
                        <ShoppingCart size={11} />{sale.saleNumber}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-medium text-gray-900">{sale.companyName || sale.contactName || 'Walk-in Customer'}</p>
                      {sale.phone && <p className="text-[11px] text-gray-500 flex items-center gap-1"><Phone size={10} />{sale.phone}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[13px] text-gray-700">{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</p>
                      <p className="text-[11px] text-gray-400">{sale.items.map(i => i.itemName).join(', ')}</p>
                    </td>
                    <td className="px-4 py-4 text-[12px] text-gray-500">
                      {new Date(sale.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[14px] font-semibold text-gray-900">₹{sale.totalAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-r text-[11px] font-medium uppercase tracking-wide inline-block border-l-2 ${isPaid ? 'bg-green-50 text-green-700 border-green-500' : 'bg-orange-50 text-orange-700 border-orange-500'}`}>
                        {isPaid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {!isPaid ? (
                        <Button
                          text="Process Payment"
                          variant="success"
                          onClick={() => setSalePaymentModal(sale)}
                        />
                      ) : (
                        <button
                          onClick={() => {
                            const res = printSaleInvoice(sale);
                            if (res && !res.ok && res.error) {
                              alert(res.error);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-lg uppercase tracking-wide hover:bg-gray-200 transition-colors"
                        >
                          <Printer size={12} className="mr-1" /> Invoice
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {displaySales.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
                <ShoppingCart size={24} />
              </div>
              <p className="text-[13px] font-medium text-gray-900 mb-1">No sales found</p>
              <p className="text-[13px] font-normal text-gray-500">Sales recorded on the Sales page will appear here for payment processing.</p>
            </div>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {salePaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSalePaymentModal(null)}
            />
            <motion.div
              className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <ShoppingCart size={16} className="text-teal-500" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-gray-900">Process Sale Payment</h2>
                  <p className="text-[11px] text-gray-400">{salePaymentModal.saleNumber}</p>
                </div>
              </div>
              <button onClick={() => setSalePaymentModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Buyer info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Buyer</p>
                <p className="text-[14px] font-semibold text-gray-900">{salePaymentModal.companyName || salePaymentModal.contactName || 'Walk-in Customer'}</p>
                {salePaymentModal.contactName && salePaymentModal.companyName && (
                  <p className="text-[12px] text-gray-500 flex items-center gap-1"><User size={11} />{salePaymentModal.contactName}</p>
                )}
                {salePaymentModal.phone && (
                  <p className="text-[12px] text-gray-500 flex items-center gap-1"><Phone size={11} />{salePaymentModal.phone}</p>
                )}
                {salePaymentModal.notes && (
                  <p className="text-[12px] text-gray-500 flex items-center gap-1 mt-1"><FileText size={11} />{salePaymentModal.notes}</p>
                )}
              </div>

              {/* Items sold */}
              <div className="border border-teal-200 rounded-lg overflow-hidden">
                <div className="bg-teal-50 px-4 py-2 flex items-center gap-2">
                  <Package size={13} className="text-teal-500" />
                  <p className="text-[11px] font-medium text-teal-700 uppercase tracking-wide">Items Sold</p>
                </div>
                <div className="divide-y divide-gray-100 bg-white">
                  {salePaymentModal.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2">
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">{item.itemName}</p>
                        <p className="text-[11px] text-gray-500">Qty: {item.quantity} × ₹{item.unitPrice.toLocaleString()}</p>
                      </div>
                      <p className="text-[13px] font-medium text-teal-600">₹{item.subtotal.toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
                    <p className="text-[12px] font-medium text-white uppercase tracking-wide">Total Amount Due</p>
                    <p className="text-[16px] font-bold text-white">₹{salePaymentModal.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button text="Cancel" variant="outline" onClick={() => setSalePaymentModal(null)} className="w-full" />
              <button
                onClick={() => {
                  const res = printSaleInvoice(salePaymentModal);
                  if (res && !res.ok && res.error) {
                    alert(res.error);
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 w-full"
              >
                <Printer size={15} /> Print Invoice
              </button>
              <Button text="Collect & Mark Paid" variant="success" onClick={() => handleMarkSalePaid(salePaymentModal)} className="w-full" />
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};
