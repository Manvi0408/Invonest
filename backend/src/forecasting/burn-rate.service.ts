import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TransactionDirection, CashAccountType } from '@prisma/client';

/**
 * Burn rate and runway.
 *
 * Deliberately server-side and single-sourced: the dashboard card and the
 * Scenario Simulator both consume this, so there is no second copy to drift.
 *
 * Every unavailable case returns `runwayMonths: null` with a machine-readable
 * `unavailableReason` rather than a number. A wrong runway is worse than no
 * runway, so nothing here guesses.
 *
 * See docs/specs/transaction-expense-model.md
 */

/** Trailing complete calendar months averaged into the burn rate. */
export const BURN_WINDOW_MONTHS = 3;

/** Below this, the sample is noise and no figure is reported. */
export const MIN_HISTORY_MONTHS = 2;

export type RunwayUnavailableReason =
  | 'NO_CASH_ACCOUNTS'
  | 'NO_TRANSACTIONS'
  | 'INSUFFICIENT_HISTORY'
  | 'CASH_FLOW_POSITIVE'
  | 'MIXED_CURRENCY';

export interface RunwayResult {
  runwayMonths: number | null;
  cashPosition: number | null;
  netBurn: number | null;
  grossBurn: number | null;
  operatingInflow: number | null;
  windowMonths: number;
  currency: string;
  unavailableReason: RunwayUnavailableReason | null;
}

const dec = (d: Prisma.Decimal | null | undefined): number =>
  d ? Number(d.toString()) : 0;

@Injectable()
export class BurnRateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * First day of the month `n` months before the month containing `ref`.
   * Day-1 anchoring keeps this correct across month lengths and year rollover.
   */
  private monthStart(ref: Date, monthsBack = 0): Date {
    return new Date(ref.getFullYear(), ref.getMonth() - monthsBack, 1);
  }

  async getRunway(orgId: string, now = new Date()): Promise<RunwayResult> {
    // The current month is excluded throughout: a month that is three days old
    // would make burn look ~90% lower than it is.
    const windowEnd = this.monthStart(now);
    const windowStart = this.monthStart(now, BURN_WINDOW_MONTHS);

    const [accounts, windowTx, earliestTx] = await Promise.all([
      this.prisma.cashAccount.findMany({
        where: { organizationId: orgId, isActive: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          organizationId: orgId,
          excludedFromBurn: false,
          occurredAt: { gte: windowStart, lt: windowEnd },
        },
      }),
      this.prisma.transaction.findFirst({
        where: { organizationId: orgId },
        orderBy: { occurredAt: 'asc' },
      }),
    ]);

    // Borrowing capacity is not cash.
    const cashAccounts = accounts.filter(
      (a) => a.accountType !== CashAccountType.CREDIT_LINE,
    );

    const base: RunwayResult = {
      runwayMonths: null,
      cashPosition: null,
      netBurn: null,
      grossBurn: null,
      operatingInflow: null,
      windowMonths: BURN_WINDOW_MONTHS,
      currency: cashAccounts[0]?.currency ?? 'INR',
      unavailableReason: null,
    };

    if (cashAccounts.length === 0) {
      return { ...base, unavailableReason: 'NO_CASH_ACCOUNTS' };
    }

    // v1 refuses to sum across currencies rather than silently adding rupees to
    // dollars. FX conversion is out of scope.
    const currencies = new Set<string>([
      ...cashAccounts.map((a) => a.currency),
      ...windowTx.map((t) => t.currency),
    ]);
    if (currencies.size > 1) {
      return { ...base, unavailableReason: 'MIXED_CURRENCY' };
    }

    if (!earliestTx) {
      return { ...base, unavailableReason: 'NO_TRANSACTIONS' };
    }

    // Complete months of history actually available, capped at the window.
    const monthsOfHistory = Math.min(
      BURN_WINDOW_MONTHS,
      Math.max(
        0,
        (windowEnd.getFullYear() - earliestTx.occurredAt.getFullYear()) * 12 +
          (windowEnd.getMonth() - earliestTx.occurredAt.getMonth()),
      ),
    );
    if (monthsOfHistory < MIN_HISTORY_MONTHS) {
      return { ...base, unavailableReason: 'INSUFFICIENT_HISTORY' };
    }

    const sum = (dir: TransactionDirection) =>
      windowTx
        .filter((t) => t.direction === dir)
        .reduce((s, t) => s + dec(t.amount), 0);

    const grossBurn = sum(TransactionDirection.OUTFLOW) / monthsOfHistory;
    const operatingInflow = sum(TransactionDirection.INFLOW) / monthsOfHistory;
    const netBurn = grossBurn - operatingInflow;

    // Roll each account's stated balance forward over anything that happened
    // after it was observed, so a stale balance doesn't understate cash.
    const laterTx = await this.prisma.transaction.findMany({
      where: {
        organizationId: orgId,
        occurredAt: { gt: new Date(Math.min(...cashAccounts.map((a) => a.balanceAsOf.getTime()))) },
      },
    });
    const cashPosition = cashAccounts.reduce((total, acct) => {
      const delta = laterTx
        .filter((t) => t.occurredAt > acct.balanceAsOf)
        .reduce(
          (s, t) => s + (t.direction === TransactionDirection.INFLOW ? dec(t.amount) : -dec(t.amount)),
          0,
        );
      // Only the first account absorbs the deltas; transactions aren't tied to
      // a specific account yet, so applying them per-account would multiply them.
      return total + dec(acct.currentBalance) + (acct.id === cashAccounts[0].id ? delta : 0);
    }, 0);

    const rounded = {
      ...base,
      cashPosition: Math.round(cashPosition),
      grossBurn: Math.round(grossBurn),
      operatingInflow: Math.round(operatingInflow),
      netBurn: Math.round(netBurn),
      windowMonths: monthsOfHistory,
    };

    // A cash-flow-positive org has no runway *problem*. Reporting Infinity, or
    // a negative month count, would both be nonsense.
    if (netBurn <= 0) {
      return { ...rounded, runwayMonths: null, unavailableReason: 'CASH_FLOW_POSITIVE' };
    }

    return {
      ...rounded,
      runwayMonths: Math.round((cashPosition / netBurn) * 10) / 10,
      unavailableReason: null,
    };
  }
}
