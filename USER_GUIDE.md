# INSOPHINIA POS - Complete User Guide

Welcome to the INSOPHINIA Point of Sale (POS) system! 

**A quick note from the developer (Kavin Eksith):** I started my freelancer developer journey in May 2025 to help small businesses build simple, modern websites. But I quickly realized small businesses need a lot more help keeping up with modern technology (like getting on WhatsApp, managing insights, tracking bills) without paying massive licensing fees for traditional software. That's why I've dedicated months to building this system, totally free and open source, while studying in my final year of university. Using tools like Vercel and Supabase, running this system is incredibly affordable, helping stop the waste of expensive legacy systems. Thank you for using INSOPHINIA! 

This guide is designed to help you understand and use every part of the system, even if you are a complete beginner.

---

## Table of Contents
1. [Getting Started (Login & Setup)](#1-getting-started-login--setup)
2. [Installing the App (PWA)](#2-installing-the-app-pwa)
3. [Connecting Hardware (Scanners & Printers)](#3-connecting-hardware-scanners--printers)
4. [The Billing Page (Making Sales)](#4-the-billing-page-making-sales)
5. [Managing Customers & Loyalty Points](#5-managing-customers--loyalty-points)
6. [Managing Inventory (Items & Stock)](#6-managing-inventory-items--stock)
7. [Reports & Analytics](#7-reports--analytics)
8. [Settings & Security (For Managers/Admins)](#8-settings--security-for-managersadmins)

---

## 1. Getting Started (Login & Setup)

To access the system, open your web browser (Google Chrome or Microsoft Edge is recommended for the best experience) and navigate to the web address provided by your administrator (usually a Vercel URL).

1. **Enter your Username and Password** on the login screen.
2. If this is your first time logging in, or if your password has expired, the system will prompt you to create a new password.
3. Once logged in, you will be taken to the main **Dashboard** (if you are an admin) or directly to the **Billing** page (if you are a cashier).

---

## 2. Installing the App (PWA)

You don't need to download this app from an app store! You can install it directly from your web browser so it works like a normal app and can even function without an internet connection.

### On a Computer (Windows / Mac)
1. Open the POS system in Google Chrome or Microsoft Edge.
2. Look at the address bar (where the website URL is). On the far right side, you will see an install icon (a monitor with a small down arrow).
3. Click this icon and select **Install**. The POS will now have its own icon on your desktop!

### On a Tablet or Phone (Android / iOS)
- **Android (Chrome):** Tap the three dots in the top right corner and select **Install app** or **Add to Home screen**.
- **iPhone/iPad (Safari):** Tap the "Share" button at the bottom (the square with an arrow pointing up) and select **Add to Home Screen**.

*Benefit:* If your internet goes down, the POS will still load because it caches (saves) the necessary files directly to your device!

## 3. Connecting Hardware (Scanners & Printers)

INSOPHINIA makes it very easy to connect your equipment.

### Barcode & QR Code Scanners (USB / Bluetooth)
- **No setup required!** Simply plug in your USB scanner or pair your Bluetooth scanner to your device.
- The system automatically detects when you scan an item. You do not need to click inside a search box; just scan the item, and it will instantly appear in the billing cart!

### Camera Scanner (Mobile / Tablet)
If you don't have a physical scanner, you can use your device's built-in camera:
1. On the **Billing** page, click the **📷 Camera** icon (next to the search bar).
2. Your browser will ask for **camera permission** — tap **Allow**.
3. If your device has multiple cameras, select the **back camera** for best results (it is usually auto-selected).
4. Point your camera at the barcode or QR code. The system will automatically detect and scan it.
5. Once scanned, the modal closes and the item appears in your cart!

*Tip:* In low light conditions, tap the **🔦 Flash** button (if available on your device) to turn on the flashlight.

### Receipt Printers (Thermal Printers)
1. Go to the **Settings** page (click your profile icon -> Settings).
2. Look for the **"This Device's Hardware"** section.
3. Make sure **Default Printer** is set to "Thermal (Roll, 80mm)".
4. When you generate a bill, the modern system will automatically format the receipt perfectly for your thermal printer. 
5. *Note:* Ensure your printer is connected to your computer via USB or Bluetooth. Google Chrome handles the connection automatically when you click the print button.

---

## 4. The Billing Page (Making Sales)

The billing page is where cashiers spend most of their time. It is designed to be fast and easy.

### Adding Items to the Bill
There are three ways to add an item to a customer's bill:
1. **Scan it:** Simply scan the barcode with your scanner. The item will instantly pop into the cart.
2. **Search for it:** Start typing the item name or PLU code into the large search bar. Click the item when it appears.
3. **Click it:** Tap any item from the category grid on the screen.

### Adjusting the Bill
- **Change Quantity:** Click the `+` or `-` buttons next to an item in the cart to change how many the customer is buying.
- **Remove Item:** Click the red trash can icon next to the item.
- **Add Discount:** If you have permission, you can click the discount button to offer a percentage off or a flat amount off the specific item.

### Completing the Sale
1. Look at the bottom right. You will see the Subtotal, any Discounts, calculated **Taxes**, and the **Total Amount**.
2. Ask the customer for payment. Type the amount they hand you into the "Cash Tendered" box.
3. The system will tell you exactly how much **Balance (Change)** to give back.
4. Click **Complete Bill**.
5. A receipt will pop up. You can:
   - **Print** it (A4 or thermal receipt)
   - **Email** it to the customer
   - **Send via WhatsApp** — a professional receipt will be formatted and sent directly to the customer's phone!

### Sending Bills via WhatsApp
After completing a bill (or from the **Bills** page), click the **WhatsApp** button. The system will:
- Format a professional receipt with your shop name, address, and phone number
- Include all items with quantities and prices
- Show subtotal, discounts, taxes, total, paid amount, and balance
- Include loyalty points earned (if applicable)
- Open WhatsApp with the message pre-filled — just tap **Send**!

*Note:* If the customer has a phone number on file, it will be pre-filled. Otherwise, you can enter it manually in WhatsApp.

---

## 5. Managing Customers & Loyalty Points

You can save customers in the system to track their purchases and reward them!

### Adding a Customer to a Bill
1. On the Billing page, click the **"Select Customer"** button (it usually has a person icon).
2. Search for their name or phone number.
3. If they are new, click **"Add New Customer"**, type in their name and mobile number, and save.

### Loyalty Points
- Every time a registered customer buys something, they earn loyalty points (e.g., 1 point per Rs. 100 spent, managed in settings).
- **Redeeming Points:** If a customer has enough points, an option will appear on the billing screen to pay with points! A supervisor or admin must authorize this reduction.

---

## 6. Managing Inventory (Items & Stock)

*(This section is for users with Admin or Supervisor permissions)*

To keep your shop running, you must add items to the system. Go to the **Inventory** tab on the left menu.

1. **Categories:** Create groups first (e.g., "Beverages", "Snacks").
2. **Add Item:** Click "Add New Item". 
   - Fill in the Name, Selling Price, and Category.
   - **Barcode / PLU Code:** Type the barcode number here, or click the field and scan the item with your scanner to fill it in automatically!
3. **Stock Levels:** You must tell the system how many items you have. Go to "Stock Movements" and add stock "In" whenever a delivery arrives.
4. The system will alert you when stock falls below your chosen minimum threshold.

---

## 7. Reports & Analytics

*(This section is for users with Admin permissions)*

Curious about how much money the shop made today? Go to the **Reports** section.
- **Sales Report:** View all completed bills for the day, week, or month.
- **Z-Report (End of Day):** Used when closing the shop to balance cash drawer totals.
- **Low Stock Report:** See exactly what items need to be reordered.

---

## 8. Settings & Security (For Managers/Admins)

The **Settings** page houses all business configurations. 

### General & Tax Settings
- You can change the Shop Name, Address, and Phone number here, which will instantly reflect on all printed receipts.
- **Tax:** You can enable or disable automatic tax calculations and change the rates (e.g., VAT defaulted to 18%).

### Master System Control (Kill Switch)
If there is a security breach, a user with the highest `master_admin` rank can freeze the system.
- **Manual Lock:** Clicking "Lock System Now" will instantly boot all cashiers and standard admins out of the POS, preventing any sales or data access.
- **Deadman Switch Timer:** If the `master_admin` does not periodically log in and click "Acknowledge" on this timer, the system assumes the shop owner is unavailable and will automatically lock itself securely after the allotted days (default 72 days).

### Automated Backups (AWS S3)
You don't need to manually backup your data—the system does it for you in the cloud utilizing reliable AWS S3 buckets coupled with highly secure encryption! Your data is safe.

--- 

*End of User Guide. If you want support to configure this system for your business, or to hire the developer for a custom project, please feel free to reach out via email (insophiniasolutions@gmail.com).*
