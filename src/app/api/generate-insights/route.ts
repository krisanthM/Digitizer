import { NextResponse } from 'next/server';
import { getExpenses } from '@/lib/expensesStore';
import { Expense } from '@/types/expense';

export interface InsightItem {
  observation: string;
  category_tag: string;
}

function generateOfflineInsights(expenses: Expense[]): InsightItem[] {
  const insights: InsightItem[] = [];

  // Group by category
  const categoryTotals: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const vendorTotals: Record<string, { total: number; count: number; category: string }> = {};
  const dayOfWeekSpend: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let totalAmount = 0;

  expenses.forEach((e) => {
    const amt = Number(e.amount) || 0;
    totalAmount += amt;

    const cat = e.category || 'misc';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    const vendor = (e.vendor || 'Unspecified').trim();
    if (!vendorTotals[vendor]) {
      vendorTotals[vendor] = { total: 0, count: 0, category: cat };
    }
    vendorTotals[vendor].total += amt;
    vendorTotals[vendor].count += 1;

    if (e.date) {
      try {
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) {
          const dayName = dayNames[d.getDay()];
          dayOfWeekSpend[dayName] = (dayOfWeekSpend[dayName] || 0) + amt;
        }
      } catch {}
    }
  });

  // 1. Analyze Category Concentration Root Cause
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0) {
    const [topCat, topCatAmount] = sortedCategories[0];
    const percentage = Math.round((topCatAmount / Math.max(1, totalAmount)) * 100);
    const topVendorForCat = Object.entries(vendorTotals)
      .filter(([_, data]) => data.category === topCat)
      .sort((a, b) => b[1].total - a[1].total)[0];

    let obs = `${topCat.toUpperCase()} accounts for ${percentage}% of overall spend.`;
    if (topVendorForCat) {
      obs += ` The primary root cause is repeat transactions with "${topVendorForCat[0]}" (${topVendorForCat[1].count} receipts totaling ₹${topVendorForCat[1].total.toFixed(2)}).`;
    }
    insights.push({
      observation: obs,
      category_tag: topCat,
    });
  }

  // 2. Day of Week Pattern Detection
  const sortedDays = Object.entries(dayOfWeekSpend).sort((a, b) => b[1] - a[1]);
  if (sortedDays.length > 0 && sortedDays[0][1] > 0) {
    const peakDay = sortedDays[0][0];
    const peakAmount = sortedDays[0][1];
    const peakPercentage = Math.round((peakAmount / Math.max(1, totalAmount)) * 100);

    insights.push({
      observation: `Spend peaks heavily on ${peakDay}s (${peakPercentage}% of total outgoings). Consider scheduling inventory orders or trips earlier in the week to streamline cashflow.`,
      category_tag: sortedCategories[0]?.[0] || 'transport',
    });
  }

  // 3. Repeat Vendor Frequency Anomaly
  const repeatVendors = Object.entries(vendorTotals).filter(([_, data]) => data.count >= 2);
  if (repeatVendors.length > 0) {
    const mostFrequent = repeatVendors.sort((a, b) => b[1].count - a[1].count)[0];
    insights.push({
      observation: `High repeat frequency with "${mostFrequent[0]}" (${mostFrequent[1].count} visits). Consolidating into bulk single orders could lower per-unit transportation and invoice processing costs.`,
      category_tag: mostFrequent[1].category,
    });
  } else if (sortedCategories.length > 1) {
    const secondCat = sortedCategories[1];
    insights.push({
      observation: `Secondary expenditure is driven by ${secondCat[0].toUpperCase()} (${Math.round((secondCat[1] / Math.max(1, totalAmount)) * 100)}% of total). Check for non-essential subscriptions or recurring vendor price increases.`,
      category_tag: secondCat[0],
    });
  }

  return insights.slice(0, 4);
}

export async function POST(request: Request) {
  try {
    const expenses = await getExpenses();

    if (expenses.length < 5) {
      return NextResponse.json({
        insufficient_data: true,
        message: 'Add at least 5 expenses to unlock root-cause spend insights.',
        insights: [],
      });
    }

    const customKey = request.headers.get('x-api-key')?.trim();
    const customProvider = request.headers.get('x-provider')?.trim() || 'gemini';

    const apiKey = customKey || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      // Offline heuristic fallback
      const offlineInsights = generateOfflineInsights(expenses);
      return NextResponse.json({
        insufficient_data: false,
        insights: offlineInsights,
        source: 'heuristic',
      });
    }

    // Prepare structured summary for AI prompt
    const expenseSummary = expenses.slice(0, 50).map((e) => ({
      vendor: e.vendor || 'Unknown',
      date: e.date || 'Unknown',
      amount: e.amount || 0,
      currency: e.currency || '₹',
      category: e.category,
      items_count: e.line_items?.length || 0,
    }));

    const prompt = `You are a financial analyst specializing in small business expense root-cause insights.
Analyze these ${expenseSummary.length} expense records:
${JSON.stringify(expenseSummary, null, 2)}

INSTRUCTIONS:
Find 2-4 SPECIFIC, non-obvious patterns or root causes for spending trends.
DO NOT just restate overall totals, averages, or top vendors (the user already sees those stats).
Instead, look for:
- Trends over time or repeated patterns tied to specific days/vendors/categories.
- Sudden clusters that suggest a root cause (e.g. "transport costs rose mainly due to repeated late-week trips to the same supplier").
- Opportunities for cost reduction or workflow efficiency.

Respond STRICTLY with valid JSON in this shape:
{
  "insights": [
    {
      "observation": "detailed observation string...",
      "category_tag": "category_name (e.g. inventory, transport, meals, utilities, supplies, etc.)"
    }
  ]
}`;

    let insightsResult: InsightItem[] = [];

    if (customProvider === 'claude' || process.env.ANTHROPIC_API_KEY) {
      const claudeKey = customKey || process.env.ANTHROPIC_API_KEY!;
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        const rawText = resData.content?.[0]?.text;
        if (rawText) {
          const cleaned = rawText.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
          const parsed = JSON.parse(cleaned);
          insightsResult = parsed.insights || [];
        }
      }
    } else if (customProvider === 'openai' || process.env.OPENAI_API_KEY) {
      const openAiKey = customKey || process.env.OPENAI_API_KEY!;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        const rawText = resData.choices?.[0]?.message?.content;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          insightsResult = parsed.insights || [];
        }
      }
    } else if (customProvider === 'gemini' || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      const gemKey = customKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY!;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          insightsResult = parsed.insights || [];
        }
      }
    }

    if (!insightsResult || insightsResult.length === 0) {
      insightsResult = generateOfflineInsights(expenses);
    }

    return NextResponse.json({
      insufficient_data: false,
      insights: insightsResult,
      source: 'ai',
    });
  } catch (error: any) {
    console.error('Error generating insights:', error);
    // Fallback to offline heuristic insights on error
    try {
      const expenses = await getExpenses();
      const offlineInsights = generateOfflineInsights(expenses);
      return NextResponse.json({
        insufficient_data: false,
        insights: offlineInsights,
        source: 'heuristic_fallback',
      });
    } catch {
      return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
    }
  }
}
