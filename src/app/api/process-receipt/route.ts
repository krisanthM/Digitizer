import { NextResponse } from 'next/server';
import { ProcessedReceiptResponse } from '@/types/expense';
import { checkVendorMemory } from '@/lib/vendorMemoryStore';
import Tesseract from 'tesseract.js';

function parseBase64Image(dataUrl: string): { mediaType: string; base64Data: string; buffer: Buffer } {
  const matches = dataUrl.match(/^data:((?:image|application)\/[a-zA-Z-+]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    const base64Data = matches[2];
    return {
      mediaType: matches[1],
      base64Data,
      buffer: Buffer.from(base64Data, 'base64'),
    };
  }
  const cleanBase64 = dataUrl.replace(/^data:(?:image|application)\/[a-zA-Z-+]+;base64,/, '');
  return {
    mediaType: 'image/jpeg',
    base64Data: cleanBase64,
    buffer: Buffer.from(cleanBase64, 'base64'),
  };
}

const SYSTEM_PROMPT = `You are a highly precise receipt processing AI specialized for small traders.
Your task is to analyze receipt images, which may contain messy handwriting, faded thermal printing, torn sections, and non-standard local layouts.
Extract structured fields, individual line items with exact prices, detect currency symbol, and evaluate your own confidence for key fields.

Extract the following JSON structure:
{
  "vendor": string | null,
  "date": string | null,        // ISO format (YYYY-MM-DD) if determinable, else null
  "amount": number | null,      // Gross total amount as a number
  "currency": string,           // Currency symbol extracted e.g. "£", "₹", "$", "€"
  "category": "inventory" | "transport" | "utilities" | "rent" | "supplies" | "meals" | "equipment" | "marketing" | "repairs" | "software" | "services" | "taxes" | "insurance" | "misc",
  "line_items": [
    { "description": string, "amount": number }
  ],
  "confidence": {
    "vendor": number,   // float between 0.0 and 1.0
    "date": number,     // float between 0.0 and 1.0
    "amount": number,   // float between 0.0 and 1.0
    "category": number  // float between 0.0 and 1.0
  },
  "raw_notes": string | null // any handwritten notes, deposit deductions (e.g. deposit paid), scribbles, or context
}

CRITICAL RULES:
1. Handle poor handwriting, faded print, torn parts, and non-standard layouts.
2. ACCURACY OF TOTAL AMOUNT & DISCOUNTS: Extract discounts, promo offers, cashback, trade-in deductions, deposits, or returned items as line items with NEGATIVE amounts (e.g., {"description": "Discount / Offer", "amount": -20.00}). Verify that sum(line_items) accurately equals the final net total amount paid (positive item costs minus negative discounts).
3. CURRENCY: Look for currency symbols (e.g. £ for UK pounds, ₹/Rs for INR, $ for USD, € for Euro). Default to "₹" if unspecified.
4. Categorize carefully:
   - "meals" for restaurants, pubs, cafes, coffee, dining, hospitality, food & drinks (e.g., "The Old Vicarage Restaurant", "Bar", "Bistro").
   - "inventory" for goods purchased for resale or raw materials.
   - "transport" for fuel, petrol, diesel, delivery, vehicle rent, travel.
   - "utilities" for electricity, water, power, phone, internet bills.
   - "rent" for shop rent, space rent, land lease.
   - "supplies" for packaging, stationery, store cleaning, minor shop supplies.
   - "equipment" for hardware, electronics, machinery, computer gear, heavy tools.
   - "marketing" for ads, printing banners, flyers, promotional items, social media ads.
   - "repairs" for vehicle servicing, mechanics, shop repairs, maintenance work.
   - "software" for SaaS apps, subscriptions, domain names, cloud hosting.
   - "services" for professional fees, legal, accounting, consulting, contractor.
   - "taxes" for GST, VAT, duties, licenses, government fees.
   - "insurance" for business or vehicle insurance policies.
   - "misc" for anything else.
5. CONFIDENCE EVALUATION:
   - For each field ("vendor", "date", "amount", "category"), assign a confidence score float between 0.0 and 1.0 based strictly on visual clarity.
   - If handwriting is unclear, receipt is faded/torn, blurred, or a field is ambiguous, assign a LOW confidence score honestly (< 0.6).
   - Do not guess with false confidence — it is better to flag uncertainty than to silently report a wrong value as certain.
6. Return ONLY the raw JSON string starting with '{' and ending with '}'.`;

async function callGeminiVision(base64Data: string, mediaType: string, apiKey: string): Promise<ProcessedReceiptResponse> {
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.5-flash'];
  let lastError = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT + "\n\nExtract receipt details from this image." },
              {
                inlineData: {
                  mimeType: mediaType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `Gemini API (${model}) responded ${response.status}: ${errorText}`;
        console.warn(lastError);
        continue;
      }

      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error(`Empty response from Gemini API model ${model}`);

      return parseJsonResponse(rawText);
    } catch (err: any) {
      lastError = err.message || String(err);
      console.warn(`Error trying Gemini model ${model}:`, lastError);
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}


async function callClaudeVision(base64Data: string, mediaType: string, apiKey: string): Promise<ProcessedReceiptResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: 'Extract data from this receipt.' },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }

  const resData = await response.json();
  const rawText = resData.content?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Claude API');

  return parseJsonResponse(rawText);
}

async function callOpenAIVision(base64Data: string, mediaType: string, apiKey: string): Promise<ProcessedReceiptResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract data from this receipt.' },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64Data}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const resData = await response.json();
  const rawText = resData.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Empty response from OpenAI API');

  return parseJsonResponse(rawText);
}

function parseJsonResponse(rawText: string): ProcessedReceiptResponse {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '');
    cleaned = cleaned.replace(/```$/, '');
    cleaned = cleaned.trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('Failed to parse JSON output');
    }
  }

  const defaultConf = { vendor: 0.5, date: 0.5, amount: 0.5, category: 0.5 };
  if (!parsed.confidence || typeof parsed.confidence !== 'object') {
    parsed.confidence = defaultConf;
  } else {
    parsed.confidence = {
      vendor: typeof parsed.confidence.vendor === 'number' ? parsed.confidence.vendor : 0.5,
      date: typeof parsed.confidence.date === 'number' ? parsed.confidence.date : 0.5,
      amount: typeof parsed.confidence.amount === 'number' ? parsed.confidence.amount : 0.5,
      category: typeof parsed.confidence.category === 'number' ? parsed.confidence.category : 0.5,
    };
  }

  return parsed as ProcessedReceiptResponse;
}

// Fallback offline OCR using Tesseract.js when no API Key is set
async function processWithTesseract(imageBuffer: Buffer): Promise<ProcessedReceiptResponse> {
  const { data } = await Tesseract.recognize(imageBuffer, 'eng');
  const fullText = data.text || '';
  const lines = fullText.split('\n').map((l) => l.trim()).filter(Boolean);

  let vendor: string | null = null;
  let date: string | null = null;
  let amount: number | null = null;
  const lineItems: { description: string; amount: number }[] = [];

  // Try extracting vendor from top non-empty lines
  if (lines.length > 0) {
    const candidate = lines[0].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
    if (candidate.length > 2) vendor = candidate;
  }

  // Try extracting date (YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY)
  const dateRegex = /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/;
  const dateMatch = fullText.match(dateRegex);
  if (dateMatch) {
    const rawDate = dateMatch[1];
    try {
      const parts = rawDate.split(/[-/]/);
      if (parts[0].length === 4) {
        date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } catch {
      date = null;
    }
  }

  // Try extracting amounts (look for lines with currency symbols or numbers)
  const numberRegex = /(?:₹|rs\.?|inr|\$)?\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/gi;
  const foundAmounts: number[] = [];

  lines.forEach((line) => {
    const isTotalLine = /total|amount|paid|net/i.test(line);
    const matches = Array.from(line.matchAll(numberRegex));
    matches.forEach((m) => {
      const val = parseFloat(m[1]);
      if (!isNaN(val) && val > 0 && val < 500000) {
        foundAmounts.push(val);
        if (isTotalLine && (amount === null || val > amount)) {
          amount = val;
        }
      }
    });

    // Check if line looks like item description followed by numbers (rate / subtotal / amount)
    const itemMatch = line.match(/^([a-zA-Z0-9\s&'.-]+?)\s+((?:\d+(?:\.\d{1,2})?\s*)+)$/i);
    if (itemMatch) {
      const desc = itemMatch[1].trim();
      const numTokens = itemMatch[2].trim().split(/\s+/).map((n) => parseFloat(n)).filter((n) => !isNaN(n) && n > 0);
      if (desc.length >= 2 && numTokens.length > 0) {
        // Take the last number as the line item amount (e.g. Rate Amount -> Amount)
        const itemAmt = numTokens[numTokens.length - 1];
        if (!/total|subtotal|cash|bill|date|change/i.test(desc)) {
          lineItems.push({ description: desc, amount: itemAmt });
        }
      }
    }
  });

  if (amount === null && foundAmounts.length > 0) {
    amount = Math.max(...foundAmounts);
  }

  // Basic categorization heuristic based on keywords
  let category: ProcessedReceiptResponse['category'] = 'misc';
  const lowerText = fullText.toLowerCase();
  if (/fuel|diesel|petrol|truck|transport|auto|cab|travel/i.test(lowerText)) {
    category = 'transport';
  } else if (/electricity|water|power|bill|gpay|upi|utility/i.test(lowerText)) {
    category = 'utilities';
  } else if (/rent|shop|lease|deposit|space/i.test(lowerText)) {
    category = 'rent';
  } else if (/rice|oil|kirana|grocery|item|goods|inventory|stock/i.test(lowerText)) {
    category = 'inventory';
  } else if (/tool|hardware|hammer|nail|screw|paper|box|supply|supplies/i.test(lowerText)) {
    category = 'supplies';
  }

  return {
    vendor: vendor || 'Scanned Receipt',
    date: date || new Date().toISOString().split('T')[0],
    amount: amount || 0,
    category,
    line_items: lineItems,
    confidence: {
      vendor: vendor ? 0.65 : 0.30,
      date: date ? 0.70 : 0.20,
      amount: amount ? 0.75 : 0.25,
      category: category !== 'misc' ? 0.60 : 0.40,
    },
    raw_notes: `Local Tesseract OCR Extracted Text:\n${fullText.slice(0, 300)}${fullText.length > 300 ? '...' : ''}`,
  };
}

export async function GET(request: Request) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const hasKey = !!(geminiKey || anthropicKey || openaiKey);
  const activeProvider = geminiKey ? 'Gemini 3.6 Flash' : anthropicKey ? 'Claude 3.5 Sonnet' : openaiKey ? 'OpenAI GPT-4o' : 'Tesseract Offline OCR';

  return NextResponse.json({
    live: hasKey,
    provider: activeProvider,
  });
}

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    if (!image) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    const customKey = request.headers.get('x-api-key')?.trim();
    const customProvider = request.headers.get('x-provider')?.trim() || 'gemini';

    const geminiKey = customKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const anthropicKey = customKey || process.env.ANTHROPIC_API_KEY;
    const openaiKey = customKey || process.env.OPENAI_API_KEY;

    const { mediaType, base64Data, buffer } = parseBase64Image(image);

    let result: ProcessedReceiptResponse;

    // Prioritize configured keys with automatic offline fallback on 503 / API error
    try {
      if (customKey) {
        if (customProvider === 'gemini') {
          result = await callGeminiVision(base64Data, mediaType, customKey);
        } else if (customProvider === 'openai') {
          result = await callOpenAIVision(base64Data, mediaType, customKey);
        } else {
          result = await callClaudeVision(base64Data, mediaType, customKey);
        }
      } else if (geminiKey) {
        try {
          result = await callGeminiVision(base64Data, mediaType, geminiKey);
        } catch (geminiErr: any) {
          console.warn('Gemini API call failed, falling back to local OCR:', geminiErr.message);
          result = await processWithTesseract(buffer);
          result.raw_notes = `[Fallback OCR Active] Cloud API returned 503/error. Switched to offline Tesseract OCR.\n${result.raw_notes || ''}`;
        }
      } else if (anthropicKey) {
        try {
          result = await callClaudeVision(base64Data, mediaType, anthropicKey);
        } catch (claudeErr: any) {
          console.warn('Claude API failed, falling back to local OCR:', claudeErr.message);
          result = await processWithTesseract(buffer);
        }
      } else if (openaiKey) {
        try {
          result = await callOpenAIVision(base64Data, mediaType, openaiKey);
        } catch (openaiErr: any) {
          console.warn('OpenAI API failed, falling back to local OCR:', openaiErr.message);
          result = await processWithTesseract(buffer);
        }
      } else {
        console.log('No AI API key found. Running local Tesseract.js OCR engine...');
        result = await processWithTesseract(buffer);
      }
    } catch (apiErr: any) {
      console.warn('All Vision API processing failed, running Tesseract fallback:', apiErr.message);
      result = await processWithTesseract(buffer);
    }

    // Auto-Postprocess Result for High Accuracy:
    // 1. If line items exist, sum them up. If amount is missing or less than sum of items (due to deposit/discount deductions), set amount to sum of line items.
    if (result.line_items && result.line_items.length > 0) {
      const itemsSum = Math.round(result.line_items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * 100) / 100;
      if (itemsSum > 0) {
        if (result.amount === null || result.amount === 0 || itemsSum > (result.amount || 0)) {
          result.amount = itemsSum;
          if (result.confidence) result.confidence.amount = 1.0;
        }
      }
    }

    // 2. Normalize currency symbol
    if (!result.currency) {
      result.currency = '₹';
    }

    // 3. Vendor Memory Lookup & Auto-Suggest
    if (result.vendor) {
      const memInfo = await checkVendorMemory(result.vendor, result.amount);
      if (memInfo) {
        result.vendor_memory = memInfo;
        if (memInfo.typical_category && (result.category === 'misc' || (result.confidence?.category && result.confidence.category < 0.6))) {
          result.category = memInfo.typical_category;
        }
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error processing receipt OCR:', error);

    return NextResponse.json({
      error: 'OCR extraction failed',
      details: error.message || 'Unknown error',
      vendor: null,
      date: null,
      amount: null,
      category: 'misc',
      line_items: [],
      confidence: {
        vendor: 0.0,
        date: 0.0,
        amount: 0.0,
        category: 0.0,
      },
      raw_notes: `Extraction attempt failed: ${error.message || 'Error parsing image'}. Please enter details manually.`,
    }, { status: 200 });
  }
}


