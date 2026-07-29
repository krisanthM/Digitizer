'use client';

import { useState } from 'react';
import { Expense, ExpenseCategory } from '@/types/expense';
import InsightsPanel from '@/components/InsightsPanel';


interface AnalyticsPanelProps {
  expenses: Expense[];
}

interface CategorySummary {
  category: ExpenseCategory;
  label: string;
  amount: number;
  percentage: number;
  color: string;
  textColor: string;
  bgLight: string;
}

const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; textColor: string; bgLight: string }> = {
  meals: {
    label: 'Food, Dining & Hospitality',
    color: '#8b5cf6', // Violet
    textColor: 'text-purple-600 dark:text-purple-400',
    bgLight: 'bg-purple-500/5 dark:bg-purple-500/10',
  },
  inventory: {
    label: 'Inventory / Goods for Resale',
    color: '#6366f1', // Indigo
    textColor: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-500/5 dark:bg-indigo-500/10',
  },
  transport: {
    label: 'Transport, Fuel & Travel',
    color: '#0ea5e9', // Sky
    textColor: 'text-sky-600 dark:text-sky-400',
    bgLight: 'bg-sky-500/5 dark:bg-sky-500/10',
  },
  utilities: {
    label: 'Utilities & Bills',
    color: '#f59e0b', // Amber
    textColor: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-500/5 dark:bg-amber-500/10',
  },
  rent: {
    label: 'Rent & Space',
    color: '#f43f5e', // Rose
    textColor: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-500/5 dark:bg-rose-500/10',
  },
  supplies: {
    label: 'Store Supplies & Stationery',
    color: '#10b981', // Emerald
    textColor: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-500/5 dark:bg-emerald-500/10',
  },
  equipment: {
    label: 'Equipment & Machinery',
    color: '#06b6d4', // Cyan
    textColor: 'text-cyan-600 dark:text-cyan-400',
    bgLight: 'bg-cyan-500/5 dark:bg-cyan-500/10',
  },
  marketing: {
    label: 'Marketing & Advertising',
    color: '#d946ef', // Fuchsia
    textColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    bgLight: 'bg-fuchsia-500/5 dark:bg-fuchsia-500/10',
  },
  repairs: {
    label: 'Repairs & Maintenance',
    color: '#f97316', // Orange
    textColor: 'text-orange-600 dark:text-orange-400',
    bgLight: 'bg-orange-500/5 dark:bg-orange-500/10',
  },
  software: {
    label: 'Software & Subscriptions',
    color: '#7c3aed', // Purple-Deep
    textColor: 'text-violet-600 dark:text-violet-400',
    bgLight: 'bg-violet-500/5 dark:bg-violet-500/10',
  },
  services: {
    label: 'Professional Fees & Legal',
    color: '#2563eb', // Blue
    textColor: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-500/5 dark:bg-blue-500/10',
  },
  taxes: {
    label: 'Taxes, GST & Licenses',
    color: '#dc2626', // Red
    textColor: 'text-red-600 dark:text-red-400',
    bgLight: 'bg-red-500/5 dark:bg-red-500/10',
  },
  insurance: {
    label: 'Insurance & Coverage',
    color: '#0d9488', // Teal
    textColor: 'text-teal-600 dark:text-teal-400',
    bgLight: 'bg-teal-500/5 dark:bg-teal-500/10',
  },
  misc: {
    label: 'Miscellaneous',
    color: '#71717a', // Zinc
    textColor: 'text-zinc-600 dark:text-zinc-400',
    bgLight: 'bg-zinc-500/5 dark:bg-zinc-500/10',
  },
};

export default function AnalyticsPanel({ expenses }: AnalyticsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null);
  const [budgetLimit, setBudgetLimit] = useState<number>(5000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('5000');

  // Detect dominant currency
  const primaryCurrency = expenses.find((e) => e.currency)?.currency || '₹';

  const totalSpend = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Group by category
  const categoryGrouped: Record<ExpenseCategory, number> = {
    meals: 0,
    inventory: 0,
    transport: 0,
    utilities: 0,
    rent: 0,
    supplies: 0,
    equipment: 0,
    marketing: 0,
    repairs: 0,
    software: 0,
    services: 0,
    taxes: 0,
    insurance: 0,
    misc: 0,
  };

  expenses.forEach((e) => {
    const cat = e.category || 'misc';
    if (categoryGrouped[cat] !== undefined) {
      categoryGrouped[cat] += e.amount || 0;
    } else {
      categoryGrouped.misc += e.amount || 0;
    }
  });

  const summaries: CategorySummary[] = Object.entries(categoryGrouped)
    .map(([cat, amt]) => {
      const category = cat as ExpenseCategory;
      const meta = CATEGORY_META[category] || CATEGORY_META.misc;
      return {
        category,
        label: meta.label,
        amount: Math.round(amt * 100) / 100,
        percentage: totalSpend > 0 ? (amt / totalSpend) * 100 : 0,
        color: meta.color,
        textColor: meta.textColor,
        bgLight: meta.bgLight,
      };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Spending insights
  const avgExpense = expenses.length > 0 ? Math.round((totalSpend / expenses.length) * 100) / 100 : 0;
  const maxExpense = expenses.length > 0 ? Math.max(...expenses.map((e) => e.amount || 0)) : 0;
  const totalLineItems = expenses.reduce((count, e) => count + (e.line_items?.length || 0), 0);

  // Top Vendor
  const vendorCounts: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.vendor) {
      vendorCounts[e.vendor] = (vendorCounts[e.vendor] || 0) + (e.amount || 0);
    }
  });
  const topVendorEntry = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0];
  const topVendor = topVendorEntry ? topVendorEntry[0] : 'None';

  // Donut chart calculations
  const RADIUS = 40;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  let accumulatedPercent = 0;

  // Budget calculations
  const budgetUsedPercent = budgetLimit > 0 ? Math.min(100, Math.round((totalSpend / budgetLimit) * 100)) : 0;
  const isOverBudget = totalSpend > budgetLimit;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Analytics & Insights
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Live statistics of processed receipts & budget tracking
        </p>
      </div>

      {/* Main KPI Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-xs">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-full pointer-events-none" />
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Total Expenses Tracker
          </p>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            {primaryCurrency} Main Currency
          </span>
        </div>
        
        <p className="text-3xl font-extrabold text-zinc-950 dark:text-white mt-1.5 tracking-tight">
          {primaryCurrency}{totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        
        <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{expenses.length} receipt{expenses.length !== 1 ? 's' : ''} saved</span>
          <span>•</span>
          <span>{totalLineItems} total line items</span>
        </div>
      </div>

      {/* Monthly Budget Tracker Card */}
      <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base">🎯</span>
            <div>
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Monthly Spending Budget
              </h3>
              <p className="text-[10px] text-zinc-400">Target limit & alert threshold</p>
            </div>
          </div>
          {isEditingBudget ? (
            <div className="flex items-center space-x-1">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-20 px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg bg-transparent text-zinc-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  setBudgetLimit(Number(budgetInput) || 5000);
                  setIsEditingBudget(false);
                }}
                className="px-2 py-1 text-xs bg-indigo-600 text-white font-bold rounded-lg"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBudgetInput(String(budgetLimit));
                setIsEditingBudget(true);
              }}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Set Limit ({primaryCurrency}{budgetLimit})
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className={isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-600 dark:text-zinc-400'}>
              {budgetUsedPercent}% Used
            </span>
            <span className="text-zinc-500">
              {primaryCurrency}{totalSpend.toFixed(2)} / {primaryCurrency}{budgetLimit.toFixed(2)}
            </span>
          </div>
          <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isOverBudget
                  ? 'bg-rose-500'
                  : budgetUsedPercent > 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, budgetUsedPercent)}%` }}
            />
          </div>
          {isOverBudget && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
              ⚠️ Warning: Spending exceeds set budget by {primaryCurrency}{(totalSpend - budgetLimit).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Spending Insights Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl space-y-1">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase">Avg Bill Cost</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {primaryCurrency}{avgExpense.toFixed(2)}
          </p>
        </div>
        <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl space-y-1">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase">Highest Bill</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {primaryCurrency}{maxExpense.toFixed(2)}
          </p>
        </div>
        <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl space-y-1 col-span-2">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase">Top Vendor</p>
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate">
            {topVendor}
          </p>
        </div>
      </div>

      {/* Donut Chart and Category Distribution */}
      {summaries.length > 0 ? (
        <div className="flex flex-col space-y-4 p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              Category Breakdown
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">
              {summaries.length} active categor{summaries.length === 1 ? 'y' : 'ies'}
            </span>
          </div>

          {/* Centered Chart Wrapper */}
          <div className="flex justify-center relative py-1">
            <svg width="140" height="140" viewBox="0 0 100 100" className="transform -rotate-90 filter drop-shadow-xs">
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="transparent"
                stroke="currentColor"
                strokeWidth="10"
                className="text-zinc-100 dark:text-zinc-900"
              />
              {summaries.map((summary) => {
                const dashLength = (summary.percentage / 100) * CIRCUMFERENCE;
                const offset = (accumulatedPercent / 100) * CIRCUMFERENCE;
                accumulatedPercent += summary.percentage;
                const isActive = activeCategory === summary.category;

                return (
                  <circle
                    key={summary.category}
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="transparent"
                    stroke={summary.color}
                    strokeWidth={isActive ? "13" : "10"}
                    strokeDasharray={`${dashLength} ${CIRCUMFERENCE - dashLength}`}
                    strokeDashoffset={-offset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setActiveCategory(summary.category)}
                    onMouseLeave={() => setActiveCategory(null)}
                  />
                );
              })}
            </svg>

            {/* Inner text details */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              {activeCategory ? (
                <>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {activeCategory}
                  </span>
                  <span className="text-base font-extrabold text-zinc-900 dark:text-white">
                    {Math.round((categoryGrouped[activeCategory] / totalSpend) * 100)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Expenses
                  </span>
                  <span className="text-base font-extrabold text-zinc-900 dark:text-white">
                    {expenses.length} Total
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Formatted Legend List */}
          <div className="space-y-1.5 pt-1">
            {summaries.map((summary) => {
              const isActive = activeCategory === summary.category;
              return (
                <div
                  key={summary.category}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all duration-200 cursor-pointer border ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-2xs'
                      : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  }`}
                  onMouseEnter={() => setActiveCategory(summary.category)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: summary.color }}
                    />
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug break-words">
                      {summary.label}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800/60">
                      {Math.round(summary.percentage)}%
                    </span>
                    <span className="text-xs font-extrabold text-zinc-950 dark:text-white">
                      {primaryCurrency}{Math.round(summary.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 rounded-2xl text-center space-y-2">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>
            </svg>
          </div>
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No category data yet</p>
          <p className="text-[10px] text-zinc-400 max-w-xs">Scan and save receipt images to populate your expense distribution analysis.</p>
        </div>
      )}

      {/* Root-Cause Spend Insights Section */}
      <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
        <InsightsPanel expensesCount={expenses.length} />
      </div>
    </div>
  );
}

