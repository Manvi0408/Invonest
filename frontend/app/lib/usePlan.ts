'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, getToken } from './api';

export type FeatureKey =
  | 'whatsapp_reminders'
  | 'sms_reminders'
  | 'scenario_simulator'
  | 'auto_escalation_ladder'
  | 'live_risk_scoring'
  | 'priority_support';

export interface Quota {
  used: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
  topupBalance?: number;
}

export interface PlanState {
  plan: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  planStatus: string | null;
  quotaResetAt: string;
  dataRetentionDays: number | null;
  features: Record<FeatureKey, boolean>;
  quotas: {
    invoice_upload: Quota;
    team_seat: Quota;
    chatbot_credits: Quota;
  };
}

/**
 * Single source of plan truth for the UI: feature flags drive lock icons,
 * quotas drive progress bars.
 */
export function usePlan() {
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * Set when the lookup fails. Previously the catch was silent, so a dead backend
   * made every plan-driven widget vanish with no explanation — indistinguishable
   * from "not built yet". Callers can now render an explicit unavailable state.
   */
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setPlan(await api.get<PlanState>('/api/billing/plan'));
    } catch (err) {
      // Still never blocks the dashboard — it just stops failing invisibly.
      setError((err as any)?.message || 'Could not load plan details.');
      console.error('usePlan: /api/billing/plan failed —', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasFeature = useCallback(
    (key: FeatureKey) => plan?.features?.[key] ?? false,
    [plan],
  );

  return { plan, loading, error, hasFeature, refresh, isFree: plan?.plan === 'FREE' };
}
