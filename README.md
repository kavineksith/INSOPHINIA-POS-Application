# 🏪 INSOPHINIA — Web-Based POS System

> A **free, open-source** Point of Sale system built for small businesses and individual shops worldwide. Install it on any device, connect your hardware, and start selling — no app store required.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![PWA](https://img.shields.io/badge/PWA-Offline_Ready-brightgreen?logo=pwa)](https://web.dev/progressive-web-apps/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
![Visitors](https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Fkavineksith%2Finsophinia-web-pos-application&label=Views&countColor=%23263759)

---

## 🌟 The Developer's Story

Hello! I am Kavin Eksith. I started my journey as a freelance web developer in May 2025 without any real-world experience, but since then, I have successfully delivered several real-world projects. My primary goal was simply to help small businesses create simple, modern websites so their customers could easily view products and get in touch. Over time, I noticed that these small entrepreneurs heavily relied on platforms like WhatsApp, Facebook, and Instagram to provide services, reach customers, and manage insights. I wanted to give them a little more help.

**This project is the result of 5 months of dedicated work.** I created this fully open-source, web-based POS system so that small businesses can modernly manage their shops without paying hefty software fees. By utilizing web hosting services like **Vercel** and **Supabase**, businesses can dramatically reduce the waste associated with expensive legacy systems.

Currently, I am a final-year university student, but I had to pause my studies due to economic problems. I do freelance development as a side job to earn money and eventually complete my degree. 

**Explore my other work!**
Beyond full-stack web development, I also write automation scripts for IT Support, Networking, and Cyber Security. If you check out my other repositories on GitHub, you will find a variety of multi-purpose Python packages designed to automate repetitive tasks and secure environments. Please explore my profile to see these projects!

**If you have freelance projects or need customized solutions, feel free to contact me:**
- 💼 **LinkedIn**: [Kavin Eksith](https://www.linkedin.com/in/kavin-eksith/)
- 📧 **Email**: insophiniasolutions@gmail.com

---

## ✨ Why INSOPHINIA?

Every shop — from a small grocery store to a busy restaurant — needs a reliable billing system. INSOPHINIA is my gift to the small business community:

- 🆓 **100% Free & Open Source** — No monthly fees, Apache 2.0 licensed.
- 🖥️ **Professional UI** — Clean, modern interface designed for fast checkout.
- ☁️ **Affordable Cloud Infrastructure** — Hosted on Vercel with a Supabase PostgreSQL database.
- 🔒 **Enterprise Security** — AES-256 encryption, 2FA, kill switch, audit logs.
- 🖨️ **Plug & Play Hardware** — USB/Bluetooth barcode scanners and thermal printers.
- 📸 **Camera Scanning** — Use your phone's camera as a barcode scanner.
- 📲 **WhatsApp Receipts** — Send professional bills directly to customers.
- ⭐ **Loyalty Points** — Built-in customer rewards program.
- 💾 **Secure Backups** — State-of-the-art AWS S3 bucket integration for automated, encrypted database backups.
- 🧾 **Tax Automation** — Configurable tax rates (VAT/Levy).
- 🧪 **Quality Assured** — Comprehensive test cases powered by GitHub Actions workflows.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **npm**
- **Supabase** account (for PostgreSQL database)
- **AWS S3** bucket (for backups)
- **Vercel** account (for best deployment experience)

### Setup

**Important Supabase & AWS Configuration:**
- When creating your Supabase PostgreSQL project, **uncheck/disable the "Public Accessible" option** (we don't need it for server-side operations and disabling it improves security).
- You must apply Row Level Security (RLS) policies to secure the database (see `SYSTEM_DOCUMENTATION.md` for the SQL script).
- Ensure your **AWS S3 Access Key** and **Secret Key** are obtained and added to your `.env` for the cloud backup system.

```bash
# 1. Clone the repository
git clone https://github.com/kavineksith/INSOPHINIA-POS-Application.git
cd INSOPHINIA-POS-Application

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Supabase database URL, AWS S3 credentials, and secrets

# 4. Initialize the database
npx prisma generate
npx prisma db push

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Login
On first run, create a master admin account through the setup wizard.

---

## 📋 Features

| Feature | Description |
|---|---|
| 🧾 **Billing** | Fast POS interface with item search, barcode scan, and cart management |
| 📦 **Inventory** | Categories, items, stock movements, low-stock alerts |
| 👥 **Customers** | Customer database with loyalty points and purchase history |
| 📊 **Reports** | Sales reports, Z-reports (end-of-day), and analytics |
| 👤 **User Management** | Role-based access: Master Admin → Admin → Supervisor → Cashier |
| 🖨️ **Printing** | A4 bills and thermal receipts (80mm) with direct USB printing |
| 📲 **WhatsApp** | Send professional receipts via WhatsApp |
| 📧 **Email** | Email receipts to customers (SMTP) |
| 📸 **Camera Scanner** | Built-in camera barcode/QR scanner for mobile devices |
| 🔐 **Security** | 2FA, session management, IP pinning, deadman switch |
| 💾 **Backups** | Encrypted cloud backups utilizing AWS S3 |
| 🎯 **Promotions** | Manage promotional discounts and offers |
| 🔌 **Hardware** | Direct Web Serial API access for scanners and printers |
| 🔄 **CI/CD** | Automated testing via GitHub Actions and deployment to Vercel |

---

## 🏗️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **Language**: [TypeScript](https://typescriptlang.org)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Database**: [PostgreSQL](https://postgresql.org) via **Supabase** & [Prisma](https://prisma.io)
- **Cloud Backups**: **AWS S3 Bucket**
- **PWA**: [Serwist](https://serwist.pages.dev) for offline caching
- **CI/CD**: **GitHub Actions**
- **Icons**: [FontAwesome](https://fontawesome.com)
- **Scanning**: [html5-qrcode](https://github.com/mebjas/html5-qrcode) for camera scanning
- **Printing**: [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API) for thermal printers

---

## ⚙️ Environment Variables

See [`.env.example`](.env.example) for the complete list of configuration options including:
- Supabase PostgreSQL connection strings
- AWS S3 backup bucket credentials
- JWT and encryption keys
- SMTP email configuration
- Rate limiting settings
- Vercel Cron secrets for automated backups

---

## 🚢 Deployment (Vercel)

INSOPHINIA is highly optimized for deployment on Vercel. With a free Vercel account and a Supabase database, small businesses can run this POS with zero monthly software costs.

```bash
npm install
npx prisma generate
npm run build
```

Add all environment variables from `.env.example` to your Vercel project settings, hook up your repository, and Vercel will handle the rest!

---

## 📖 Documentation

- [**System Documentation**](SYSTEM_DOCUMENTATION.md) — Technical architecture, CI/CD workflows, database schema, security model.
- [**User Guide**](USER_GUIDE.md) — Step-by-step usage instructions for all user roles.

---

## 🤝 Contributing

**I warmly invite everyone to contribute to this project!** Whether you're fixing bugs, adding new features, or improving documentation, your help is incredibly valuable to the small business community.

1. **Fork** this repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

We utilize **GitHub Actions** for quality testing, so please ensure your changes pass all automated test cases before submitting your PR!

---

## 📄 License

This project is licensed under the **Apache License 2.0** — see the [LICENSE](LICENSE) file for details.

---

## ⭐ Show Your Support

If this project helps your business, please consider giving it a ⭐ on GitHub! Your support helps reach more small businesses around the world.

And remember, if you want support to configure this system for your business, or if you need a freelance web developer for your next big project, **reach out** and help a student finish university:

- 💼 **LinkedIn**: [Kavin Eksith](https://www.linkedin.com/in/kavin-eksith/)
- 📧 **Email**: insophiniasolutions@gmail.com

---

*Built with ❤️ by [Kavin Eksith](https://github.com/kavineksith) for the small business community*
