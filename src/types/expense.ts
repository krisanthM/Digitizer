export interface LineItem {
  description: string;
  amount: number;
}

export interface ConfidenceScores {
  vendor: number; // 0.0 - 1.0
  date: number;
  amount: number;
  category: number;
}

export type ExpenseCategory = 
  | "inventory" 
  | "transport" 
  | "utilities" 
  | "rent" 
  | "supplies" 
  | "meals" 
  | "equipment" 
  | "marketing" 
  | "repairs" 
  | "software" 
  | "services" 
  | "taxes" 
  | "insurance" 
  | "misc";

export interface Expense {
  id: string; // uuid
  vendor: string | null;
  date: string | null; // ISO format if determinable, else null
  amount: number | null;
  currency?: string; // e.g. "₹", "£", "$", "€"
  category: ExpenseCategory;
  line_items: LineItem[];
  confidence: ConfidenceScores;
  raw_notes: string | null;
  image_thumbnail: string | null; // base64 or path
  created_at: string;
}

export interface VendorMemoryInfo {
  is_recognized: boolean;
  visit_count: number;
  typical_category: ExpenseCategory;
  average_amount: number;
  last_seen: string;
  is_high_amount_anomaly: boolean;
  anomaly_warning?: string;
}

export interface ProcessedReceiptResponse {
  vendor: string | null;
  date: string | null;
  amount: number | null;
  currency?: string; // e.g. "₹", "£", "$", "€"
  category: ExpenseCategory;
  line_items: LineItem[];
  confidence: ConfidenceScores;
  raw_notes: string | null;
  vendor_memory?: VendorMemoryInfo;
}


