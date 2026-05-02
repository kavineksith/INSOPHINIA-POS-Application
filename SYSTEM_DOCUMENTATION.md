# INSOPHINIA Web-Based POS System ─ Complete System Documentation

## 1. System Overview

INSOPHINIA is a modern, web-based Point of Sale (POS) system built with Next.js, React, Tailwind CSS, and Prisma (PostgreSQL). It is designed to be highly secure, reliable, and deployable as a Progressive Web App (PWA) with offline capabilities.

This platform was built to help small businesses thrive by reducing expensive software overhead. We achieve this by deeply integrating with modern scaling platforms like **Vercel** for hosting, **Supabase** for PostgreSQL serverless databases, and **AWS S3** for highly durable backups.

---

## 2. Core Technologies

- **Frontend & Backend Framework**: Next.js (App Router)
- **Deployment Platform**: Vercel (Edge-compatible serverless APIs)
- **Styling**: Tailwind CSS, FontAwesome for icons
- **Database ORM**: Prisma Client
- **Database**: PostgreSQL (Hosted on Supabase)
- **Backup Storage**: AWS S3 Bucket Integration
- **DevOps & QA**: GitHub Actions (Workflow test cases)
- **Authentication**: JWT, bcrypt (12 rounds)
- **Offline PWA**: Serwist (`@serwist/next`)
- **Hardware Integration**: Web Serial API (Thermal Printing), custom keyboard hooks (Barcode/QR scanners)
- **Encryption**: AES-256-GCM (Backups and sensitive logs)
- **Compression**: Gzip (`zlib`)

---

## 3. Access Control & Role Hierarchy

The system operates on a strict Role-Based Access Control (RBAC) model.

| Role | Hierarchy Level | Description |
| :--- | :---: | :--- |
| `master_admin` | 4 | Supreme control. Can lock/unlock the entire system globally, reset deadman switches, and bypass all limits. |
| `admin` | 3 | Full access to business features. Can manage users, settings, and view all reports. |
| `supervisor` | 2 | Middle management. Can handle stock returns, approve certain discounts, and view reports. |
| `cashier` | 1 | Standard employee. Limited to the billing page, basic customer management, and receipt generation. |

### Global System Lockout (Kill Switch / Deadman Switch)
A high-level security mechanism is in place for emergency containment:
- **Manual Lock**: A `master_admin` can manually trigger a lockout. Every non-master user will instantly be blocked from the application (HTTP 503).
- **Deadman Switch**: If a `master_admin` does not actively "Check In" within a predefined period (default 72 days), the system assumes the admin is unreachable and automatically locks itself to protect data.

---

## 4. Database Architecture (Key Entities)

The PostgreSQL database (powered by Supabase) is managed via Prisma. Here are the core data models:

### Users & Security
- `User`: Handles authentication, tracking failed login attempts, 2FA settings, and password expiry.
- `LoginSession`: Tracks active JWT sessions, device info, IP, and location.
- `SecurityEvent` / `SystemLog`: Immutable audit trails. Cleaned automatically after 24 hours to save space (older than 24h are archived during backups).
- `SystemState`: Tracks the global lockout and deadman switch status.

### Inventory & Products
- `Category`: Grouping for products (e.g., Electronics, Grocery).
- `Item`: The core product model. Tracks `pluCode`, barcode/QR code, cost price, selling price, and real-time stock quantities.
- `StockMovement`: Tracks all inventory changes (`in`, `out`, `damage`, `return`, `lost`) for accurate auditing.

### Billing & Customers
- `Customer`: Tracks customer details and their accumulated Loyalty Points.
- `Bill`: The invoice header. Stores subtotal, calculated taxes (`vatAmount`, `ssclAmount`), discounts, final totals, and `status` (pending, completed, returned).
- `BillItem`: Line items belonging to a central Bill.

### Configuration
- `Setting`: Global K/V store for system configuration (Shop Name, Tax Rates, SMTP settings).
- `DeviceProfile`: Unique identifier for the current browser/tablet, allowing individual devices to remember their preferred thermal printer or scanner types.

### Supabase Setup & Security Configuration
When deploying using Supabase, you must ensure maximum database security:
1. **Disable Public Access**: Uncheck the "Public Accessible" option when creating your PostgreSQL project. The Next.js API handles all Prisma connections server-side, so direct public network TCP access is not needed.
2. **AWS S3 Credentials**: For encrypted cloud backups to function, acquire an AWS Access Key and Secret Key linked to your S3 bucket, and populate the respective variables in your `.env` file.
3. **Row Level Security (RLS)**: Protect your tables from unauthorized access by executing the following standard SQL in your Supabase SQL Editor:

```sql
-- ═══════════════════════════════════════════════════════════════
-- INSOPHINIA POS — Row Level Security (RLS) Setup
-- ═══════════════════════════════════════════════════════════════

-- 1. Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bill_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "backups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "login_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "token_blacklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_state" ENABLE ROW LEVEL SECURITY;

-- 2. Create Database Policies
-- These protect your tables if the Supabase API is ever exposed.

-- USERS TABLE: Admins only, or users viewing themselves
CREATE POLICY "Admins have full access to users" ON "users" FOR ALL TO authenticated USING ( (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'master_admin') );
CREATE POLICY "Users can view own profile" ON "users" FOR SELECT TO authenticated USING ( auth.uid() = id );

-- ITEMS & CATEGORIES: Viewable by all staff, managed by admins
CREATE POLICY "Authenticated staff can view catalog" ON "items" FOR SELECT TO authenticated USING ( true );
CREATE POLICY "Staff can manage catalog" ON "items" FOR ALL TO authenticated USING ( (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'master_admin', 'supervisor') );
CREATE POLICY "Authenticated staff can view categories" ON "categories" FOR SELECT TO authenticated USING ( true );
CREATE POLICY "Staff can manage categories" ON "categories" FOR ALL TO authenticated USING ( (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'master_admin', 'supervisor') );
```

---

## 5. Billing & Tax Automation

The billing interface is the core module for Cashiers. 
- **Tax Configuration**: Supports dynamic calculations. Defaulted to standard retail tax rates (e.g., 18% VAT).
- These rates are automatically applied to the subtotal (minus discounts) at checkout.
- Receipts show a clear breakdown of items, discounts, tax amounts, and totals.

---

## 6. Hardware Integrations

The system was designed for "Plug & Play" universal hardware support, prioritizing zero-configuration.

### Barcode & QR Scanners (Hardware)
- **Integration**: Operates via Keyboard Emulation interceptors (`useBarcodeScanner` hook).
- **Features**: Highly optimized scanning buffer (150ms) to support standard USB, 2.4Ghz Wireless, and slower Bluetooth scanners flawlessly. Prevents scanner keystrokes from leaking into input fields. Supports audio and haptic feedback.

### Camera Scanner (Mobile)
- **Integration**: Built-in camera barcode/QR scanner using the `html5-qrcode` library (`ScannerModal` component).
- **Supported Formats**: QR Code, EAN-13, EAN-8, CODE-128, CODE-39, UPC-A, UPC-E.
- **Features**: Explicit permission request flow → camera selection (auto-selects back camera) → real-time scanning with 1.5s debounce → auto-close on successful scan. Supports zoom and torch (flashlight) controls on supported devices.
- **Browser Support**: Works on any browser supporting `getUserMedia` API (Chrome, Edge, Firefox, Safari).

### Thermal Printers
- **Integration**: Supports direct, zero-dialog printing using the **Web Serial API**.
- **Supported hardware**: Any ESC/POS compatible thermal receipt printer (USB or Bluetooth).
- **Fallback**: For standard browsers, it gracefully falls back to the native `window.print()` dialog with a perfectly sized thermal CSS template.
- **Features**: Triggers the cash drawer automatically, cuts paper, and formats text natively using ESC/POS byte commands for instant printing.

---

### Cash Drawer Integration
- **Mechanism**: ESC/POS "Pulse" command (`ASCII 27 112 0 25 250`) sent directly to the printer's DK port.
- **Automation**: Triggers automatically upon bill completion, with an optional "Open Drawer" manual override in the UI.

---

## 7. WhatsApp Bill Sharing

Both the billing page and bill history page support sending professional receipts to customers via WhatsApp. The generated message includes:
- Shop name, address, and phone number
- Bill number, date, and cashier name
- Itemized list with quantities, unit prices, and line totals
- Subtotal, discounts, tax breakdown (VAT/SSCL), grand total
- Paid amount, balance/change
- Loyalty points earned/redeemed
- Professional separator lines and formatting using WhatsApp markdown

The system opens a `wa.me` deep link which works on both mobile (opens WhatsApp app) and desktop (opens WhatsApp Web).

---

## 8. CI/CD and Quality Assurance

To ensure maximum reliability for businesses:
- We automatically run rigorous **GitHub Actions workflows**.
- These workflows orchestrate static analysis and test case validation upon every commit and pull request.
- The system is built so that community contributions are safely integration-tested automatically.

---

## 9. Automated Backups & Data Pruning

Data integrity is handled via an automated API pipeline configured via Vercel Cron jobs:
1. **Extraction**: Dumps all essential business tables from Supabase into memory. System logs and security events are explicitly *excluded* to prevent bloat.
2. **Encryption**: The JSON payload is encrypted using the `AES-256-GCM` algorithm.
3. **Compression**: The encrypted buffer is compressed using Gzip, resulting in a `.json.enc.gz` file.
4. **Storage**: Securely uploaded to an **AWS S3 Cloud Storage Bucket**, guaranteeing reliable offsite preservation.
5. **Pruning**: Upon successful backup, the system deletes `SystemLog` and `SecurityEvent` rows older than 24 hours to keep the live PostgreSQL database lightweight.

---

## 10. Deployment Requirements (Vercel)

The system is fully compatible with serverless Edge environments, and Vercel is highly recommended. By utilizing Vercel and Supabase, small business owners can effectively host the system without incurring large monthly software fees.

**Environment Variables:** See `.env.example` in the project root for the complete list of required and optional variables, including database (Supabase), authentication, encryption, email, AWS S3 buckets, and rate limiting configuration.

**Build Commands:**
```bash
npm install
npx prisma generate
npm run build
```

**Starting the server:**
```bash
npm run start
```

*(Note for Vercel: The build steps are handled automatically during deployment, provided the Environment Variables are injected correctly).*
