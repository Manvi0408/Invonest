import type { Invoice } from './DashboardProvider';

/**
 * Pure calculations behind the Liquidity Pulse cards.
 *
 * Kept out of the page component so the Scenario Simulator can share them
 * rather than growing a second, drifting copy.
 *
 * Every function returns `null` instead of a number when the inputs can't
 * support an honest answer — an empty portfolio, a quarter with no payments,
 * an unparseable date. Callers render those as "—". Nothing here ever returns
 * NaN or a zero that merely means "no data".
 */

/** Receivables this far past due are treated as unlikely to be collected. */
export const WRITE_OFF_DAYS = 90;

/** Fixed industry benchmark for bad debt as a share of receivables. */
export const BAD_DEBT_INDUSTRY_THRESHOLD_PCT = 5;

const DAY_MS = 86_400_000;

/** Whole days from `b` to `a`, or null if either date is unparseable. */
function daysBetween(a: Date, b: Date): number | null {
  const t = a.getTime() - b.getTime();
  return Number.isFinite(t) ? Math.floor(t / DAY_MS) : null;
}

export function daysOverdue(inv: Invoice, now = new Date()): number {
  const d = daysBetween(now, new Date(inv.dueDate));
  // A bad date must not silently count as 90+ days overdue and inflate risk.
  return d ?? 0;
}

export interface BadDebtRisk {
  /** null when there are no outstanding receivables to divide by. */
  pct: number | null;
  atRiskAmount: number;
  outstandingAmount: number;
  invoiceCount: number;
  aboveThreshold: boolean;
}

export function computeBadDebtRisk(invoices: Invoice[], now = new Date()): BadDebtRisk {
  const outstanding = invoices.filter((i) => i.status !== 'PAID');
  const outstandingAmount = outstanding.reduce(
    (s, i) => s + (Number.isFinite(i.amount) ? i.amount : 0),
    0,
  );
  const doubtful = outstanding.filter((i) => daysOverdue(i, now) >= WRITE_OFF_DAYS);
  const atRiskAmount = doubtful.reduce(
    (s, i) => s + (Number.isFinite(i.amount) ? i.amount : 0),
    0,
  );

  // Guard the divide. A 0% here would read as "no bad debt" when the truth is
  // "nothing to measure" — those are different claims.
  const pct = outstandingAmount > 0 ? (atRiskAmount / outstandingAmount) * 100 : null;

  return {
    pct,
    atRiskAmount,
    outstandingAmount,
    invoiceCount: doubtful.length,
    aboveThreshold: pct !== null && pct > BAD_DEBT_INDUSTRY_THRESHOLD_PCT,
  };
}

export interface CollectionSpeed {
  currentDays: number | null;
  priorDays: number | null;
  sampleSize: number;
  priorSampleSize: number;
  /** null when either quarter is empty — no improvement claim is made. */
  improved: boolean | null;
}

const quarterOf = (d: Date) => Math.floor(d.getMonth() / 3);

/**
 * Mean days from issue to payment, current quarter vs the one before it.
 *
 * Reads `paidAt` rather than the Payment rows: a part-paid invoice would
 * otherwise be counted at its first instalment and understate time-to-settle.
 */
export function computeCollectionSpeed(
  invoices: Invoice[],
  now = new Date(),
): CollectionSpeed {
  const paid = invoices.filter((i) => i.status === 'PAID' && i.paidAt && i.issueDate);

  const curQ = quarterOf(now);
  const curY = now.getFullYear();
  // Month arithmetic rolls the year back correctly when we're in Q1.
  const priorRef = new Date(curY, curQ * 3 - 3, 1);
  const priorQ = quarterOf(priorRef);
  const priorY = priorRef.getFullYear();

  const bucket = (y: number, q: number) =>
    paid.filter((i) => {
      const p = new Date(i.paidAt as string);
      return Number.isFinite(p.getTime()) && p.getFullYear() === y && quarterOf(p) === q;
    });

  const avg = (rows: Invoice[]): number | null => {
    const spans = rows
      .map((i) => daysBetween(new Date(i.paidAt as string), new Date(i.issueDate as string)))
      .filter((d): d is number => d !== null)
      // Paid-before-issued is bad data, not a negative collection time.
      .map((d) => Math.max(0, d));
    if (spans.length === 0) return null;
    return Math.round(spans.reduce((s, d) => s + d, 0) / spans.length);
  };

  const cur = bucket(curY, curQ);
  const prior = bucket(priorY, priorQ);
  const currentDays = avg(cur);
  const priorDays = avg(prior);

  return {
    currentDays,
    priorDays,
    sampleSize: cur.length,
    priorSampleSize: prior.length,
    improved:
      currentDays !== null && priorDays !== null ? currentDays < priorDays : null,
  };
}
