# TenantHub — Rental Dashboard

Next.js rental management dashboard backed by a Google Sheet JSON API.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- TanStack React Query
- react-chartjs-2 + Chart.js
- Lucide React

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this repo to GitHub (see below).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Next.js — no custom build settings needed.
4. Add **Environment Variables** in Project Settings → Environment Variables:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SHEETS_API_URL` | Your Google Apps Script Web App URL |
| `NEXT_PUBLIC_USE_MOCK_DATA` | `false` |

5. Deploy. The `/api/dashboard` route proxies your Sheet API server-side (no CORS issues).

## Google Sheets API

1. Create a Google Apps Script bound to your sheet.
2. Deploy as **Web app** — Execute as *Me*, access *Anyone*.
3. Set `NEXT_PUBLIC_SHEETS_API_URL` in `.env.local` to your deployment URL.
4. Set `NEXT_PUBLIC_USE_MOCK_DATA=false` to load live data.

### Sheet API format

The live API returns a JSON **array** of billing rows (`Month`, `Room`, `Rent`, `ElecBill`, `WaterBill`, `Total`, `Status`, …). The app transforms this into dashboard KPIs, charts, and the utility table via `src/lib/transformSheetData.ts`.

A pre-shaped dashboard object (`kpis`, `revenueTrend`, etc.) is also supported if you change your Apps Script later.

### Properties occupancy

The **Properties** card is **not static** when `NEXT_PUBLIC_USE_MOCK_DATA=false`. It is calculated from each month’s billing rows:

- **Occupied:** rooms `1–6` (apartment) or `7–8` (commercial) that appear in the API with status `Paid`, `Partial`, or `Unpaid`
- **Vacant:** rooms with no row for that month, or with `Status: "Vacant"`

Your API currently returns only active rooms (`1, 3, 4, 6, 7`), so counts may look unchanged month to month (e.g. **4/6** and **1/2**). To show vacant units explicitly, include every room in the Apps Script JSON each month (including vacant rows with `"Status": "Vacant"`).

## Project structure

- `src/services/api.ts` — fetch + normalize Sheet JSON
- `src/components/dashboard/Dashboard.tsx` — main dashboard UI
- `src/types/dashboard.ts` — TypeScript types
