# Spec — Transaction / Expense model (burn rate & runway)

**Status:** proposal, not implemented
**Blocks:** Liquidity Pulse → "Forecast Runway" card, currently shipping an
empty state because burn rate is not derivable from the current schema.

---

## 1. Why this is needed

The schema today models exactly one direction of money: receivables. `Invoice`,
`Payment`, `PaymentLink`, `Reminder` and `CashflowForecast` all describe cash
coming *in*.

Runway is:

```
runway_months = current_cash_position / net_monthly_burn
```

Neither term exists:

| Term | Status |
|---|---|
| `current_cash_position` | No field on `Organization` or anywhere else. `CashflowForecast.predictedCashPosition` is a *forecast output*, not an observed balance, and nothing currently writes to it. |
| `net_monthly_burn` | Requires outflows. There is no expense, payroll, vendor-bill or cash-out record of any kind in `schema.prisma`. |

No amount of arithmetic over receivables produces a burn rate. This needs new
tables.

---

## 2. Data model

### 2.1 `Transaction`

The general cash-movement ledger. Deliberately covers both directions so a bank
feed can be ingested wholesale without classifying every row up front.

```prisma
model Transaction {
  id             String            @id @default(uuid())
  organizationId String

  direction      TransactionDirection          // INFLOW | OUTFLOW
  amount         Decimal           @db.Decimal(15, 2)   // always positive
  currency       String            @default("INR")

  category       ExpenseCategory?              // null until classified
  description    String
  counterparty   String?                       // vendor / payee name

  occurredAt     DateTime                      // value date, NOT ingest date
  source         TransactionSource @default(MANUAL)
  externalId     String?                       // provider's id, for idempotency

  // Recurring outflows (payroll, rent, SaaS) are the backbone of a stable burn
  // rate. Flagging them lets the calculation separate baseline from one-offs.
  isRecurring    Boolean           @default(false)
  recurrenceRule String?                       // RFC 5545 RRULE subset

  // Excluded from burn without deleting the record — e.g. a one-off equipment
  // purchase or an intra-account transfer that would distort the average.
  excludedFromBurn Boolean         @default(false)

  invoiceId      String?                       // links an INFLOW to its invoice
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  organization   Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invoice        Invoice?          @relation(fields: [invoiceId], references: [id], onDelete: SetNull)

  @@unique([organizationId, source, externalId])   // idempotent re-sync
  @@index([organizationId, occurredAt])
  @@index([organizationId, direction, occurredAt])
}

enum TransactionDirection { INFLOW OUTFLOW }

enum TransactionSource { MANUAL CSV_IMPORT BANK_FEED ACCOUNTING_SYNC }

enum ExpenseCategory {
  PAYROLL RENT SOFTWARE MARKETING PROFESSIONAL_FEES
  TAXES UTILITIES INVENTORY TRAVEL EQUIPMENT OTHER
}
```

**Why `amount` is always positive:** signed amounts invite double-negation bugs
the moment someone writes `SUM(amount)` without filtering direction. Direction
is explicit and indexed.

**Why `occurredAt` ≠ `createdAt`:** a CSV imported in August containing June
rows must contribute to June's burn, not August's.

**Why `@@unique([organizationId, source, externalId])`:** re-running a sync must
not double-count. This is the single most important constraint here — a
duplicated payroll row silently halves the reported runway.

### 2.2 `CashAccount`

Runway needs a *balance*, which cannot be reconstructed from transactions alone
unless every transaction since inception is present. It must be stated.

```prisma
model CashAccount {
  id             String   @id @default(uuid())
  organizationId String

  name           String              // "HDFC Current — 4471"
  accountType    CashAccountType @default(CURRENT)
  currency       String   @default("INR")

  // Observed balance and when it was true. Runway rolls this forward using
  // transactions after `balanceAsOf`, rather than trusting a stale number.
  currentBalance Decimal  @db.Decimal(15, 2)
  balanceAsOf    DateTime

  isActive       Boolean  @default(true)
  source         TransactionSource @default(MANUAL)
  externalId     String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, source, externalId])
  @@index([organizationId, isActive])
}

enum CashAccountType { CURRENT SAVINGS CREDIT_LINE ESCROW }
```

### 2.3 Organization relations

```prisma
model Organization {
  // ...
  transactions Transaction[]
  cashAccounts CashAccount[]
}
```

---

## 3. Burn rate calculation

Lives in `backend/src/forecasting/burn-rate.service.ts` and is exposed to the
frontend through one endpoint. The frontend must not re-derive it — that is
exactly how the Scenario Simulator and the dashboard drift apart.

### 3.1 Definitions

```
window            = trailing 3 complete calendar months (exclude current partial month)

gross_burn        = Σ OUTFLOW.amount  where excludedFromBurn = false
                                        and occurredAt in window
                    ÷ months_in_window

operating_inflow  = Σ INFLOW.amount   where excludedFromBurn = false
                                        and occurredAt in window
                    ÷ months_in_window

net_burn          = gross_burn − operating_inflow

cash_position     = Σ CashAccount.currentBalance  (isActive, excl. CREDIT_LINE)
                  + Σ transactions after each account's balanceAsOf

runway_months     = net_burn > 0 ? cash_position / net_burn : null
```

### 3.2 Rules that matter

- **Exclude the current partial month.** A month that is 3 days old makes burn
  look 90% lower. Use complete months only.
- **`net_burn <= 0` returns `null`, not `Infinity`.** A cash-flow-positive org
  has no runway *problem*; the UI should say "Cash-flow positive", not "∞
  months". This mirrors the null-not-NaN convention already used in
  `frontend/app/dashboard/liquidityMetrics.ts`.
- **Require a minimum window.** Fewer than 2 complete months of transactions
  → return `null` with reason `INSUFFICIENT_HISTORY`. One month of data is
  noise, and a wrong runway is worse than no runway.
- **Exclude `CREDIT_LINE` from cash position** — borrowing capacity is not cash.
- **Currency.** Mixed-currency orgs must not sum naively. v1: compute per
  currency and return runway only when a single currency is present; otherwise
  `MIXED_CURRENCY`. FX conversion is out of scope.

### 3.3 Return shape

Mirrors the null-carrying convention already established:

```ts
interface RunwayResult {
  runwayMonths: number | null;
  cashPosition: number | null;
  netBurn: number | null;
  grossBurn: number | null;
  windowMonths: number;
  currency: string;
  unavailableReason:
    | null
    | 'NO_CASH_ACCOUNTS'
    | 'NO_TRANSACTIONS'
    | 'INSUFFICIENT_HISTORY'
    | 'CASH_FLOW_POSITIVE'
    | 'MIXED_CURRENCY';
}
```

`GET /api/forecasting/runway` → `RunwayResult`.

The card then renders the number when present, and maps
`unavailableReason` to its own message when not — no fabricated fallback.

---

## 4. Input paths

Three, shipped in this order. Each is independently useful.

### Phase 1 — Manual entry (unblocks the card)

- `/dashboard/expenses`: table + "Add expense" drawer.
- Fields: amount, direction, category, description, counterparty, occurredAt,
  isRecurring.
- `CashAccount` editor: name, type, current balance, balance-as-of date.
- **Recurring templates** matter most here: entering payroll once with
  `isRecurring` gives a usable burn rate immediately, instead of requiring
  months of manual history.
- Ships with `source = MANUAL`.

### Phase 2 — CSV import

- Upload → column mapper → preview → commit.
- Reuses the OCR module's existing upload plumbing.
- Dedupe on `(occurredAt, amount, description)` hash written to `externalId`.
- Counts against the plan's upload quota (see `plan.config.ts`).

### Phase 3 — Accounting / bank sync

- The integrations already advertised on the landing page — QuickBooks, Xero,
  Zoho Books — all expose expense endpoints. Connect via `/dashboard/setup`,
  which is where the Forecast Runway CTA already points.
- Nightly pull into `Transaction` with `source = ACCOUNTING_SYNC`, idempotent on
  `externalId`.
- Auto-classify `category` by vendor; leave `null` when unsure rather than
  guessing, and surface an "N transactions need categorising" nudge.
- Likely a **Premium** gate, consistent with the Scenario Simulator.

---

## 5. Tiering

Burn rate feeds the Scenario Simulator, already Premium. Suggested split:

| | Free | Premium |
|---|---|---|
| Manual expenses + cash accounts | ✅ | ✅ |
| Runway card | ✅ | ✅ |
| CSV import | ✅ (counts to upload quota) | ✅ unlimited |
| Accounting/bank sync | ❌ | ✅ |
| Runway in Scenario Simulator | ❌ | ✅ |

Runway itself should stay free — it is the hook that makes the Premium
simulator worth paying for.

---

## 6. Migration & rollout

1. Add models + enums; `prisma migrate dev`. **Additive only** — no existing
   table changes, so this is a safe deploy.
2. Seed a `CashAccount` and ~12 weeks of `Transaction` rows for the demo org, so
   the card demonstrates real behaviour rather than an empty state.
3. `burn-rate.service.ts` + `GET /api/forecasting/runway`.
4. Wire the Forecast Runway card; keep every `unavailableReason` branch.
5. Phase 1 UI at `/dashboard/expenses`; add to sidebar; repoint the card's CTA
   from `/dashboard/setup` to `/dashboard/expenses`.

**Test cases that must exist before this is trusted:**
zero accounts · single month of history · cash-flow-positive org · mixed
currency · duplicate sync (idempotency) · transaction dated before
`balanceAsOf` (must not double-count) · excluded one-off equipment purchase.

---

## 7. Open questions

1. **Cash position** — manual "current balance" entry, or require a bank feed?
   Manual is faster to ship but goes stale silently. Suggest manual, with a
   "balance is N days old" warning past 7 days.
2. **Burn window** — 3 months is the common default; lumpy quarterly outflows
   (advance tax, annual SaaS) may argue for 6. Recommend 3, configurable.
3. **Should paid `Invoice` rows auto-create INFLOW transactions?** Avoids double
   entry, but risks double-counting against a bank feed carrying the same
   deposit. Suggest: no auto-create; reconcile via `Transaction.invoiceId`.
4. **Does runway belong in the Liquidity Pulse row at all**, or is it a larger
   module with a chart? Current placement assumes a single number is enough.
