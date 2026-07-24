# KTC Trade Manager — Frontend Prototype

A responsive web app for **Kassam Trading Company** covering the full export trade workflow:
Client CRM → Outreach & Email Tracking → Inquiries → Orders → Shipments → Documents → Products → Amazon → Analytics → Settings.

This is the **frontend prototype** built from the KTC App PRD. It runs entirely on mock data
(`src/data/mockData.js`) so you can click through every screen before connecting a real backend.

---

## 1. Requirements

- **Node.js** version 18 or higher (download from [nodejs.org](https://nodejs.org))
- npm (comes with Node)

Check your versions:
```bash
node -v
npm -v
```

---

## 2. Setup

1. Unzip this project folder.
2. Open a terminal inside the `ktc-app` folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open the URL shown in the terminal (usually `http://localhost:5173`).

---

## 3. Viewing on Mobile (same WiFi network)

The dev server is configured with `host: true`, so it's reachable from your phone:

1. Run `npm run dev` — note the **Network** URL printed (e.g. `http://192.168.1.42:5173`).
2. On your phone (same WiFi), open that URL in the browser.
3. The layout automatically switches to mobile mode: top bar + bottom navigation + "More" menu.

---

## 4. What's Included

| Screen | File | Notes |
|---|---|---|
| Dashboard | `src/pages/Dashboard.jsx` | KPIs, revenue chart, pipeline chart, tasks |
| Clients (CRM) | `src/pages/Clients.jsx` | Searchable/filterable lead & buyer list |
| Client Profile | `src/pages/ClientProfile.jsx` | Full email chain, orders, documents per client |
| Outreach | `src/pages/Outreach.jsx` | Campaign CTR, open rate, reply rate analytics |
| Inquiries | `src/pages/Inquiries.jsx` | Quote/inquiry tracking |
| Orders | `src/pages/Orders.jsx` | Kanban board by status + full list |
| Order Detail | `src/pages/OrderDetail.jsx` | Document checklist, shipment info |
| Shipments | `src/pages/Shipments.jsx` | Container/vessel/BL tracking cards |
| Documents | `src/pages/Documents.jsx` | Central document library |
| Products | `src/pages/Products.jsx` | Product catalog with stock & pricing |
| Amazon | `src/pages/Amazon.jsx` | Listings, inventory, sales tracking |
| Analytics | `src/pages/Analytics.jsx` | Revenue trends, country breakdown, pipeline |
| Settings | `src/pages/Settings.jsx` | Users, roles, connected accounts (no passwords stored) |

---

## 5. Responsive Behavior

- **Desktop / laptop (≥1024px):** Fixed left sidebar navigation, full tables, multi-column grids.
- **Tablet / mobile (<1024px):** Top bar + bottom navigation bar with a "More" sheet for
  additional sections. Tables scroll horizontally; grids collapse to 1–2 columns.

All breakpoints are defined in `src/index.css`.

---

## 6. Design System

Colors, type, spacing, and component styles are defined as CSS variables at the top of
`src/index.css` (`:root` block) — change these to update the look across the whole app.

- **Primary green:** `#1A4D2E` (paddy green)
- **Accent gold:** `#C49A2B` (harvest gold)
- **Display font:** Fraunces (headings)
- **Body font:** Inter

---

## 7. Next Steps — Connecting a Backend

This prototype currently reads from `src/data/mockData.js`. To connect a real backend:

1. Replace the static imports from `mockData.js` with API calls (e.g. `fetch` or `axios`)
   to your backend endpoints (`/api/clients`, `/api/orders`, etc.)
2. Add authentication (login page + JWT token handling) — see Section 2 of the PRD for
   role-based permissions (Admin, Director, Sales Executive, Export Manager).
3. Add a `.env` file for API base URL and keys — never commit secrets to git.
4. Connect email tracking (Gmail API / SendGrid) for the Outreach module.
5. Connect Amazon SP-API for the Amazon module.

Refer to the **KTC App PRD & User Journey** document (Section 9 — Technical Specifications)
for the recommended tech stack: Node.js/Express or Python backend, PostgreSQL database,
AWS S3 for documents, and JWT-based authentication.
# KTC Trade Manager

React/Vite operations app backed by Supabase Auth, PostgreSQL, Storage, and Edge Functions.

## Local setup

1. Install Node.js 20 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`.
4. Set `VITE_SUPABASE_URL` and the browser-safe `VITE_SUPABASE_ANON_KEY`.
5. Run `npm run dev`.

Never place a Supabase service-role key in a `VITE_` variable or in this repository.

## Database deployment

Link the Supabase CLI to the intended project, review the target with `supabase migration list`,
then run `supabase db push`. The migrations are additive, but should be tested on a staging
project before production. After deployment, open an order as an Admin or Director and use
**Copy buyer link** to issue a secure, revocable tracking link.

## Verification

Run `npm run lint` and `npm run build` before deployment. Deploy the generated Vite application
with the same two public environment variables configured in the hosting platform.
# Order automation

Phase 3 adds database-backed SLA timers, WhatsApp notification outbox processing,
and repeat-order reminders 30 days after delivery. Deploy
`supabase/functions/dispatch-whatsapp`, configure the three non-browser secrets
documented in `.env.example`, and invoke the function hourly with an
`Authorization: Bearer <AUTOMATION_SECRET>` header. Create and approve the
`order_status_update` and `repeat_order_reminder` templates in WhatsApp Manager
before enabling the schedule.
