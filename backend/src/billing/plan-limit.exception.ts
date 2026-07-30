import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Triggers map 1:1 to <UpgradePrompt trigger="..." /> on the frontend, so a 402
 * always tells the UI exactly which contextual prompt to render rather than
 * dumping the user into a generic upgrade wall.
 */
export type UpgradeTrigger =
  | 'credits_exhausted'
  | 'invoice_limit'
  | 'whatsapp_locked'
  | 'sms_locked'
  | 'scenario_simulator_locked'
  | 'seat_limit';

export interface PlanLimitPayload {
  statusCode: number;
  error: 'Payment Required';
  message: string;
  trigger: UpgradeTrigger;
  quota?: { used: number; limit: number | null; remaining: number | null };
  /** ISO date the monthly allowances roll over. */
  resetAt?: string;
  upgradeUrl: string;
}

export class PlanLimitException extends HttpException {
  constructor(
    trigger: UpgradeTrigger,
    message: string,
    extra?: { quota?: PlanLimitPayload['quota']; resetAt?: Date },
  ) {
    const payload: PlanLimitPayload = {
      statusCode: HttpStatus.PAYMENT_REQUIRED,
      error: 'Payment Required',
      message,
      trigger,
      ...(extra?.quota ? { quota: extra.quota } : {}),
      ...(extra?.resetAt ? { resetAt: extra.resetAt.toISOString() } : {}),
      upgradeUrl: `/pricing?highlight=growth&reason=${trigger}`,
    };
    super(payload, HttpStatus.PAYMENT_REQUIRED);
  }
}
