import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A verified JWT proves *which* org you belong to. It does not prove that the
 * resource id in the URL belongs to that org — without these checks, any
 * authenticated user could read another tenant's invoice by guessing its id.
 *
 * Every route that accepts a resource id instead of an orgId must call one of these.
 */
@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async assertInvoice(invoiceId: string, orgId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { organizationId: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    this.assertSameOrg(invoice.organizationId, orgId, 'invoice');
  }

  async assertClient(clientId: string, orgId: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { organizationId: true },
    });
    if (!client) throw new NotFoundException('Client not found.');
    this.assertSameOrg(client.organizationId, orgId, 'client');
  }

  async assertReminder(reminderId: string, orgId: string): Promise<void> {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
      select: { invoice: { select: { organizationId: true } } },
    });
    if (!reminder) throw new NotFoundException('Reminder not found.');
    this.assertSameOrg(reminder.invoice.organizationId, orgId, 'reminder');
  }

  /**
   * Guards routes that still take an :orgId in the path — the value must match
   * the token. Prefer dropping the param entirely and reading @CurrentUser('orgId').
   */
  assertOrg(pathOrgId: string, tokenOrgId: string): void {
    this.assertSameOrg(pathOrgId, tokenOrgId, 'organization');
  }

  private assertSameOrg(resourceOrgId: string, orgId: string, label: string): void {
    if (resourceOrgId !== orgId) {
      // Deliberately vague: don't confirm the resource exists in another tenant.
      throw new ForbiddenException(`You do not have access to this ${label}.`);
    }
  }
}
