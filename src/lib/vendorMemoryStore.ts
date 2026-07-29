import fs from 'fs/promises';
import path from 'path';
import { ExpenseCategory, VendorMemoryInfo } from '@/types/expense';

export interface VendorMemoryEntry {
  typical_category: ExpenseCategory;
  amount_history: number[];
  average_amount: number;
  last_seen: string;
}

export type VendorMemoryStore = Record<string, VendorMemoryEntry>;

const DATA_DIR = path.join(process.cwd(), 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'vendor-memory.json');

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(MEMORY_FILE);
    } catch {
      await fs.writeFile(MEMORY_FILE, JSON.stringify({}, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error ensuring vendor memory file exists:', error);
  }
}

export function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '') // Strip punctuation
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export async function getVendorMemoryStore(): Promise<VendorMemoryStore> {
  await ensureFileExists();
  try {
    const data = await fs.readFile(MEMORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading vendor memory store:', error);
    return {};
  }
}

export async function saveVendorMemoryStore(store: VendorMemoryStore): Promise<void> {
  await ensureFileExists();
  try {
    await fs.writeFile(MEMORY_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving vendor memory store:', error);
  }
}

export async function checkVendorMemory(
  vendorName: string | null,
  amount: number | null
): Promise<VendorMemoryInfo | undefined> {
  if (!vendorName || !vendorName.trim()) return undefined;

  const store = await getVendorMemoryStore();
  const normalized = normalizeVendorName(vendorName);
  if (!normalized) return undefined;

  let matchedEntry: VendorMemoryEntry | null = null;
  let matchedKey = normalized;

  // 1. Direct match
  if (store[normalized]) {
    matchedEntry = store[normalized];
  } else {
    // 2. Fuzzy match (Levenshtein distance <= 2 or substring)
    const keys = Object.keys(store);
    for (const key of keys) {
      if (
        key === normalized ||
        (normalized.length > 4 && (key.includes(normalized) || normalized.includes(key))) ||
        levenshteinDistance(key, normalized) <= 2
      ) {
        matchedEntry = store[key];
        matchedKey = key;
        break;
      }
    }
  }

  if (!matchedEntry) return undefined;

  const visitCount = matchedEntry.amount_history.length;
  const isHighAnomaly =
    amount !== null &&
    amount > 0 &&
    matchedEntry.average_amount > 0 &&
    amount > 2 * matchedEntry.average_amount;

  let anomalyWarning: string | undefined = undefined;
  if (isHighAnomaly) {
    anomalyWarning = `This is notably higher than your usual spend here (${matchedEntry.average_amount.toFixed(
      2
    )}) — please confirm the amount is correct.`;
  }

  return {
    is_recognized: true,
    visit_count: visitCount,
    typical_category: matchedEntry.typical_category,
    average_amount: matchedEntry.average_amount,
    last_seen: matchedEntry.last_seen,
    is_high_amount_anomaly: isHighAnomaly,
    anomaly_warning: anomalyWarning,
  };
}

export async function recordVendorExpense(
  vendorName: string | null,
  amount: number | null,
  category: ExpenseCategory
): Promise<void> {
  if (!vendorName || !vendorName.trim()) return;

  const store = await getVendorMemoryStore();
  const normalized = normalizeVendorName(vendorName);
  if (!normalized) return;

  // Find existing key or use new normalized key
  let targetKey = normalized;
  const keys = Object.keys(store);
  for (const key of keys) {
    if (
      key === normalized ||
      (normalized.length > 4 && (key.includes(normalized) || normalized.includes(key))) ||
      levenshteinDistance(key, normalized) <= 2
    ) {
      targetKey = key;
      break;
    }
  }

  const existing = store[targetKey] || {
    typical_category: category,
    amount_history: [],
    average_amount: 0,
    last_seen: new Date().toISOString().split('T')[0],
  };

  const history = [...existing.amount_history];
  if (amount !== null && amount > 0) {
    history.push(Math.round(amount * 100) / 100);
  }

  // Cap at last 20 entries
  if (history.length > 20) {
    history.shift();
  }

  const avg =
    history.length > 0
      ? Math.round((history.reduce((sum, val) => sum + val, 0) / history.length) * 100) / 100
      : 0;

  store[targetKey] = {
    typical_category: category, // Let saved category win
    amount_history: history,
    average_amount: avg,
    last_seen: new Date().toISOString().split('T')[0],
  };

  await saveVendorMemoryStore(store);
}
