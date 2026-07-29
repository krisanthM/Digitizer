'use client';

import { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, LineItem } from '@/types/expense';

interface ExpensesHistoryProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onClearHistory?: () => void;
}

const CATEGORY_STYLES: Record<ExpenseCategory, { label: string; badge: string }> = {
  meals: {
    label: 'Food & Dining 🍷',
    badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30',
  },
  inventory: {
    label: 'Inventory 📦',
    badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/30',
  },
  transport: {
    label: 'Transport 🚚',
    badge: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/30',
  },
  utilities: {
    label: 'Utilities ⚡',
    badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30',
  },
  rent: {
    label: 'Rent 🏢',
    badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/30',
  },
  supplies: {
    label: 'Supplies 🛒',
    badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30',
  },
  equipment: {
    label: 'Equipment ⚙️',
    badge: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/30',
  },
  marketing: {
    label: 'Marketing 📢',
    badge: 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200/50 dark:border-fuchsia-800/30',
  },
  repairs: {
    label: 'Repairs 🛠️',
    badge: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/50 dark:border-orange-800/30',
  },
  software: {
    label: 'Software 💻',
    badge: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-800/30',
  },
  services: {
    label: 'Services 💼',
    badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30',
  },
  taxes: {
    label: 'Taxes 🏛️',
    badge: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/30',
  },
  insurance: {
    label: 'Insurance 🛡️',
    badge: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/30',
  },
  misc: {
    label: 'Misc 📁',
    badge: 'bg-zinc-100 dark:bg-zinc-900 text-zinc-750 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800',
  },
};

export default function ExpensesHistory({ expenses, onDeleteExpense, onUpdateExpense, onClearHistory }: ExpensesHistoryProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [includeConfidenceExport, setIncludeConfidenceExport] = useState(false);

  // Form states for modal edit
  const [editVendor, setEditVendor] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState<number | ''>('');
  const [editCurrency, setEditCurrency] = useState<string>('₹');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('misc');
  const [editLineItems, setEditLineItems] = useState<LineItem[]>([]);
  const [editNotes, setEditNotes] = useState('');

  // Lightbox Modal state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No Date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getConfidenceColor = (score?: number) => {
    if (score === undefined || score === 1.0) return 'text-zinc-400 dark:text-zinc-500';
    if (score >= 0.8) return 'text-emerald-500 dark:text-emerald-400';
    if (score >= 0.5) return 'text-amber-500 dark:text-amber-400';
    return 'text-rose-500 dark:text-rose-400';
  };

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        !searchQuery ||
        (e.vendor && e.vendor.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.raw_notes && e.raw_notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.line_items && e.line_items.some((item) => item.description.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, selectedCategory]);

  // CSV Export handler
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert('No expense records to export.');
      return;
    }

    const headers = [
      'ID',
      'Vendor',
      'Transaction Date',
      'Amount',
      'Currency',
      'Category',
      'Line Items',
      'Raw Notes',
      'Created At',
      ...(includeConfidenceExport ? ['Vendor Conf', 'Date Conf', 'Amount Conf', 'Category Conf'] : []),
    ];

    const rows = filteredExpenses.map((e) => [
      `"${e.id}"`,
      `"${(e.vendor || '').replace(/"/g, '""')}"`,
      `"${e.date || ''}"`,
      e.amount || 0,
      `"${e.currency || '₹'}"`,
      `"${e.category}"`,
      `"${(e.line_items || []).map((i) => `${i.description}: ${e.currency || '₹'}${i.amount}`).join('; ').replace(/"/g, '""')}"`,
      `"${(e.raw_notes || '').replace(/"/g, '""')}"`,
      `"${e.created_at}"`,
      ...(includeConfidenceExport
        ? [
            `"${Math.round((e.confidence?.vendor ?? 1.0) * 100)}%"`,
            `"${Math.round((e.confidence?.date ?? 1.0) * 100)}%"`,
            `"${Math.round((e.confidence?.amount ?? 1.0) * 100)}%"`,
            `"${Math.round((e.confidence?.category ?? 1.0) * 100)}%"`,
          ]
        : []),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `digitizer_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable PDF Report Handler
  const handlePrintPDF = () => {
    if (filteredExpenses.length === 0) {
      alert('No expense records to print.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to open the PDF report window.');
      return;
    }

    const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const mainCurr = filteredExpenses[0]?.currency || '₹';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Digitizer Expense Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #09090b; background: #fff; }
          .header { border-bottom: 2px solid #e4e4e7; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          h1 { margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; }
          .subtitle { color: #71717a; font-size: 12px; margin: 4px 0 0 0; }
          .kpi { background: #f4f4f5; border: 1px solid #e4e4e7; padding: 15px 20px; border-radius: 12px; margin-bottom: 25px; }
          .kpi-title { font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 700; margin: 0; }
          .kpi-val { font-size: 26px; font-weight: 800; margin: 5px 0 0 0; color: #18181b; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #18181b; color: #ffffff; text-align: left; padding: 10px 12px; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
          td { border-bottom: 1px solid #e4e4e7; padding: 10px 12px; vertical-align: top; }
          tr:nth-child(even) { background-color: #fafafa; }
          .items { margin: 4px 0 0 0; padding-left: 16px; font-size: 11px; color: #52525b; }
          .items li { margin-bottom: 2px; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #e4e4e7; color: #27272a; text-transform: uppercase; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Digitizer Tax & Expense Report</h1>
            <p class="subtitle">Generated on ${new Date().toLocaleString()} • Total ${filteredExpenses.length} Records</p>
          </div>
        </div>

        <div class="kpi">
          <p class="kpi-title">Total Filtered Spending</p>
          <p class="kpi-val">${mainCurr}${totalAmount.toFixed(2)}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor / Merchant</th>
              <th>Category</th>
              <th>Line Items Breakdown</th>
              ${includeConfidenceExport ? '<th>Confidence</th>' : ''}
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filteredExpenses.map((e) => `
              <tr>
                <td style="white-space: nowrap;">${e.date || 'N/A'}</td>
                <td><strong>${e.vendor || 'Scanned Receipt'}</strong></td>
                <td><span class="badge">${e.category}</span></td>
                <td>
                  ${(e.line_items && e.line_items.length > 0)
                    ? `<ul class="items">${e.line_items.map((i) => `<li>${i.description}: <strong>${e.currency || '₹'}${i.amount}</strong></li>`).join('')}</ul>`
                    : (e.raw_notes ? `<span style="font-style: italic; color:#71717a;">${e.raw_notes}</span>` : 'No item breakdown')}
                </td>
                ${includeConfidenceExport ? `<td>
                  Vendor: ${Math.round((e.confidence?.vendor ?? 1.0) * 100)}%<br>
                  Amount: ${Math.round((e.confidence?.amount ?? 1.0) * 100)}%<br>
                  Date: ${Math.round((e.confidence?.date ?? 1.0) * 100)}%
                </td>` : ''}
                <td style="text-align: right; font-weight: bold; white-space: nowrap;">${e.currency || '₹'}${Number(e.amount || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWin.document.write(html);
    printWin.document.close();
  };

  // Open modal in View mode
  const handleOpenDetail = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditing(false);
  };

  // Switch modal to Edit mode
  const handleStartEdit = () => {
    if (!selectedExpense) return;
    setEditVendor(selectedExpense.vendor || '');
    setEditDate(selectedExpense.date || '');
    setEditAmount(selectedExpense.amount !== null ? selectedExpense.amount : '');
    setEditCurrency(selectedExpense.currency || '₹');
    setEditCategory(selectedExpense.category || 'misc');
    setEditLineItems(selectedExpense.line_items ? [...selectedExpense.line_items] : []);
    setEditNotes(selectedExpense.raw_notes || '');
    setIsEditing(true);
  };

  // Save changes from Edit mode
  const handleSaveEdit = () => {
    if (!selectedExpense || !onUpdateExpense) return;
    const updates: Partial<Expense> = {
      vendor: editVendor.trim() || null,
      date: editDate || null,
      amount: editAmount === '' ? null : Number(editAmount),
      currency: editCurrency,
      category: editCategory,
      line_items: editLineItems,
      raw_notes: editNotes.trim() || null,
    };

    onUpdateExpense(selectedExpense.id, updates);
    setSelectedExpense((prev) => (prev ? { ...prev, ...updates } : null));
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header & Export Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Scanned History
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            View, filter, edit & export historical expense records
          </p>
        </div>

        <div className="flex flex-wrap items-center space-x-2 w-full sm:w-auto justify-end gap-y-2">
          {/* Confidence Export Toggle */}
          <label className="flex items-center space-x-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium cursor-pointer pr-2">
            <input
              type="checkbox"
              checked={includeConfidenceExport}
              onChange={(e) => setIncludeConfidenceExport(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Include Confidence Scores</span>
          </label>

          {expenses.length > 0 && onClearHistory && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all historical expense records? This action cannot be undone.')) {
                  onClearHistory();
                }
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-xs font-semibold cursor-pointer"
              title="Clear all expense records"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
              <span>Clear</span>
            </button>
          )}

          <button
            onClick={handlePrintPDF}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold cursor-pointer"
            title="Generate printable PDF report"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>
            </svg>
            <span>PDF Report</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold cursor-pointer"
            title="Export records to CSV file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Search bar */}
          <div className="relative sm:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor, item or note..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Categories ({expenses.length})</option>
            <option value="meals">🍷 Food & Dining</option>
            <option value="inventory">📦 Inventory / Resale</option>
            <option value="transport">🚚 Transport & Fuel</option>
            <option value="utilities">⚡ Utilities & Bills</option>
            <option value="rent">🏢 Rent & Space</option>
            <option value="supplies">🛒 Store Supplies</option>
            <option value="equipment">⚙️ Equipment</option>
            <option value="marketing">📢 Marketing & Ads</option>
            <option value="repairs">🛠️ Repairs & Maintenance</option>
            <option value="software">💻 Software & Subscriptions</option>
            <option value="services">💼 Professional Services</option>
            <option value="taxes">🏛️ Taxes & GST</option>
            <option value="insurance">🛡️ Insurance</option>
            <option value="misc">📁 Miscellaneous</option>
          </select>
        </div>
      )}

      {/* Expenses Table */}
      {filteredExpenses.length > 0 ? (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-xs font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3">Vendor / Merchant</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Receipt</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {filteredExpenses.map((expense) => {
                  const style = CATEGORY_STYLES[expense.category] || CATEGORY_STYLES.misc;
                  const curr = expense.currency || '₹';

                  return (
                    <tr
                      key={expense.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 text-sm transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                        <div className="flex items-center space-x-2">
                          <span>{expense.vendor || 'Scanned Receipt'}</span>
                          {expense.line_items && expense.line_items.length > 0 && (
                            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded-md font-medium">
                              {expense.line_items.length} items
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-zinc-950 dark:text-white whitespace-nowrap">
                        {curr}{expense.amount !== null ? expense.amount.toFixed(2) : '0.00'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {expense.image_thumbnail ? (
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxImage(expense.image_thumbnail);
                              setZoomLevel(1);
                              setRotation(0);
                            }}
                            className="relative group inline-block cursor-pointer"
                            title="Click to zoom receipt"
                          >
                            <img
                              src={expense.image_thumbnail}
                              alt="Receipt thumb"
                              className="w-8 h-8 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs group-hover:opacity-80 transition-opacity"
                            />
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenDetail(expense)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="View / Edit details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => onDeleteExpense(expense.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Delete expense"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl text-center space-y-2">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {expenses.length === 0 ? 'No historical expenses saved yet' : 'No expenses match search criteria'}
          </p>
          <p className="text-[11px] text-zinc-400 max-w-xs">
            {expenses.length === 0
              ? 'Upload a receipt on the left panel to begin scanning and organizing.'
              : 'Try clearing your search query or switching categories.'}
          </p>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {isEditing ? 'Edit Expense Record' : 'Expense Details'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                ✕
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Vendor</label>
                    <input
                      type="text"
                      value={editVendor}
                      onChange={(e) => setEditVendor(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border rounded-xl dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border rounded-xl dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Amount ({editCurrency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs border rounded-xl dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-1.5 text-xs border rounded-xl dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-white"
                    >
                      <option value="meals">🍷 Food & Dining</option>
                      <option value="inventory">📦 Inventory</option>
                      <option value="transport">🚚 Transport</option>
                      <option value="utilities">⚡ Utilities</option>
                      <option value="rent">🏢 Rent</option>
                      <option value="supplies">🛒 Supplies</option>
                      <option value="equipment">⚙️ Equipment</option>
                      <option value="marketing">📢 Marketing</option>
                      <option value="repairs">🛠️ Repairs</option>
                      <option value="software">💻 Software</option>
                      <option value="services">💼 Services</option>
                      <option value="taxes">🏛️ Taxes</option>
                      <option value="insurance">🛡️ Insurance</option>
                      <option value="misc">📁 Misc</option>
                    </select>
                  </div>
                </div>

                {/* Edit Line Items */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Line Items</label>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {editLineItems.map((item, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const copy = [...editLineItems];
                            copy[i].description = e.target.value;
                            setEditLineItems(copy);
                          }}
                          className="flex-1 px-2 py-1 text-xs border rounded-lg dark:border-zinc-800 bg-transparent"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => {
                            const copy = [...editLineItems];
                            copy[i].amount = Number(e.target.value) || 0;
                            setEditLineItems(copy);
                          }}
                          className="w-20 px-2 py-1 text-xs border rounded-lg dark:border-zinc-800 bg-transparent text-right font-bold"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t dark:border-zinc-900">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border dark:border-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                      {selectedExpense.vendor || 'Scanned Receipt'}
                    </h4>
                    <p className="text-xs text-zinc-500">{formatDate(selectedExpense.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                      {selectedExpense.currency || '₹'}{selectedExpense.amount?.toFixed(2)}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[selectedExpense.category]?.badge || ''}`}>
                      {CATEGORY_STYLES[selectedExpense.category]?.label || selectedExpense.category}
                    </span>
                  </div>
                </div>

                {/* Line Items */}
                {selectedExpense.line_items && selectedExpense.line_items.length > 0 && (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-900">
                        <tr>
                          <th className="px-3 py-1.5">Item</th>
                          <th className="px-3 py-1.5 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                        {selectedExpense.line_items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-1.5">{item.description}</td>
                            <td className="px-3 py-1.5 text-right font-bold">
                              {selectedExpense.currency || '₹'}{item.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Raw Notes */}
                {selectedExpense.raw_notes && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-zinc-500 uppercase text-[10px]">Notes & OCR Text</p>
                    <p className="text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap">
                      {selectedExpense.raw_notes}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2 border-t dark:border-zinc-900">
                  {onUpdateExpense && (
                    <button
                      onClick={handleStartEdit}
                      className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white cursor-pointer"
                    >
                      Edit Expense
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Receipt Image View & Rotation */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative max-w-3xl w-full flex flex-col items-center justify-center space-y-3">
            {/* Controls header */}
            <div className="flex items-center space-x-3 bg-zinc-900/90 border border-zinc-800 px-4 py-2 rounded-full text-white text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="hover:text-indigo-400 font-bold px-2 cursor-pointer"
                title="Zoom Out"
              >
                - Zoom
              </button>
              <span>{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="hover:text-indigo-400 font-bold px-2 cursor-pointer"
                title="Zoom In"
              >
                + Zoom
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="hover:text-indigo-400 font-bold px-2 cursor-pointer"
                title="Rotate 90°"
              >
                🔄 Rotate
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="text-rose-400 font-bold px-2 cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            {/* Image container */}
            <div className="overflow-auto max-h-[80vh] w-full flex justify-center p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
              <img
                src={lightboxImage}
                alt="Full Scanned Receipt"
                className="object-contain transition-transform duration-200 rounded-lg shadow-2xl"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
