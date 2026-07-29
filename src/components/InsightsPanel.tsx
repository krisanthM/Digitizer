'use client';

import { useState, useEffect } from 'react';
import { InsightItem } from '@/app/api/generate-insights/route';

const CATEGORY_COLORS: Record<string, string> = {
  meals: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  inventory: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  transport: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  utilities: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  rent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  supplies: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  equipment: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  marketing: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
  repairs: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  software: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  services: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  taxes: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  insurance: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  misc: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
};

interface InsightsPanelProps {
  expensesCount: number;
}

export default function InsightsPanel({ expensesCount }: InsightsPanelProps) {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [insufficientData, setInsufficientData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const savedKey = localStorage.getItem('digitizer_api_key');
    const savedProvider = localStorage.getItem('digitizer_api_provider') || 'gemini';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (savedKey) {
      headers['x-api-key'] = savedKey;
      headers['x-provider'] = savedProvider;
    }

    try {
      const res = await fetch('/api/generate-insights', {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await res.json();
      if (data.insufficient_data) {
        setInsufficientData(true);
        setInsights([]);
      } else {
        setInsufficientData(false);
        setInsights(data.insights || []);
      }
    } catch (err: any) {
      console.error('Error fetching insights:', err);
      setErrorMessage(err.message || 'Error generating insights');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (expensesCount >= 5) {
      fetchInsights();
    } else {
      setInsufficientData(true);
    }
  }, [expensesCount]);

  if (insufficientData || expensesCount < 5) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <span>💡 Root-Cause Spend Insights</span>
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              AI-driven pattern recognition over spending behavior
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-center space-y-2">
          <span className="text-3xl block">🔍</span>
          <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
            Add a few more expenses to unlock insights
          </h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Digitizer needs at least 5 saved expense records to detect non-obvious spending clusters, supplier trends, and root causes. ({expensesCount}/5 saved)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
            <span>💡 Root-Cause Spend Insights</span>
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            AI-driven pattern recognition & cost drivers
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-semibold shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>Refresh Insights</span>
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          {errorMessage}
        </div>
      )}

      <div className="space-y-3">
        {insights.map((item, idx) => {
          const catStyle = CATEGORY_COLORS[item.category_tag.toLowerCase()] || CATEGORY_COLORS.misc;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xs space-y-2 hover:border-indigo-500/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border ${catStyle}`}>
                  {item.category_tag}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold">Insight #{idx + 1}</span>
              </div>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                {item.observation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
