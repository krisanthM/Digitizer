import { NextResponse } from 'next/server';
import { getExpenses, addExpense } from '@/lib/expensesStore';
import { recordVendorExpense } from '@/lib/vendorMemoryStore';
import { Expense } from '@/types/expense';

export async function GET() {
  try {
    const expenses = await getExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses API:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Build a standard Expense structure
    const newExpense: Expense = {
      id: body.id || crypto.randomUUID(),
      vendor: body.vendor !== undefined ? body.vendor : null,
      date: body.date !== undefined ? body.date : null,
      amount: body.amount !== undefined ? body.amount : null,
      category: body.category || 'misc',
      line_items: body.line_items || [],
      confidence: body.confidence || {
        vendor: body.vendor ? 1.0 : 0.0,
        date: body.date ? 1.0 : 0.0,
        amount: body.amount ? 1.0 : 0.0,
        category: body.category ? 1.0 : 0.0,
      },
      raw_notes: body.raw_notes || null,
      image_thumbnail: body.image_thumbnail || null,
      created_at: new Date().toISOString(),
    };

    await addExpense(newExpense);
    
    // Update vendor memory
    if (newExpense.vendor) {
      await recordVendorExpense(newExpense.vendor, newExpense.amount, newExpense.category);
    }

    return NextResponse.json(newExpense);
  } catch (error) {
    console.error('Error creating expense API:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { clearExpenses } = await import('@/lib/expensesStore');
    await clearExpenses();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing expenses API:', error);
    return NextResponse.json({ error: 'Failed to clear expenses' }, { status: 500 });
  }
}

