'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { ProcessedReceiptResponse } from '@/types/expense';

interface ReceiptUploaderProps {
  onUpload: (base64Image: string, sampleData?: ProcessedReceiptResponse) => void;
  isProcessing: boolean;
}

function generateSampleReceiptImage(
  title: string,
  subtitle: string,
  items: { desc: string; amt: string }[],
  total: string
): string {
  if (typeof window === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background receipt paper
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, 400, 480);

  // Outer stroke
  ctx.strokeStyle = '#e2ded4';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 376, 456);

  // Header
  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 200, 52);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#71717a';
  ctx.fillText(subtitle, 200, 74);
  ctx.fillText(`Date: ${new Date().toISOString().split('T')[0]}  |  Invoice #9201`, 200, 94);

  // Divider
  ctx.strokeStyle = '#d4d4d8';
  ctx.beginPath();
  ctx.moveTo(30, 114);
  ctx.lineTo(370, 114);
  ctx.stroke();

  // Items
  let y = 145;
  items.forEach((item) => {
    ctx.font = '13px monospace';
    ctx.fillStyle = '#27272a';
    ctx.textAlign = 'left';
    ctx.fillText(item.desc, 35, y);
    ctx.textAlign = 'right';
    ctx.fillText(`₹${item.amt}`, 365, y);
    y += 35;
  });

  // Divider
  ctx.strokeStyle = '#d4d4d8';
  ctx.beginPath();
  ctx.moveTo(30, y + 10);
  ctx.lineTo(370, y + 10);
  ctx.stroke();

  // Total
  y += 45;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#09090b';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL PAID:', 35, y);
  ctx.textAlign = 'right';
  ctx.fillText(`₹${total}`, 365, y);

  // Footer stamp
  ctx.font = 'italic 12px sans-serif';
  ctx.fillStyle = '#4f46e5';
  ctx.textAlign = 'center';
  ctx.fillText('★ Digital Receipt — Paid in Full ★', 200, y + 45);

  return canvas.toDataURL('image/png');
}

export default function ReceiptUploader({ onUpload, isProcessing }: ReceiptUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      onUpload(base64);
    };
    reader.readAsDataURL(file);
  };

  const loadSampleReceipt = (vendorType: 'grocery' | 'fuel' | 'hardware') => {
    let title = 'Sharma Kirana Store';
    let subtitle = 'Grocery & Resale Goods Invoice';
    let items = [
      { desc: 'Basmati Rice 10kg', amt: '650.00' },
      { desc: 'Mustard Oil 1L', amt: '200.00' },
    ];
    let total = '850.00';
    let sampleData: ProcessedReceiptResponse = {
      vendor: 'Sharma Kirana Store',
      date: new Date().toISOString().split('T')[0],
      amount: 850.00,
      currency: '₹',
      category: 'inventory',
      line_items: [
        { description: 'Basmati Rice 10kg', amount: 650.00 },
        { description: 'Mustard Oil 1L', amount: 200.00 },
      ],
      confidence: { vendor: 1.0, date: 1.0, amount: 1.0, category: 1.0 },
      raw_notes: 'Demo Sample Receipt: Sharma Kirana Store',
    };

    if (vendorType === 'fuel') {
      title = 'Gupta Fuel Station';
      subtitle = 'Commercial Vehicle Refuel';
      items = [{ desc: 'Diesel Refuel - Truck MH-12', amt: '1500.00' }];
      total = '1500.00';
      sampleData = {
        vendor: 'Gupta Fuel Station',
        date: new Date().toISOString().split('T')[0],
        amount: 1500.00,
        currency: '₹',
        category: 'transport',
        line_items: [
          { description: 'Diesel Refuel - Truck MH-12', amount: 1500.00 },
        ],
        confidence: { vendor: 1.0, date: 1.0, amount: 1.0, category: 1.0 },
        raw_notes: 'Demo Sample Receipt: Gupta Fuel Station',
      };
    } else if (vendorType === 'hardware') {
      title = 'Vikas Hardware & Tools';
      subtitle = 'Store Tools & Fasteners';
      items = [
        { desc: 'Claw Hammers (2x)', amt: '240.00' },
        { desc: 'Nails & Screws Pack', amt: '100.00' },
      ];
      total = '340.00';
      sampleData = {
        vendor: 'Vikas Hardware & Tools',
        date: new Date().toISOString().split('T')[0],
        amount: 340.00,
        currency: '₹',
        category: 'equipment',
        line_items: [
          { description: 'Claw Hammers (2x)', amount: 240.00 },
          { description: 'Nails & Screws Pack', amount: 100.00 },
        ],
        confidence: { vendor: 1.0, date: 1.0, amount: 1.0, category: 1.0 },
        raw_notes: 'Demo Sample Receipt: Vikas Hardware & Tools',
      };
    }

    const sampleBase64 = generateSampleReceiptImage(title, subtitle, items, total);
    if (sampleBase64) {
      setPreviewUrl(sampleBase64);
      onUpload(sampleBase64, sampleData);
    }
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const resetUploader = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleChange}
        disabled={isProcessing}
      />

      {!previewUrl ? (
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
            className={`relative group flex flex-col items-center justify-center w-full h-80 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
              ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                  : 'border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20'
              }`}
          >
            {/* Decorative gradients */}
            <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 group-hover:scale-110 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" x2="12" y1="3" y2="15"/>
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                  Drag and drop your receipt
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Supports PNG, JPG, or WEBP images
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onButtonClick();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-black shadow-sm group-hover:bg-indigo-600 dark:group-hover:bg-indigo-400 group-hover:text-white dark:group-hover:text-black transition-all duration-300 cursor-pointer"
              >
                Browse Files
              </button>
            </div>
          </div>

          {/* Quick Demo Sample Receipts */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Or Try Quick Demo Sample Receipts
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => loadSampleReceipt('grocery')}
                disabled={isProcessing}
                className="flex flex-col items-start p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:border-indigo-500/50 transition-all text-left group cursor-pointer shadow-2xs"
              >
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  🛒 Grocery Invoice
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Sharma Kirana (₹850.00)
                </span>
              </button>

              <button
                type="button"
                onClick={() => loadSampleReceipt('fuel')}
                disabled={isProcessing}
                className="flex flex-col items-start p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 hover:border-sky-500/50 transition-all text-left group cursor-pointer shadow-2xs"
              >
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                  ⛽ Fuel Receipt
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Gupta Station (₹1,500.00)
                </span>
              </button>

              <button
                type="button"
                onClick={() => loadSampleReceipt('hardware')}
                disabled={isProcessing}
                className="flex flex-col items-start p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/50 transition-all text-left group cursor-pointer shadow-2xs"
              >
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  🔧 Tools & Hardware
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Vikas Hardware (₹340.00)
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-md">
          {/* Image Preview Container */}
          <div className="relative w-full h-80 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="max-w-full max-h-full object-contain p-2 transition-all duration-300 filter group-hover:brightness-95"
            />

            {/* Scanning Laser Animation */}
            {isProcessing && (
              <>
                {/* Visual laser bar */}
                <div className="absolute left-0 right-0 h-1.5 bg-indigo-500/80 dark:bg-indigo-400/80 shadow-[0_0_15px_#4f46e5] dark:shadow-[0_0_15px_#818cf8] animate-scan pointer-events-none" />
                {/* Tinted Overlay */}
                <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-400/5 pointer-events-none" />
              </>
            )}

            {/* Status / Loader Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-zinc-700 border-t-indigo-400 animate-spin" />
                  <div className="absolute w-6 h-6 rounded-full bg-indigo-500/20 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold tracking-wide">Processing Receipt...</p>
                  <p className="text-[10px] text-zinc-400 mt-1">Extracting fields with AI</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          {!isProcessing && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50">
              <span className="text-xs text-zinc-500 dark:text-zinc-500 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Ready to digitize
              </span>
              <button
                type="button"
                onClick={resetUploader}
                className="text-xs font-semibold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors py-1 px-2 rounded-lg hover:bg-red-500/5 cursor-pointer"
              >
                Clear File
              </button>
            </div>
          )}
        </div>
      )}

      {/* Embedded CSS for scan line animation */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan {
          animation: scan 3s infinite linear;
        }
      `}</style>
    </div>
  );
}
