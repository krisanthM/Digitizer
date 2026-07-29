import fs from 'fs/promises';
import path from 'path';
import { Expense } from '@/types/expense';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error ensuring expenses store file exists:', error);
  }
}

export async function getExpenses(): Promise<Expense[]> {
  await ensureFileExists();
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading expenses from store:', error);
    return [];
  }
}

export async function saveExpenses(expenses: Expense[]): Promise<void> {
  await ensureFileExists();
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(expenses, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving expenses to store:', error);
  }
}

export async function addExpense(expense: Expense): Promise<Expense> {
  const expenses = await getExpenses();
  expenses.unshift(expense); // Put new expenses at the top
  await saveExpenses(expenses);
  return expense;
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | null> {
  const expenses = await getExpenses();
  const index = expenses.findIndex((e) => e.id === id);
  if (index === -1) return null;

  const updatedExpense = {
    ...expenses[index],
    ...updates,
    // Reset confidence to 1.0 when a field is manually corrected/updated by the user
    confidence: {
      ...expenses[index].confidence,
      ...(updates.vendor !== undefined ? { vendor: 1.0 } : {}),
      ...(updates.date !== undefined ? { date: 1.0 } : {}),
      ...(updates.amount !== undefined ? { amount: 1.0 } : {}),
      ...(updates.category !== undefined ? { category: 1.0 } : {}),
    },
  };

  expenses[index] = updatedExpense;
  await saveExpenses(expenses);
  return updatedExpense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const expenses = await getExpenses();
  const filtered = expenses.filter((e) => e.id !== id);
  if (filtered.length === expenses.length) return false;
  await saveExpenses(filtered);
  return true;
}

export async function clearExpenses(): Promise<void> {
  await saveExpenses([]);
}

