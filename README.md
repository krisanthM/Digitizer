# 🧾 Digitizer — Receipt OCR & Expense Hub

**Digitizer** is a modern, AI-powered receipt scanning, OCR extraction, and expense management platform designed for small traders, shopkeepers, freelancers, and growing businesses.

Transform messy paper bills, handwritten notes, restaurant checks, and thermal receipts into structured, itemized digital records with live math validation, category analytics, and multi-currency tracking.

---

## ✨ Features & Highlights

### 🎯 Confidence-Aware Extraction & Human Review
- **Field Confidence Scoring**: Evaluates extraction certainty (0.0 - 1.0) for vendor, date, amount, and category.
- **Amber Warning Flags**: Highlights uncertain fields (`confidence < 0.6`) with prominent review badges.
- **1-Click Inline Edit & Verification**: Editing any field immediately sets its confidence to 100% (Human Verified).
- **Pre-Save Review Summary**: Displays active count of unverified fields before saving.

### 🧠 Vendor Memory & Auto-Learning
- **Persistent Vendor Store**: Auto-learns from saved receipt history in `/data/vendor-memory.json`.
- **Category Pre-filling**: Recognizes repeat vendors (with fuzzy matching) and auto-suggests their typical expense category.
- **High-Amount Anomaly Detection**: Warns if a receipt amount exceeds 2x the vendor's historical average.
- **Vendor Recognition Badge**: Displays historical visit counts and average spending.

### 💡 Root-Cause Spend Insights Engine
- **Pattern & Trend Reasoning**: Analyzes expense records to surface 2-4 non-obvious root causes (e.g. day-of-week spend spikes, repeat supplier frequency).
- **AI & Offline Heuristic Fallback**: Runs on-demand via Claude/OpenAI/Gemini or offline rule-based heuristic logic.
- **Insight Cards**: Categorized observation cards with friendly empty state when < 5 expenses.

### 📄 Confidence-Aware CSV & PDF Exports
- **Accountant Verification Support**: Optional toggle to include field confidence percentages in CSV and printable PDF reports.

### 🤖 Multi-Provider Vision AI & Offline OCR

- **State-of-the-Art Vision AI**: Supports **Codex AI Vision** (recommended for messy handwriting), **OpenAI GPT-4o**, and **Anthropic Claude 3.5 Sonnet**.
- **Offline Tesseract.js Engine**: Built-in local OCR engine fallback so receipt scanning works out of the box even without any API key or active internet connection.

### 🧮 Total Accuracy & Live Math Sync
- **Automatic Item Summation**: Dynamically calculates line-item subtotals to prevent receipt total discrepancies.
- **Live Math Validation Indicator**:
  - `✓ Item Sum matches Total Amount` (green checkmark when items add up accurately).
  - `⚠️ Discrepancy warning with 1-Click Sync` button to set Total Amount equal to exact sum of line items.

### 🗂️ 14 Business Expense Categories
Comprehensive classification tailored for retail, trades, dining, and corporate expenses:
- 🍷 **Food, Dining & Hospitality** (`meals`): Restaurant bills, coffee shops, client entertainment.
- 📦 **Inventory / Resale Goods** (`inventory`): Raw materials, stock purchases, grocery bulk.
- 🚚 **Transport, Fuel & Travel** (`transport`): Vehicle diesel/petrol, delivery fees, cab fare.
- ⚡ **Utilities & Bills** (`utilities`): Electricity, water, phone, internet bills.
- 🏢 **Rent & Premises** (`rent`): Shop lease, stall space, office rent.
- 🛒 **Store Supplies** (`supplies`): Packaging, stationery, store cleaning supplies.
- ⚙️ **Equipment & Machinery** (`equipment`): Tools, hardware, electronics, machinery.
- 📢 **Marketing & Advertising** (`marketing`): Banners, flyers, social media ads, promos.
- 🛠️ **Repairs & Maintenance** (`repairs`): Vehicle servicing, shop maintenance, plumbing.
- 💻 **Software & Subscriptions** (`software`): SaaS, licenses, domain names, cloud hosting.
- 💼 **Professional Fees & Services** (`services`): Legal, accounting, consulting.
- 🏛️ **Taxes, GST & Licenses** (`taxes`): VAT, GST, municipal permits, license fees.
- 🛡️ **Insurance & Coverage** (`insurance`): Vehicle & business policies.
- 📁 **Miscellaneous** (`misc`): General unclassified expenses.

### 💱 Multi-Currency Support
- Auto-extracts currency symbols (`£` GBP, `₹` INR, `$` USD, `€` EUR) from scanned bills.
- Built-in currency selector pill to switch currencies seamlessly per expense.

### 📄 PDF Tax Reports & CSV Export
- **Printable PDF Summary Reports**: Formats filtered expense records into a clean printable table with headers and totals, ready for PDF saving or printing.
- **1-Click CSV Export**: Downloads structured CSV data compatible with Excel, Tally, and QuickBooks.

### 🎯 Monthly Budget Tracker & Insights
- Set target monthly spending limits with visual progress bars.
- Live alert warnings when spending reaches 80% or exceeds budget limit.
- Key spending insights: Average bill cost, highest bill, top vendor leaderboard, and total line items extracted.

### 🔎 Receipt Image Lightbox Viewer
- Click any stored receipt thumbnail to open a high-res lightbox.
- Includes **Zoom In (+)**, **Zoom Out (-)**, and **90° Rotation (🔄)** controls.

### ⚡ Quick Demo Sample Receipts
- 1-Click interactive sample receipts:
  - 🛒 **Grocery Invoice** (*Sharma Kirana Store*)
  - ⛽ **Fuel Receipt** (*Gupta Fuel Station*)
  - 🔧 **Tools & Hardware** (*Vikas Hardware & Tools*)

### 🌙 Dark & Light Mode
- Modern dark mode and clean light mode toggle.

---

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Library**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **OCR Engine**: Tesseract.js (Offline) + Codex AI / GPT-4o / Claude 3.5 Sonnet APIs
- **Storage**: Local JSON file store with RESTful Next.js API Routes (`/api/expenses`, `/api/process-receipt`)

---

## 🛠️ Getting Started

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Configure Environment (Optional)
To use AI Vision OCR, create a `.env.local` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```
*(If no API key is set, Digitizer will automatically run using its local Tesseract.js engine).*

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or [http://192.168.56.1:3000](http://192.168.56.1:3000) in your browser.

---

## 📖 Usage Guide

1. **Upload a Receipt**: Drag & drop an image or click **Browse Files**, or try one of the **Quick Demo Sample Receipts**.
2. **Verify Details**: Check extracted vendor, date, category, currency, and line items. Use the **Sync Total** button if line items sum differs from OCR amount.
3. **Save Expense**: Click **Save Expense** to store the record.
4. **Export & Print**: Filter by category or search term, then click **PDF Report** or **CSV Export** for record-keeping.

---

## 🛠️ AI & Tool Attribution (Hackathon Build Transparency)

This project was built following the **Hackathon Playbook** methodology, utilizing **Codex** for design, architecture, code generation, and debugging:

| Build Stage | Tool / Service Used | Details |
| :--- | :--- | :--- |
| **Idea Validation & Spec** | Codex | Scope definition, MVP feature set, and technical specification document. |
| **UI & System Design** | Codex | Component layout, HSL dark/light color palette, state architecture, and API flow. |
| **Code Generation & Building** | Codex | All Next.js React components, API routes, line-item math sync logic, and styling. |
| **Vision & OCR AI Engine** | Codex / Vision AI | Receipt image text extraction, line-item table parsing, and multi-currency detection. |
| **Offline Fallback** | Tesseract.js | In-browser client-side fallback OCR when running without external API keys. |
| **Version Control & Deploy** | Git / GitHub | Incremental build history and repository tracking. |

---

## 📄 License
Crafted for small traders and growing businesses. All rights reserved.


