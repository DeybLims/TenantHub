# TenantHub — Complete Project Overview

TenantHub is a web dashboard for running one rental building: **6 apartment units and 2 commercial units**. The owner uses it to keep the tenant list, generate monthly bills (rent + electricity + water), record payments, and compare what tenants paid for utilities against what the building paid Meralco and MIWD.

This document describes everything: the pages, every button and form, how data is stored, how every number is calculated, and the rules and edge cases the system follows.

---

## 1. Technology

| Part | What is used |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS (custom colors: navy `#1e2a4a`, brand blue `#2563eb`, emerald, orange, coral) with the Inter font |
| Data fetching in the browser | TanStack React Query v5 |
| Database | Supabase (PostgreSQL) |
| Icons | Lucide React |
| Charts | Chart.js / react-chart-js-2 (only the payment donut is currently shown) |
| Hosting | Vercel (API routes run server-side) |
| Legacy data source | Google Sheets via a Google Apps Script web app (`scripts/BuildingRentalsAPI.gs`) |

### Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key with full database access. Never sent to the browser. |
| `NEXT_PUBLIC_SHEETS_API_URL` | Google Apps Script URL — only used when Supabase is not configured |
| `NEXT_PUBLIC_USE_MOCK_DATA` | `true` shows built-in sample data instead of real data |

**Data source rule:** when both Supabase variables are set, every API route uses Supabase. Otherwise the app falls back to Google Sheets. Mock mode overrides both in the browser.

---

## 2. The building

| Room number | Unit code | Type |
|---|---|---|
| 1–6 | APT-101 … APT-106 | Apartment |
| 7 | COM-201 | Commercial |
| 8 | COM-202 | Commercial |

- There are always exactly **8 rooms**. Each room has exactly one row in the `tenants` table.
- A room is either **Active** (has a tenant) or **Vacant** (empty row: no name, no dates, rent 0).
- If a vacant row has no unit code, the default is `APT-10N` for rooms 1–6 and `COM-20N` for rooms 7–8.

---

## 3. How the app is structured

```
Browser (React pages)
   │  fetch() via src/services/api.ts
   ▼
Next.js API routes (src/app/api/*)          ← run on the server
   │  if Supabase configured → src/lib/supabase/repository.ts
   │  else                   → Google Apps Script (Sheets)
   ▼
Supabase PostgreSQL (service role key)
```

- The browser never talks to Supabase directly. All reads and writes go through the API routes, which use the service role key.
- The database stores data in database format (snake_case, dates like `2026-08-01`). The repository converts it to the "sheet row" format the UI was originally built around (`Month: "August 2026"`, `ElecPrev`, `TotalDue`, …). This is why many types are called `SheetRow`.

### API routes

| Route | Method | What it does |
|---|---|---|
| `/api/tenants` | GET | All 8 tenant rows, ordered by room |
| `/api/tenants` | POST `saveTenant` | Add a tenant to a vacant room, or edit an existing tenant |
| `/api/tenants` | POST `deleteTenant` | Remove a tenant (sets the room to Vacant — see §6.3) |
| `/api/dashboard?action=getBilling` | GET | Every bill (optionally filtered by `month`), each with its payment history attached |
| `/api/billing` | POST `generateBill` | Create a new bill |
| `/api/billing` | POST `updateBill` | Update a bill (used when recording payments) |
| `/api/utility-expenses?month=` | GET | The saved Meralco/MIWD expense record for one month |
| `/api/utility-expenses` | POST | Save (insert or overwrite) one month's expense record |
| `/api/expenses` | GET/POST | Legacy Google Sheets general expenses only — not used by any page |

---

## 4. Database (Supabase)

The full schema is in `scripts/supabase/schema.sql`, with later additions in `add-utility-expense-fields.sql` and `add-tenant-credit-balance.sql`. Row Level Security is on for every table; the app bypasses it with the service role key.

### 4.1 `tenants` — one row per room

| Column | Meaning |
|---|---|
| `room` | 1–8, **unique** |
| `unit_code` | e.g. `APT-101` |
| `name`, `contact_number`, `email_address`, `emergency_contact`, `emergency_number` | Profile fields |
| `lease_start`, `move_in` | Dates. **Move-in controls which bills are shown** (see §7.6) |
| `rent`, `deposit` | Pesos |
| `notes` | Free text |
| `status` | `Active` or `Vacant` |
| `credit_balance` | Overpayment carried forward to the next bill (pesos) |

### 4.2 `billing_records` — one row per room per month

| Column | Meaning |
|---|---|
| `billing_month` | Always stored as the 1st of the month (`2026-08-01`) |
| `room` | Links to `tenants.room` |
| `rent` | Base rent for this bill |
| `elec_prev`, `elec_curr`, `elec_rate`, `elec_bill` | Electricity meter readings, rate, amount |
| `water_prev`, `water_curr`, `water_rate`, `water_bill` | Water meter readings, rate, amount |
| `adjustment` | "Other Charges" |
| `total_due` | rent + elec_bill + water_bill + adjustment |
| `paid` | Total paid so far on this bill |
| `date_paid` | Date of the latest payment |
| `billing_date`, `due_date` | Defaults: 15th and 20th of the billing month |
| `notes` | Free text |
| `status` | `Paid`, `Unpaid`, `Partial` (or `Vacant` for old imported data) |

**Rule:** a room can only have **one bill per month** (database constraint on `billing_month + room`).

### 4.3 `payment_activities` — every individual payment

| Column | Meaning |
|---|---|
| `billing_record_id` | Which bill the payment went to (deleted together with the bill) |
| `payment_date` | Date of the payment |
| `amount` | Must be greater than 0 |
| `method` | `cash`, `bank`, `online`, or `other` |
| `reference_notes` | Reference number or note |

### 4.4 `utility_expenses` — one row per month

Stores what the owner typed on the Expenses page for that month: Meralco total kWh, electricity charge rate, JJC / Tenant / Motor kWh, Meralco master bill, MIWD total m³, water charge rate, Residential / Commercial m³, MIWD master bill. One row per `billing_month` (saving again overwrites it).

Some older columns are kept for compatibility but are no longer shown in the app: `meralco_paid_this_month`, `miwd_paid_this_month`, `pumped_water_charge_m3`, `electricity_motor_rate`, `water_motor_rate`, `miwd_special_rate`.

### 4.5 `general_expenses`

Exists in the schema but is **not used** by the app.

---

## 5. How data loads and refreshes in the browser

- React Query caches each kind of data under a key:
  - `["tenants"]` — the tenant list
  - `["billing", "rows"]` — every bill with payments
  - `["utility-expense", "YYYY-MM"]` — one month's expense record
- Cached data counts as fresh for **60 seconds** and is **not** reloaded when you switch browser tabs. Expense records stay cached until saved.
- After any change (add/edit/delete tenant, generate bill, pay balance, save expenses), the app tells React Query to reload the affected data, so every page shows the new values.
- **Months.** The database stores `2026-08-01`, the UI shows `August 2026`, and all comparisons use the month key `2026-08`. Comparing by month key (not by exact date) avoids time-zone shifts, such as an end-of-July date turning into August in UTC+8.

---

## 6. Tenants page (`/tenants`)

### 6.1 Tenant list

- Shows **every Active tenant**, whatever their move-in date.
- Columns:
  - **Unit Code/Tenant**
  - **Rent**
  - **Lease Start & Move-in Date** (the move-in date is shown as a second line when it differs from lease start)
  - **Status**: the tenant's overall payment status across all of their bills since move-in:
    - **Paid** — nothing owed
    - **Partial** — some paid, balance remains
    - **Unpaid** — nothing paid
    - **No Bill** — no bills yet
- Clicking a row opens that tenant's details panel on the right.

### 6.2 Add New Tenant

- The **+ Add Tenant** button opens a form. It only works when at least one room is Vacant. If all 8 are occupied it says so.
- **Fields:**
  - Vacant Unit (dropdown, shown only when more than one room is vacant)
  - Unit Code (pre-filled)
  - Tenant Name
  - Contact Number
  - Email Address
  - Lease Start
  - Move-in Date
  - Base Rent
  - Deposit
- **Required:** Tenant Name and Move-in Date. If Lease Start is empty it uses the Move-in Date.
- On save the room becomes **Active**. Any leftover bills from a previous occupant of that room are **deleted**, and credit is reset to 0, so the new tenant starts clean.

### 6.3 Tenant details panel

- **Editable:**
  - Full Name
  - Contact Number
  - Email Address
  - Emergency Contact
  - Emergency Number
  - Lease Start
  - Move-in Date
  - Base Rent
  - Deposit
  - Notes
- **Save / Cancel:** saves the edits, or puts the fields back to the saved values.
- **Editing keeps the tenant's bills.** Renaming a tenant does not create a new tenant.
- **Billing Summary card:**
  - Current Balance = total of all bills since move-in minus total paid
  - Last Payment = amount and date of the most recent payment
  - Clicking the card opens the Billing page with that tenant's full statement already open, with the date range widened to cover all their bills.
- **Delete:** asks for confirmation, then:
  - **permanently deletes all bills and payments for that room**
  - clears every profile field
  - sets the room to **Vacant** and credit to 0
- **Export PDF:** opens the browser print dialog with a formatted tenant report.

---

## 7. Billing page (`/billing`)

### 7.1 Layout

- **Generate Bill** button (top right).
- **Summary widgets:**
  - **Date Range** (From → To)
  - **Total Collected** (and number of payments)
  - **Outstanding Balance** (and number of tenants owing)
  - **Overdue Accounts** (tenants with Unpaid/Partial bills that still have a balance)
- **Billing table:** **one row per tenant**, totalling all of that tenant's bills inside the date range.
  - Columns: Unit Code/Tenant, Billing Period, Amount Due, Paid, Balance, Status.
  - Balance is red when above 0.

### 7.2 Date range behavior

- By default the range is **the 15th of the latest billed month to the 15th of the next month**. So the table initially shows only the latest month. Widen the range to include older months.
- Filtering compares by month, not by exact day.
- With no bills at all, the page anchors on the current month so the first bill can still be generated.

### 7.3 Generate Bill (new invoice)

**Fields:**
- Unit Code (Active tenants only); Tenant Name fills in automatically.
- **Billing Month** (month picker): any month, including past months for backfilling. Changing it sets Billing Date to the 15th and Due Date to the 20th, and reloads the previous readings.
- Billing Date, Due Date (editable).
- Base Rent: pre-filled from the tenant's rent, editable.
- **Electricity:**
  - Previous reading: pre-filled with the *current* reading of the room's latest bill **before** the chosen month, editable.
  - Current reading.
  - Rate: default ₱14/kWh; the toggle allows a special rate.
  - Amount = (Current − Previous) × Rate.
- **Water:**
  - Previous / Current readings work the same way.
  - Rate: default depends on room and month (see §10).
  - Amount = (Current − Previous) × Rate.
- Other Charges.
- **Total Due This Month** = Rent + Electricity + Water + Other Charges.
- **Previous Balance** and **Total Amount Owed** (shown only if the tenant has unpaid older bills).
- **Amount Paid** (optional payment made at the time of billing).
- **Balance** = Total Amount Owed − Amount Paid − credit applied.
- Notes.

**Checks before saving:**
- A month and unit must be selected.
- **Current reading cannot be lower than Previous.** The only exception is **May**, the correction month, which allows negative usage.
- **Duplicate block:** if the room already has a bill for that month, the form shows "Invoice denied" and Save is disabled.
- **Before move-in warning:** if the chosen month is before the tenant's move-in month, an amber notice explains the bill would be hidden. Save stays disabled until the owner ticks *"Change move-in date to <1st of that month> and create this bill"*. Saving then moves the tenant's move-in date back.

**What the server does when the bill is saved:**
1. Rejects a duplicate room + month.
2. Rejects a month before move-in, unless the move-in update was requested (and then performs it).
3. Calculates the amounts again on the server and inserts the bill as **Unpaid** with paid = 0.
4. If **Amount Paid** > 0, applies it to the room's unpaid bills **oldest first**, ending with the new bill. Each bill touched gets a payment record (method "other", note "Paid when a new bill was generated").
5. If the tenant has **credit**, it is applied to whatever is still owed on the new bill (note "Credit from previous overpayment").
6. Any amount left over after every bill is fully paid is **added to the tenant's credit**.
7. Shows a message such as "₱200.00 credit applied" or "₱200.00 carried over as credit".

### 7.4 Tenant statement (click a table row)

- **Header:**
  - Tenant name and unit code.
  - Credit badge ("Credit ₱X · applies to next bill") if the tenant has credit.
- **Cards:** Amount Due, Paid, Balance, plus a **Pay Balance** button.
- **Bill history table**, newest first:
  - Columns: Due Date, Bill ID, Amount, Paid, Balance.
  - Bill ID format: `BILL-YYYYMM` + 3-digit room, e.g. `BILL-202608001` = Room 1, August 2026.
- **Click a bill to expand it.** The expanded view shows:
  - Base Rent.
  - Electricity (previous, current, amount, with a "Special Rate Applied" badge if the rate is not ₱14).
  - Water and Other Charges.
  - Every payment (date, method, amount, reference).
  - A "Partial Payment" box with its own Pay Balance button.
- **Export to PDF** prints the statement for the selected date range.
- The statement only includes bills inside the date range and **not before the tenant's move-in month**.

### 7.5 Pay Balance

- **Outstanding:** shows the total of **all unpaid bills since move-in**, ignoring the date range, plus the period they cover.
- **Fields:**
  - Payment Date (default today)
  - Amount (default = the oldest unpaid bill's balance)
  - Method: Cash, Bank Transfer (default), or Online
  - Reference
- **Payment spreads across bills.** The amount is applied **oldest bill first**, and an "Applied to (oldest first)" preview shows exactly how it will be split. Example: two ₱10,000 bills and a ₱15,000 payment → first bill Paid, second Partial with ₱5,000 left.
- **Overpayment is allowed.** Anything above the total owed becomes **tenant credit** (example: ₱13,000 paid on a ₱12,800 balance → ₱200 credit). The credit is used automatically on the next generated bill.
- **How it saves:** each affected bill is updated one at a time. Each one gets its own payment record, `paid` increases, status becomes Paid or Partial, and date_paid is set.

### 7.6 Move-in date rule (important)

The Billing page, the statement, Pay Balance, the tenant Billing Summary, and the Previous Balance in Generate Bill **all ignore bills dated before the tenant's move-in month** (or lease start if there is no move-in date).

- **Why:** a previous occupant's history never shows under a new tenant.
- **Side effect:** if a tenant's move-in date is set later than their real start, their earlier bills are still saved but **hidden**. Fix it by correcting the move-in date on the Tenants page. Generate Bill now warns about this before creating such a bill.

---

## 8. Expenses page (`/expenses`)

The page shows one month at a time; the month picker lists months that have bills, or the current month if there are none. On the left is the **Utility Expenses & Distribution** form; on the right is **Calculated Analytics & Distribution**.

### 8.1 Electricity (Meralco) inputs

| Field | Notes |
|---|---|
| Electricity Consumption (kWh) | Total from the Meralco bill |
| Electricity Charge Rate (₱/kWh) | Optional. If empty: Master Bill ÷ Total kWh; if no bill either: ₱14 |
| JJC Consumption | kWh |
| Tenant Consumption | kWh |
| Motor Consumption | kWh. Also used for the Pumped Water Charge under Water |
| Meralco Master Bill Amount | ₱ from the Meralco bill |
| Balance (read-only) | = Master Bill (or total kWh × rate as a preview if no bill entered) |

**Auto-split:**
- Typing a total splits it evenly across JJC / Tenant / Motor.
- Typing one part makes the remaining parts share what's left, so the three always add up to the total.
- Once all three are filled, editing one re-opens the others to take the remainder.

### 8.2 Water (MIWD) inputs

| Field | Notes |
|---|---|
| Water Consumption (m³) | Total from the MIWD bill |
| Water Charge Rate (₱/m³) | Optional. If empty: MIWD Bill ÷ Total m³; if no bill either: ₱45 |
| Residential Base | m³ |
| Commercial Base | m³ (the two auto-split the total the same way) |
| MIWD Master Bill Amount | ₱ from the MIWD bill |
| Pumped Water Charge (read-only) | = Motor kWh × electricity rate. Shows how much pump electricity is charged to water. |
| Balance (read-only) | = MIWD Master Bill + Pumped Water Charge |

### 8.3 Save / Cancel

- **Save** writes the month's record to the `utility_expenses` table, overwriting any earlier save. A "Changes saved" message appears.
- **Cancel** puts the form back to the last saved values.
- Values typed on an older version of the site (stored in the browser) appear as unsaved changes, so they can be saved to the database or discarded.

### 8.4 Calculated Analytics

**Electricity (Meralco)**

| Row | Formula |
|---|---|
| JJC Consumption | JJC kWh × rate |
| Tenant Consumption | Tenant kWh × rate |
| Motor Consumption | Motor kWh × rate |
| Master Bill Amount | Meralco Master Bill (or JJC + Tenant + Motor amounts if empty) |
| Paid Tenant Billed | The electricity portion of what tenants actually paid on this month's bills |
| Total Tenant Cost | Tenant Consumption amount |
| **NET ELECTRICITY PROFIT** | Paid Tenant Billed − Total Tenant Cost |

**Water (MIWD)**

| Row | Formula |
|---|---|
| Residential Base | Residential m³ × water rate |
| Commercial Base | Commercial m³ × water rate |
| Master Bill Amount | MIWD Master Bill (or Residential + Commercial if empty) |
| Pumped Water Charge | Motor amount (from electricity) |
| Paid Tenant Billed | The water portion of what tenants actually paid on this month's bills |
| Total Tenant Cost | Residential + Commercial |
| **NET WATER PROFIT** | Paid Tenant Billed − Total Tenant Cost − Pumped Water Charge |

**How a tenant payment is split into electricity and water:** a payment fills the **electricity** charge first, then **water**, then rent. A bill marked fully Paid counts its full electricity and water amounts.

- Analytics stay at ₱0 until a consumption total is entered.
- **Meter reading warnings** list rooms whose current reading is below the previous one, except in May.
- **Download Report** prints the month's expense report.

---

## 9. Dashboard (`/`)

The month picker lists months with bills. It defaults to the current month if it has bills, otherwise the latest. With no bills at all, the dashboard shows ₱0 for the current month.

### KPI cards

| Card | Formula |
|---|---|
| **Utility Charges** | Electricity Actual Cost + Water Actual Cost (from the Operating Expenses table) |
| **Tenant Collections** | Electricity Tenant Paid + Water Tenant Paid |
| **Outstanding Balance** | Sum over the month's bills of (Total Due − Paid), never below 0 |
| **Net Income** | Everything tenants paid on the month's bills (rent included) − Utility Charges |

### Operating Expenses table (Electricity, Water, Total)

- **Actual Cost:**
  - Electricity = JJC + Motor + Tenant amounts from the Expenses page.
  - Water = Residential + Commercial + Pumped Water Charge.
  - If the Expenses page has nothing for the month, it falls back to what tenants were billed for that utility.
- **Tenant Paid:** the utility portion of tenant payments, split electricity first as in §8.4.
- **Status:** Tenant Paid − Actual Cost. Green for profit, red for loss.

### Other dashboard cards

- **Payment Overview donut:** collected vs. outstanding for the month's bills.
- **Properties / Occupancy:** occupied apartments (out of 6) and commercial units (out of 2), counted from the **tenant list** (Active with a name), not from bills.

---

## 10. Rates and billing rules

| Rule | Value |
|---|---|
| Electricity selling rate | **₱14/kWh** (special rate possible per bill) |
| Water selling rate, rooms 2–7 | **₱45/m³** |
| Water selling rate, rooms 1 and 8 | **₱30/m³ in January**, **₱35/m³ February–December** |
| Correction month | **May**: negative meter usage allowed (readings can go down) |
| Total Due | Rent + Electricity + Water + Other Charges |
| Bill status | Paid when paid ≥ total due; Partial when paid > 0; otherwise Unpaid |
| Payments | Always applied to the **oldest** unpaid bill first |
| Overpayment | Becomes tenant **credit**, applied automatically to the next bill |
| One bill per room per month | Enforced in the form, on the server, and by the database |
| Money rounding | 2 decimal places |

---

## 11. Data lifecycle summary

| Action | What happens to the data |
|---|---|
| Add tenant to a vacant room | Room becomes Active; any leftover bills and payments for that room are deleted; credit = 0 |
| Edit tenant (including rename) | Profile updated; **bills kept** |
| Delete tenant | **All bills and payments for the room deleted**; profile cleared; room Vacant; credit = 0 |
| Generate bill | New bill inserted; optional payment applied oldest-first; credit applied; any excess added to credit |
| Pay balance | Payment applied oldest-first across bills; one payment record per bill; any excess added to credit |
| Save expenses | Month's `utility_expenses` row inserted or overwritten |

---

## 12. Known behaviors and gotchas

1. **Bills before move-in are hidden.** Make sure each tenant's move-in date is their real start date, especially when entering historical bills.
2. **The first bill for a room has no previous readings** (they start at 0). Type the real previous readings by hand. Otherwise the whole meter value is charged as one month's usage.
3. **Previous readings are copied when a bill is created.** If an earlier month is backfilled later, the next month's bill keeps its old previous reading. To change it, delete and recreate that bill.
4. **The Billing table shows only the latest month by default.** Widen the date range to see older bills.
5. **Deleting a tenant permanently removes the room's billing history.** There is no undo. The only way back is a database backup.
6. **Payment dates use the UTC date.** A payment recorded before 8:00 AM Philippine time defaults to yesterday's date; it can be changed in Pay Balance.
7. **Pay Balance saves each bill one at a time.** If the connection drops halfway, some bills may be updated and others not. Check the statement afterward.
8. **No login on `main`.** Anyone with the website link can view and change data. A login system is in progress on the `feature/auth` branch (see §15).

---

## 13. Exports

All exports use the browser's **print dialog**; choose "Save as PDF" to get a file. The report is rendered into a hidden area, printed, then removed.

- **Tenant report:** from the tenant details panel.
- **Billing statement:** from the statement window.
- **Expense report:** "Download Report" on the Expenses page.

---

## 14. Project files

### Pages (`src/app`)

- `/` → `components/dashboard/Dashboard.tsx`
- `/tenants` → `components/tenants/TenantsPage.tsx`
- `/billing` → `components/billing/BillingPage.tsx`
- `/expenses` → `components/expenses/ExpensesPage.tsx`

### Core logic (`src/lib`)

| File | Responsibility |
|---|---|
| `supabase/repository.ts` | All database reads and writes, plus the tenant, bill, payment, and credit rules |
| `supabase/mappers.ts` | Converts database rows ⇄ UI format |
| `supabase/admin.ts` | Server-side Supabase client |
| `propertyBillingCalculations.ts` | Rates, consumption, room billing, monthly analytics |
| `mapBillingViewModel.ts` | Builds bill objects for statements; oldest-first payment allocation; move-in filtering |
| `billingSummary.ts` | Billing page totals, date range filter, one-row-per-tenant grouping |
| `buildBillingRows.ts` | Billing rows per month; duplicate bill check |
| `billingMeters.ts` | Previous meter readings lookup; reading validation |
| `tenantRooms.ts` | Room list, vacant slots, occupancy counts |
| `tenantBillingSummary.ts` | Tenant panel balance and last payment |
| `joinTenantsBilling.ts` | Tenant list with payment status |
| `paymentAllocation.ts` | Splits a payment into electricity, then water |
| `utilityConsumptionAllocation.ts` | Expense form auto-split |
| `transformSheetData.ts` | Dashboard KPIs, utilities table, occupancy |
| `months.ts` | Month parsing, keys, labels, sorting |
| `print*Report.tsx` | PDF / print exports |

### Other code

- **`src/hooks/useUtilityExpenseAnalytics.ts`:** loads and saves expense records and calculates all expense analytics.
- **`src/services/api.ts`:** browser-side functions that call the API routes.

### Unused leftover components

Kept in the repo but not shown on any page: `LogExpenseModal`, `ExpensesTable`, `ExpensesKpiCards`, `UtilityAnalyticsPanel`, `UtilityDistributionForm`, `UtilityAllocationGrid`, `ExpenseDetailPanel`, `TenantInvoiceModal`, `BillingDetailPanel`, `BillingDetails`, `BillingKpiCards`, `RevenueLineChart`, `UtilityUsageChart`, `RecentActivityList`, `TenantDetailPanel`.

### Scripts (`scripts/`)

| File | Purpose |
|---|---|
| `supabase/schema.sql` | Full database setup (tables, constraints, RLS, original seed data) |
| `supabase/add-utility-expense-fields.sql` | Adds the newer expense columns |
| `supabase/add-tenant-credit-balance.sql` | Adds `tenants.credit_balance` |
| `supabase/seed-prior-balances.sql` | Old balance seed data |
| `supabase/backups/` | JSON backups taken before data resets (git-ignored; contains tenant personal data) |
| `BuildingRentalsAPI.gs` | Legacy Google Apps Script backend |

---

## 15. Branches and work in progress

- **`main`:** the version given to the client.
- **`feature/auth` (not pushed; changes are stashed):** login system.
  - `/login` page in the app's design style.
  - All pages and APIs require sign-in; pages redirect to `/login`, APIs return 401.
  - Sign out button in the header.
  - Sessions last 7 days, in a signed, http-only cookie (`AUTH_SECRET`).
  - Accounts live in a new `app_users` table with bcrypt-hashed passwords. The table SQL is in `scripts/supabase/create-auth-tables.sql`.
  - Users are added with `node scripts/supabase/create-user.mjs <email> <password> ["Name"] [admin|staff]`.
  - The table and one admin account already exist in Supabase.
