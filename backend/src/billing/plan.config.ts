import { Plan } from '@prisma/client';

/**
 * Single source of truth for what each plan includes.
 *
 * Limits live in code, not in DB columns, so changing a tier is a deploy rather
 * than a migration + backfill. Per-org overrides exist as nullable columns on
 * Organization for custom deals; NULL there means "inherit from here".
 */

export type QuotaKey = 'invoice_upload' | 'team_seat' | 'chatbot_credits';

/** `null` means unlimited. */
export interface PlanLimits {
  invoice_upload: number | null;
  team_seat: number | null;
  chatbot_credits: number | null;
  data_retention_days: number | null;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    invoice_upload: 6,
    team_seat: 1,
    // 50, not 500. Each Copilot question costs 1 credit, so 500 was effectively
    // unlimited for a free tier and gave no reason to upgrade.
    chatbot_credits: 50,
    data_retention_days: 90,
  },
  PREMIUM: {
    invoice_upload: null,
    team_seat: 5,
    chatbot_credits: 3000,
    data_retention_days: null,
  },
  ENTERPRISE: {
    invoice_upload: null,
    team_seat: null,
    chatbot_credits: null,
    data_retention_days: null,
  },
};

/** Boolean capability flags — rendered as a lock icon, unlike numeric quotas. */
export const FEATURES = {
  whatsapp_reminders: ['PREMIUM', 'ENTERPRISE'],
  sms_reminders: ['PREMIUM', 'ENTERPRISE'],
  scenario_simulator: ['PREMIUM', 'ENTERPRISE'],
  auto_escalation_ladder: ['PREMIUM', 'ENTERPRISE'],
  live_risk_scoring: ['PREMIUM', 'ENTERPRISE'], // FREE gets a weekly recalculation instead
  priority_support: ['PREMIUM', 'ENTERPRISE'],
} as const satisfies Record<string, readonly Plan[]>;

export type FeatureKey = keyof typeof FEATURES;

/** Maps an override column on Organization to its quota key. */
export const QUOTA_OVERRIDE_COLUMN: Record<QuotaKey, keyof OverrideCarrier> = {
  invoice_upload: 'invoiceUploadLimit',
  team_seat: 'teamSeatLimit',
  chatbot_credits: 'chatbotCreditLimit',
};

export interface OverrideCarrier {
  invoiceUploadLimit: number | null;
  teamSeatLimit: number | null;
  chatbotCreditLimit: number | null;
  dataRetentionDays: number | null;
}
