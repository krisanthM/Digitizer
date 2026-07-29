'use client';

import { useState, useEffect } from 'react';
import { ProcessedReceiptResponse, ExpenseCategory, LineItem, ConfidenceScores } from '@/types/expense';

interface ExpenseDetailsFormProps {
  initialData: ProcessedReceiptResponse;
  onSave: (data: {
    vendor: string | null;
    date: string | null;
    amount: number | null;
    currency?: string;
    category: ExpenseCategory;
    line_items: LineItem[];
    confidence: ConfidenceScores;
    raw_notes: string | null;
  }) => void;
  onDiscard: () => void;
}

export default function ExpenseDetailsForm({ initialData, onSave, onDiscard }: ExpenseDetailsFormProps) {
  const [vendor, setVendor] = useState(initialData.vendor || '');
  const [date, setDate] = useState(initialData.date || '');
  const [currency, setCurrency] = useState(initialData.currency || '₹');
  const [category, setCategory] = useState<ExpenseCategory>(initialData.category || 'misc');
  const [lineItems, setLineItems] = useState<LineItem[]>(initialData.line_items || []);
  const [rawNotes, setRawNotes] = useState(initialData.raw_notes || '');

  // Calculate sum of line items
  const lineItemsSum = Math.round(
    lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * 100
  ) / 100;

  // Initialize total amount: prioritize line items sum if present
  const initialAmountVal = () => {
    if (initialData.line_items && initialData.line_items.length > 0) {
      const sum = Math.round(initialData.line_items.reduce((s, i) => s + (Number(i.amount) || 0), 0) * 100) / 100;
      if (sum > 0) return sum;
    }
    return initialData.amount !== null ? initialData.amount : '';
  };

  const [amount, setAmount] = useState<number | ''>(initialAmountVal());

  // Track confidence. If modified, set to 1.0.
  const [confidence, setConfidence] = useState<ConfidenceScores>({
    vendor: initialData.confidence?.vendor ?? 0.5,
    date: initialData.confidence?.date ?? 0.5,
    amount: initialData.confidence?.amount ?? 0.5,
    category: initialData.confidence?.category ?? 0.5,
  });

  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemAmt, setNewItemAmt] = useState<number | ''>('');

  // Sync state when initialData changes
  useEffect(() => {
    setVendor(initialData.vendor || '');
    setDate(initialData.date || '');
    setCurrency(initialData.currency || '₹');
    setCategory(initialData.category || 'misc');
    setLineItems(initialData.line_items || []);
    setRawNotes(initialData.raw_notes || '');
    
    // Auto-sync initial total to sum of items if items exist
    const items = initialData.line_items || [];
    const itemsSum = Math.round(items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) * 100) / 100;
    if (items.length > 0 && itemsSum > 0) {
      setAmount(itemsSum);
    } else {
      setAmount(initialData.amount !== null ? initialData.amount : '');
    }

    setConfidence({
      vendor: initialData.confidence?.vendor ?? 0.5,
      date: initialData.confidence?.date ?? 0.5,
      amount: initialData.confidence?.amount ?? 0.5,
      category: initialData.confidence?.category ?? 0.5,
    });
  }, [initialData]);

  // Recalculate total amount when line items are updated
  const recalculateTotal = (items: LineItem[]) => {
    const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const rounded = Math.round(total * 100) / 100;
    setAmount(rounded);
    setConfidence(prev => ({ ...prev, amount: 1.0 }));
  };

  const handleVendorChange = (val: string) => {
    setVendor(val);
    setConfidence(prev => ({ ...prev, vendor: 1.0 }));
  };

  const handleDateChange = (val: string) => {
    setDate(val);
    setConfidence(prev => ({ ...prev, date: 1.0 }));
  };

  const handleAmountChange = (val: number | '') => {
    setAmount(val);
    setConfidence(prev => ({ ...prev, amount: 1.0 }));
  };

  const handleCategoryChange = (val: ExpenseCategory) => {
    setCategory(val);
    setConfidence(prev => ({ ...prev, category: 1.0 }));
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, val: string | number) => {
    const updated = [...lineItems];
    if (field === 'amount') {
      updated[index] = { ...updated[index], amount: Number(val) || 0 };
    } else {
      updated[index] = { ...updated[index], description: String(val) };
    }
    setLineItems(updated);
    recalculateTotal(updated);
  };

  const addLineItem = () => {
    if (!newItemDesc.trim()) return;
    const amountVal = Number(newItemAmt) || 0;
    const updated = [...lineItems, { description: newItemDesc.trim(), amount: amountVal }];
    setLineItems(updated);
    recalculateTotal(updated);
    setNewItemDesc('');
    setNewItemAmt('');
  };

  const deleteLineItem = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
    recalculateTotal(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      vendor: vendor.trim() || null,
      date: date || null,
      amount: amount === '' ? null : Number(amount),
      currency,
      category,
      line_items: lineItems,
      confidence,
      raw_notes: rawNotes.trim() || null,
    });
  };

  const getConfidenceBadge = (score: number) => {
    let color = '';
    let label = '';
    
    if (score === 1.0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
          Verified
        </span>
      );
    }

    if (score >= 0.8) {
      color = 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      label = `${Math.round(score * 100)}% Match`;
    } else if (score >= 0.5) {
      color = 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      label = `${Math.round(score * 100)}% Verify`;
    } else {
      color = 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      label = `${Math.round(score * 100)}% Review`;
    }

    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${color}`}>
        {label}
      </span>
    );
  };

  const lowConfidenceCount = Object.values(confidence).filter(score => score < 0.6).length;
  const isMathSynced = lineItems.length === 0 || (amount !== '' && Math.abs(Number(amount) - lineItemsSum) < 0.01);

  const vendorMem = initialData.vendor_memory;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Verify Scanned Details
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Check items, category, currency and total accuracy
          </p>
        </div>
        
        {/* Currency Selector */}
        <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] font-semibold text-zinc-500 px-1.5 uppercase">Currency:</span>
          {['₹', '£', '$', '€'].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => setCurrency(sym)}
              className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currency === sym
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor Memory Recognition Badge */}
      {vendorMem?.is_recognized && (
        <div className="p-3 rounded-xl border bg-indigo-500/10 border-indigo-500/20 text-indigo-900 dark:text-indigo-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm">🧠</span>
            <div>
              <span className="font-bold">Recognized Vendor:</span> Seen {vendorMem.visit_count} time{vendorMem.visit_count > 1 ? 's' : ''} before (Typical Category: <span className="capitalize font-semibold">{vendorMem.typical_category}</span>, Avg: {currency}{vendorMem.average_amount.toFixed(2)})
            </div>
          </div>
        </div>
      )}

      {/* Vendor Memory Anomaly Warning */}
      {vendorMem?.is_high_amount_anomaly && vendorMem.anomaly_warning && (
        <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center space-x-2">
          <span className="text-base font-bold">⚠️</span>
          <div>
            <span className="font-bold">Amount Anomaly Warning:</span> {vendorMem.anomaly_warning}
          </div>
        </div>
      )}

      {/* Live Math Validation Indicator */}
      {lineItems.length > 0 && (
        <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all ${
          isMathSynced
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
        }`}>
          <div className="flex items-center space-x-2.5">
            <span className={`text-base font-extrabold flex h-6 w-6 items-center justify-center rounded-full ${
              isMathSynced ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
            }`}>
              {isMathSynced ? '✓' : '!'}
            </span>
            <div>
              <p className="font-bold text-xs sm:text-sm">
                {isMathSynced
                  ? `Item Sum (${currency}${lineItemsSum.toFixed(2)}) perfectly matches Total Amount`
                  : `Line items sum to ${currency}${lineItemsSum.toFixed(2)}, but Total is ${currency}${Number(amount || 0).toFixed(2)}`}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isMathSynced
                  ? 'All itemized costs accurately add up to the total.'
                  : 'Click sync to set the total amount equal to the exact sum of line items.'}
              </p>
            </div>
          </div>
          {!isMathSynced && (
            <button
              type="button"
              onClick={() => {
                setAmount(lineItemsSum);
                setConfidence(prev => ({ ...prev, amount: 1.0 }));
              }}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Sync Total to {currency}{lineItemsSum.toFixed(2)}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <span>Vendor / Merchant</span>
              {confidence.vendor < 0.6 && <span className="text-amber-500 font-bold" title="Uncertain field — please review">⚠️ Review</span>}
            </label>
            {getConfidenceBadge(confidence.vendor)}
          </div>
          <input
            type="text"
            value={vendor}
            onChange={(e) => handleVendorChange(e.target.value)}
            className={`w-full px-3 py-2 text-sm rounded-xl border text-zinc-900 dark:text-zinc-50 focus:outline-hidden focus:ring-2 transition-all ${
              confidence.vendor < 0.6
                ? 'bg-amber-500/10 border-amber-500/50 dark:bg-amber-500/20 focus:ring-amber-500/30'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-indigo-500/20 focus:border-indigo-500'
            }`}
            placeholder="e.g. The Old Vicarage Restaurant"
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <span>Expense Category</span>
              {confidence.category < 0.6 && <span className="text-amber-500 font-bold" title="Uncertain field — please review">⚠️ Review</span>}
            </label>
            {getConfidenceBadge(confidence.category)}
          </div>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
            className={`w-full px-3 py-2 text-sm rounded-xl border text-zinc-900 dark:text-zinc-50 focus:outline-hidden focus:ring-2 transition-all ${
              confidence.category < 0.6
                ? 'bg-amber-500/10 border-amber-500/50 dark:bg-amber-500/20 focus:ring-amber-500/30'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-indigo-500/20 focus:border-indigo-500'
            }`}
          >
            <option value="meals">🍷 Food, Dining & Hospitality</option>
            <option value="inventory">📦 Inventory / Goods for Resale</option>
            <option value="transport">🚚 Transport, Fuel & Travel</option>
            <option value="utilities">⚡ Utilities & Bills</option>
            <option value="rent">🏢 Rent & Premises Space</option>
            <option value="supplies">🛒 Store Supplies & Stationery</option>
            <option value="equipment">⚙️ Equipment & Machinery</option>
            <option value="marketing">📢 Marketing & Advertising</option>
            <option value="repairs">🛠️ Repairs & Maintenance</option>
            <option value="software">💻 Software & Subscriptions</option>
            <option value="services">💼 Professional Fees & Services</option>
            <option value="taxes">🏛️ Taxes, GST & License Fees</option>
            <option value="insurance">🛡️ Insurance & Coverage</option>
            <option value="misc">📁 Miscellaneous</option>
          </select>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <span>Transaction Date</span>
              {confidence.date < 0.6 && <span className="text-amber-500 font-bold" title="Uncertain field — please review">⚠️ Review</span>}
            </label>
            {getConfidenceBadge(confidence.date)}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className={`w-full px-3 py-2 text-sm rounded-xl border text-zinc-900 dark:text-zinc-50 focus:outline-hidden focus:ring-2 transition-all ${
              confidence.date < 0.6
                ? 'bg-amber-500/10 border-amber-500/50 dark:bg-amber-500/20 focus:ring-amber-500/30'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-indigo-500/20 focus:border-indigo-500'
            }`}
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <span>Total Amount</span>
              {confidence.amount < 0.6 && <span className="text-amber-500 font-bold" title="Uncertain field — please review">⚠️ Review</span>}
            </label>
            {getConfidenceBadge(confidence.amount)}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 dark:text-zinc-400 font-bold">
              {currency}
            </span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value === '' ? '' : Number(e.target.value))}
              className={`w-full pl-8 pr-3 py-2 text-sm font-semibold rounded-xl border text-zinc-900 dark:text-zinc-50 focus:outline-hidden focus:ring-2 transition-all ${
                confidence.amount < 0.6
                  ? 'bg-amber-500/10 border-amber-500/50 dark:bg-amber-500/20 focus:ring-amber-500/30'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Line Items Section */}
      <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block">
            Itemized Line Items ({lineItems.length})
          </label>
          {lineItems.length > 0 && (
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Total Sum: {currency}{lineItemsSum.toFixed(2)}
            </span>
          )}
        </div>

        {lineItems.length > 0 ? (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-zinc-950">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-xs font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-2">Item Description</th>
                  <th className="px-4 py-2 w-32 text-right">Amount ({currency})</th>
                  <th className="px-3 py-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 text-sm">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                        className="w-full bg-transparent border-0 p-0 focus:ring-0 focus:outline-hidden text-zinc-900 dark:text-zinc-50 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => handleLineItemChange(idx, 'amount', e.target.value)}
                        className="w-full bg-transparent border-0 p-0 focus:ring-0 focus:outline-hidden text-right text-zinc-900 dark:text-zinc-50 text-sm font-semibold"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => deleteLineItem(idx)}
                        className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 cursor-pointer"
                        title="Delete item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
            No line items extracted. Add items below to calculate breakdown.
          </p>
        )}

        {/* Add Line Item Row */}
        <div className="flex gap-2 items-center bg-zinc-50/50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <input
            type="text"
            value={newItemDesc}
            onChange={(e) => setNewItemDesc(e.target.value)}
            placeholder="Add item details..."
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-hidden"
          />
          <div className="relative w-28">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
              {currency}
            </span>
            <input
              type="number"
              step="0.01"
              value={newItemAmt}
              onChange={(e) => setNewItemAmt(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="w-full pl-6 pr-2 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-hidden"
            />
          </div>
          <button
            type="button"
            onClick={addLineItem}
            className="p-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-indigo-600 dark:hover:bg-indigo-400 hover:text-white transition-colors cursor-pointer"
            title="Add item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Raw Notes */}
      <div className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-900">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block">
          Handwritten Notes / Context
        </label>
        <textarea
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          placeholder="e.g. Paid via card, deposit deducted £100, handwritten notes, etc."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-900">
        <div>
          {lowConfidenceCount > 0 ? (
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center space-x-1.5">
              <span>⚠️</span>
              <span>{lowConfidenceCount} field{lowConfidenceCount > 1 ? 's' : ''} need your review</span>
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center space-x-1.5">
              <span>✓</span>
              <span>All fields verified</span>
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            Discard
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>Save Expense</span>
            <span className="text-xs bg-indigo-700 dark:bg-indigo-700 px-2 py-0.5 rounded-md">
              {currency}{typeof amount === 'number' ? amount.toFixed(2) : '0.00'}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}

