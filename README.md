# LORAKU DRY FRUITS

A mobile-first, full-stack e-commerce web application and Progressive Web App (PWA) for **LORAKU DRY FRUITS**, an Indian home-based dry fruits and healthy seeds store.

## Features

- **Customer Storefront**: Browse editable categories (Dry Fruits, Healthy Seeds, Special Products), search, filter by Featured / Best Sellers / New Arrivals, select pack weights (`100g`, `250g`, `500g`, `1kg`), persistent shopping cart, complete Indian delivery address checkout, Cash on Delivery (COD) and configurable UPI payment, unique Order ID generation, and customer order lookup.
- **Central Official WhatsApp Integration**: Official business WhatsApp number (`+917029017716`) stored centrally in Store Settings (`store_settings.whatsapp_number`). Every product enquiry, shop contact, and order confirmation button builds a clean `https://wa.me/917029017716` link with URL-encoded order details.
- **Owner Admin Dashboard**:
  - Secure first-time setup and bcrypt-hashed password authentication with `httpOnly` signed JWT cookies.
  - Real-time Revenue, Net Profit, Gross Margin, Today's Orders/Sales, Pending/Completed/Cancelled Orders, and Low Stock alerts computed directly from saved SQLite orders, product costs, and logged expenses.
  - Full Order Management (status timeline: `Pending`, `Confirmed`, `Processing`, `Packed`, `Shipped`, `Delivered`, `Cancelled`, payment verification, stock auto-deduction & restore on cancel).
  - Product, Category, Inventory & Unit Profit Calculator (`Purchase Cost + Packaging + Sticker + Other Expenses`).
  - Editable Store Settings, Delivery Charges & Free Delivery Threshold, UPI ID & QR Upload, Editable Policies (About Us, Contact Us, Shipping, Return & Refund, Privacy, Terms), and one-click Project Source ZIP download.
- **PWA Support**: Web App Manifest, custom PNG & SVG icons, service worker caching (`vite-plugin-pwa`), and in-app install button for Android & iOS.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, `vite-plugin-pwa`
- **Backend**: Node.js, Express 4, SQLite (`better-sqlite3`), `bcryptjs`, `jsonwebtoken`, `archiver`

---

## Installation & Local Development

1. **Prerequisites**: Node.js 20+ and npm.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set a strong `JWT_SECRET` (e.g. `openssl rand -hex 32`).
   - If you leave `ADMIN_INITIAL_USERNAME` and `ADMIN_INITIAL_PASSWORD` empty, visiting `/admin` for the first time will let you create your Owner Admin account securely in the browser.
4. **Run in development mode**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

---

## Database Setup & Migrations

- SQLite database schema lives in `server/migrations/001_init.sql`.
- On server startup (`server.ts`), `initDatabase()` automatically creates `./data/loraku.db`, runs migrations idempotently, and seeds the initial 3 categories, 15 products (with unconfigured prices/stock ready for owner input), and Store Settings (with official WhatsApp `+917029017716`).

---

## Production Build & Deployment

1. **Type-check & build the frontend**:
   ```bash
   npm run lint
   npm run build
   ```
2. **Start in production mode**:
   ```bash
   NODE_ENV=production npm start
   ```
   The Express server serves API routes under `/api/*`, owner uploads under `/uploads/*`, and the built Vite bundle from `dist/`.
3. **Deployment Tips**:
   - Mount a persistent volume on `./data` so `loraku.db`, `.jwt_secret`, and `uploads/` survive container restarts/redeploys.
   - Always run behind HTTPS in production so `httpOnly; Secure` session cookies and PWA Service Workers work properly.

---

## PWA Installation (Android & iOS)

- **Android (Chrome / Edge)**: Open the live HTTPS URL and tap **Install App** in the homepage hero/footer or choose **Add to Home screen** in the browser menu.
- **iPhone / iPad (Safari)**: Tap **Install App** for guided instructions, or tap Safari's **Share** button -> **Add to Home Screen**.

---

## Converting to an Android APK with Capacitor

> **Note**: An Android `.apk` file is **not** pre-built inside this project. A Capacitor configuration (`capacitor.config.json`) is included so you can wrap the built web app into an Android project when ready.

To build an Android APK on your machine (requires Android Studio & JDK 17):

1. Build the latest web assets:
   ```bash
   npm run build
   ```
2. Install Capacitor CLI and Android platform:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap add android
   ```
3. Point `capacitor.config.json` `server.url` to your deployed HTTPS backend URL (recommended for live database/API sync), or configure your API base URL, then sync:
   ```bash
   npx cap sync android
   ```
4. Open Android Studio to compile and sign your APK / AAB:
   ```bash
   npx cap open android
   ```
   In Android Studio: **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
