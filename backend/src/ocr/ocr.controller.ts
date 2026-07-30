import { Controller, Post, Body } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { PlanService } from '../billing/plan.service';
import { PlanLimitException } from '../billing/plan-limit.exception';

@Controller('ocr')
export class OcrController {
  constructor(
    private readonly ocrService: OcrService,
    private readonly plans: PlanService,
  ) {}

  @Post('upload')
  async uploadInvoice(
    @CurrentUser('orgId') orgId: string,
    @Body() body: { base64Data: string; fileName: string },
  ) {
    const quota = await this.plans.remainingQuota(orgId, 'invoice_upload');

    if (!quota.unlimited && quota.remaining !== null && quota.remaining <= 0) {
      throw new PlanLimitException(
        'invoice_limit',
        `You've used ${quota.used}/${quota.limit} invoice uploads this month.`,
        { quota: { used: quota.used, limit: quota.limit, remaining: quota.remaining } },
      );
    }

    const result = await this.ocrService.extractInvoiceFromDocument(
      body.base64Data,
      body.fileName,
      orgId,
    );

    // Only bill the upload once extraction actually succeeded.
    await this.plans.incrementInvoiceUploads(orgId);

    const after = await this.plans.remainingQuota(orgId, 'invoice_upload');
    return { ...result, quota: { used: after.used, limit: after.limit, remaining: after.remaining } };
  }
}
