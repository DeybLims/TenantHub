# TenantHub — Rental Dashboard

Next.js rental management dashboard backed by **Supabase** or Google Sheets.

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
# Add Supabase keys (recommended) — see Data source below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data source: Supabase (recommended)

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`, API routes use **Supabase** instead of Google Sheets.

1. Run `scripts/supabase/schema.sql` in the Supabase SQL Editor.
2. Supabase → **Project Settings → API** → copy Project URL and `service_role` key into `.env.local`.
3. Restart `npm run dev`.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser — it is server-only.

## Deploy on Vercel

1. Push this repo to GitHub (see below).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Next.js — no custom build settings needed.
4. Add **Environment Variables** in Project Settings → Environment Variables:

| Name | Value |
|------|--------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `NEXT_PUBLIC_USE_MOCK_DATA` | `false` |

Or, for Google Sheets only: `NEXT_PUBLIC_SHEETS_API_URL` instead of Supabase vars.

5. Deploy. API routes run server-side (no CORS issues).

## Google Sheets API (legacy)

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

- `src/lib/supabase/` — Supabase client, mappers, repository
- `src/services/api.ts` — client fetch layer
- `src/components/dashboard/Dashboard.tsx` — main dashboard UI
- `src/types/dashboard.ts` — TypeScript types
