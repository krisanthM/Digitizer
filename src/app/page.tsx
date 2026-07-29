'use client';

import { useState, useEffect } from 'react';
import ReceiptUploader from '@/components/ReceiptUploader';
import ExpenseDetailsForm from '@/components/ExpenseDetailsForm';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import ExpensesHistory from '@/components/ExpensesHistory';
import ThemeToggle from '@/components/ThemeToggle';
import { Expense, ProcessedReceiptResponse, ExpenseCategory, LineItem } from '@/types/expense';

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedReceipt, setScannedReceipt] = useState<ProcessedReceiptResponse | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string>('Offline Tesseract OCR');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // API Key Settings Modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [providerInput, setProviderInput] = useState<'gemini' | 'openai' | 'claude'>('gemini');

  // Fetch expenses history and check API key status on mount
  useEffect(() => {
    async function loadData() {
      // Load saved key from localStorage if present
      const savedKey = localStorage.getItem('digitizer_api_key');
      const savedProvider = localStorage.getItem('digitizer_api_provider') as 'gemini' | 'openai' | 'claude';
      if (savedKey) {
        setApiKeyInput(savedKey);
      }
      if (savedProvider) {
        setProviderInput(savedProvider);
      }

      try {
        // Load history
        const historyRes = await fetch('/api/expenses');
        if (historyRes.ok) {
          const data = await historyRes.json();
          setExpenses(data);
        }
      } catch (err) {
        console.error('Failed to load expenses:', err);
      } finally {
        setIsLoadingHistory(false);
      }

      try {
        // Check API status
        const statusRes = await fetch('/api/process-receipt');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setIsLiveApi(statusData.live || !!savedKey);
          setActiveProvider(savedKey ? `${savedProvider.toUpperCase()} Vision AI` : statusData.provider || 'Offline Tesseract OCR');
        }
      } catch (err) {
        console.error('Failed to check API status:', err);
      }
    }

    loadData();
  }, []);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('digitizer_api_key', apiKeyInput.trim());
      localStorage.setItem('digitizer_api_provider', providerInput);
      setIsLiveApi(true);
      setActiveProvider(`${providerInput.toUpperCase()} Vision AI`);
    } else {
      localStorage.removeItem('digitizer_api_key');
      localStorage.removeItem('digitizer_api_provider');
      setIsLiveApi(false);
      setActiveProvider('Offline Tesseract OCR');
    }
    setShowKeyModal(false);
  };

  // Handle receipt image processing
  const handleReceiptUpload = async (base64Image: string, sampleData?: ProcessedReceiptResponse) => {
    setIsProcessing(true);
    setUploadedImage(base64Image);
    setScannedReceipt(null);

    if (sampleData) {
      setTimeout(() => {
        setScannedReceipt(sampleData);
        setIsProcessing(false);
      }, 400);
      return;
    }

    const savedKey = localStorage.getItem('digitizer_api_key');
    const savedProvider = localStorage.getItem('digitizer_api_provider') || 'gemini';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (savedKey) {
      headers['x-api-key'] = savedKey;
      headers['x-provider'] = savedProvider;
    }

    try {
      const res = await fetch('/api/process-receipt', {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: base64Image }),
      });

      if (!res.ok) {
        throw new Error('API server returned error');
      }

      const parsedData = await res.json();
      
      if (parsedData.error) {
        console.warn('AI Extraction error, falling back to manual entry:', parsedData.details);
      }
      
      setScannedReceipt(parsedData);
    } catch (error) {
      console.error('Error processing receipt:', error);
      // Fallback empty form on server/connection error
      setScannedReceipt({
        vendor: null,
        date: null,
        amount: null,
        category: 'misc',
        line_items: [],
        confidence: { vendor: 0, date: 0, amount: 0, category: 0 },
        raw_notes: 'Server request failed. Please fill details manually.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save verified expense to storage
  const handleSaveExpense = async (finalData: {
    vendor: string | null;
    date: string | null;
    amount: number | null;
    currency?: string;
    category: ExpenseCategory;
    line_items: LineItem[];
    raw_notes: string | null;
  }) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...finalData,
          image_thumbnail: uploadedImage,
        }),
      });

      if (res.ok) {
        const savedExpense = await res.json();
        setExpenses((prev) => [savedExpense, ...prev]);
        setScannedReceipt(null);
        setUploadedImage(null);
      } else {
        alert('Failed to save expense');
      }
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('Error saving expense');
    }
  };

  // Clear all historical expenses
  const handleClearAllHistory = async () => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'DELETE',
      });
      if (res.ok) {
        setExpenses([]);
      } else {
        alert('Failed to clear expenses history.');
      }
    } catch (err) {
      console.error('Error clearing expenses history:', err);
      alert('Error clearing expenses history.');
    }
  };

  // Delete single expense
  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      } else {
        alert('Failed to delete expense');
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Error deleting expense');
    }
  };

  // Update expense
  const handleUpdateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updatedExpense = await res.json();
        setExpenses((prev) => prev.map((e) => (e.id === id ? updatedExpense : e)));
      } else {
        alert('Failed to update expense');
      }
    } catch (err) {
      console.error('Error updating expense:', err);
      alert('Error updating expense');
    }
  };

  // Manual entry
  const handleAddManually = () => {
    setUploadedImage(null);
    setScannedReceipt({
      vendor: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: 'misc',
      line_items: [],
      confidence: {
        vendor: 1.0,
        date: 1.0,
        amount: 1.0,
        category: 1.0,
      },
      raw_notes: 'Manually created record.',
    });
  };

  // Discard current scan
  const handleDiscard = () => {
    setScannedReceipt(null);
    setUploadedImage(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                <path d="M16 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">Digitizer</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Receipt OCR & Expense Hub</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Engine Status indicator & API Key Button */}
            <button
              onClick={() => setShowKeyModal(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                isLiveApi
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20'
              }`}
              title="Click to configure Vision AI API Key for handwriting OCR"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isLiveApi ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`} />
              <span>{activeProvider}</span>
              <span className="text-[10px] text-zinc-400 font-normal">⚙️</span>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Quick manual entry button */}
            {!scannedReceipt && (
              <button
                onClick={handleAddManually}
                id="add-manually-btn"
                className="px-4 py-2 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-indigo-600 dark:hover:bg-indigo-400 hover:text-white dark:hover:text-black shadow-sm font-semibold text-xs tracking-wide transition-all cursor-pointer"
              >
                Add Manually
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Scanner & Details Editor (takes 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {!scannedReceipt ? (
              <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6 shadow-xs">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Upload Receipt</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Select an image of your invoice, bill, handwritten note, or receipt to digitize it.
                  </p>
                </div>
                <ReceiptUploader onUpload={handleReceiptUpload} isProcessing={isProcessing} />
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs">
                {uploadedImage ? (
                  /* Split view for uploaded receipts: visual on left, editor on right */
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Left: Image Viewer */}
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Receipt View</span>
                        <button
                          onClick={() => {
                            const w = window.open();
                            w?.document.write(`<img src="${uploadedImage}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                          }}
                          className="text-[10px] text-indigo-500 hover:text-indigo-600 font-semibold"
                        >
                          Expand Image
                        </button>
                      </div>
                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 p-2 overflow-hidden flex items-center justify-center max-h-[350px] md:max-h-[500px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={uploadedImage}
                          alt="Receipt upload"
                          className="max-w-full max-h-[330px] md:max-h-[480px] object-contain rounded-lg"
                        />
                      </div>
                    </div>
                    {/* Right: Verification Form */}
                    <div className="md:col-span-3">
                      <ExpenseDetailsForm
                        initialData={scannedReceipt}
                        onSave={handleSaveExpense}
                        onDiscard={handleDiscard}
                      />
                    </div>
                  </div>
                ) : (
                  /* Full width editor for manual entries */
                  <ExpenseDetailsForm
                    initialData={scannedReceipt}
                    onSave={handleSaveExpense}
                    onDiscard={handleDiscard}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right Column - Stats & History */}
          <div className="space-y-8">
            {/* Analytics */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs">
              <AnalyticsPanel expenses={expenses} />
            </div>

            {/* History */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-zinc-300 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-xs">Loading expenses...</span>
                </div>
              ) : (
                <ExpensesHistory
                  expenses={expenses}
                  onDeleteExpense={handleDeleteExpense}
                  onUpdateExpense={handleUpdateExpense}
                  onClearHistory={handleClearAllHistory}
                />
              )}
            </div>
          </div>

        </div>
      </main>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Configure Vision AI Engine Key
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              For state-of-the-art handwritten receipt parsing, paste a Gemini 2.0, OpenAI, or Claude API key below. If blank, local Tesseract OCR will run.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  AI Provider
                </label>
                <select
                  value={providerInput}
                  onChange={(e) => setProviderInput(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="gemini">Google Gemini 2.0 Flash (Recommended for handwriting)</option>
                  <option value="openai">OpenAI GPT-4o Vision</option>
                  <option value="claude">Anthropic Claude 3.5 Sonnet</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy... or sk-..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 py-6 bg-white dark:bg-black text-center text-xs text-zinc-500">
        <p>© 2026 Digitizer. Crafted for small traders.</p>
      </footer>
    </div>
  );
}

