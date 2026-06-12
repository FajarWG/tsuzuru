# 綴る — Tsuzuru

[![Next.js](https://img.shields.io/badge/Next.js-15%2B-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PWA](https://img.shields.io/badge/PWA-Offline--First-5A0FC8?style=for-the-badge&logo=progressive-web-apps)](https://web.dev/progressive-web-apps/)

> **Weave your money story — お金の物語を綴ろう**

**Tsuzuru (綴る)** is a Zen-inspired, minimalist personal finance manager modeled after the traditional Japanese **Kakeibo (家計簿)** budgeting method. Built with Next.js, Prisma, and Framer Motion, it offers a seamless, offline-first, and highly aesthetic interface to record, analyze, and master your monthly cash flows.

---

## ✨ Features

- **📓 Zen-inspired Minimalist Design**: Premium aesthetics featuring clean layouts, smooth micro-animations, custom dark mode, and card structures that bring peace of mind to expense tracking.
- **🌐 Offline-First PWA Capabilities**: Fully installable as a Progressive Web App (PWA) on Mobile and Desktop. Log transactions on-the-go offline, which are automatically synced to the server once your connection is restored.
- **💵 Smart Multi-Currency Ledger**: Native support for **JPY (¥)** and **IDR (Rp)** tracking. View individual account balances (Cash, Banks, E-Wallets, Investments) and total assets separated clearly.
- **📊 Kakeibo Budget Limits**: Define monthly expected budgets along with specific categories (Pocket Money and Shopping). Instantly view your remaining limits on the dashboard.
- **📈 Micro-animated Interactivity**: Fluid number transitions using physics-based spring animations (`Framer Motion`) that roll up/down dynamically as account balances adjust.
- **🗓️ One-Click Recurring Bills**: Create monthly template schedules (Rent, Utilities, SIM Cards) and record payments with a single tap.
- **⚡ Advanced Analytics**: Interactive bar charts and category donut charts powered by `Recharts`, complete with custom tooltips and pocket-money meal stats.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions, API Routes)
- **Database ORM**: [Prisma](https://www.prisma.io/) with **PostgreSQL**
- **Authentication**: [NextAuth.js v5](https://authjs.dev/) (Google Sign-In)
- **Styles & Layout**: [TailwindCSS v4](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Animation**: [Framer Motion](https://www.framer-motion.dev/) & [Tabler Icons](https://tabler.io/icons)
- **Charts**: [Recharts](https://recharts.org/)
- **State & Sync**: Service Workers (PWA) & LocalStorage Sync Queue

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18+) and [npm](https://www.npmjs.com/) (or [Bun](https://bun.sh/)) installed.

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/tsuzuru.git
   cd tsuzuru
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set Up Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/tsuzuru"
   NEXTAUTH_SECRET="your-nextauth-secret-key"
   
   # Google OAuth Credentials
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

4. **Initialize the Database**:
   Generate Prisma client and run seed scripts to populate initial mock data:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   # or
   bun dev
   ```
   Open [http://localhost:3000](http://localhost:3000) on your browser.

---

## ⚙️ Offline Mode & PWA

Tsuzuru registers a custom Service Worker that intercepts network requests, caching static assets and API payloads to enable offline capabilities:
- **Offline Entry**: If offline, transactions are pushed into a LocalStorage queue named `tsuzuru_offline_transactions`.
- **Auto-Sync**: The `PwaRegister` component registers a `window.addEventListener("online")` event that flushes the queued transactions to the backend database server as soon as connection recovers.

---

## 📄 License

This project is licensed under the MIT License.
