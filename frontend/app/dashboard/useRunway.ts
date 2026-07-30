'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

/**
 * Mirrors RunwayResult in backend/src/forecasting/burn-rate.service.ts.
 *
 * `runwayMonths` is null whenever the backend refuses to guess; the reason
 * comes back machine-readable so the UI can say something specific instead of
 * a generic "unavailable".
 */
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

/** Copy for each reason the backend can decline to produce a number. */
export const RUNWAY_REASON_COPY: Record<RunwayUnavailableReason, string> = {
  NO_CASH_ACCOUNTS: 'Connect expense data to calculate runway',
  NO_TRANSACTIONS: 'Add expenses to calculate runway',
  INSUFFICIENT_HISTORY: 'Not enough data yet — needs 2 complete months',
  CASH_FLOW_POSITIVE: 'Cash-flow positive — no burn to run down',
  MIXED_CURRENCY: 'Multiple currencies — not yet supported',
};

export function useRunway() {
  const [runway, setRunway] = useState<RunwayResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<RunwayResult>('/api/forecasting/runway');
      setRunway(data);
    } catch (err: any) {
      // Surfaced on the card rather than swallowed — a silently empty metric is
      // indistinguishable from a broken one.
      setError(err?.message || 'Could not load runway.');
      console.error('useRunway: /api/forecasting/runway failed —', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { runway, loading, error, refresh };
}
