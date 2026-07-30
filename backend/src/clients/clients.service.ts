import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { RiskEngineService } from '../risk-engine/risk-engine.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly riskEngine: RiskEngineService,
  ) {}

  async createClient(orgId: string, data: {
    name: string;
    email: string;
    phone?: string;
    companyName?: string;
    industry?: string;
    creditLimit?: number;
    outstandingBalance?: number;
  }) {
    const client = await this.prisma.client.create({
      data: {
        organizationId: orgId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName,
        industry: data.industry ?? null,
        creditLimit: data.creditLimit ?? null,
        outstandingBalance: data.outstandingBalance ?? 0.0,
      },
    });

    // Seed a profile that is explicitly EMPTY rather than flattering. The old
    // version wrote paymentReliability: 100 and creditScoreConfidence: 0.9 for
    // a client with zero payment history - a perfect record, claimed with 90%
    // confidence, on no evidence at all.
    await this.prisma.clientRiskProfile.create({
      data: {
        clientId: client.id,
        riskScore: 0,
        riskLevel: 'UNKNOWN',
        outstandingDebt: data.outstandingBalance ?? 0.0,
        averageDelayDays: 0,
        paymentReliability: 0,
        paidInvoiceCount: 0,
        hasSufficientHistory: false,
        revenueContribution: 0,
        creditworthinessLimit: data.creditLimit ?? 0.0,
        creditScoreConfidence: 0.0,
      },
    });

    await this.activity.record(orgId, 'CLIENT_ADDED', 'System', {
      clientId: client.id,
      clientName: client.name,
      companyName: client.companyName ?? null,
    });

    // A new client changes every other client's revenue-contribution share,
    // so the whole portfolio is rescored - not just this row.
    await this.recalculateOrg(orgId);

    return this.prisma.client.findUnique({
      where: { id: client.id },
      include: { riskProfile: true },
    });
  }

  /**
   * Archive (soft delete). Historical invoices, payments and activity rows keep
   * referencing this client, so a hard delete would either orphan them or
   * cascade them out of existence - destroying the audit trail the Overview
   * feed and every aging report are built on.
   */
  async archiveClient(orgId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
    });
    if (!client) throw new NotFoundException('Client not found');
    if (client.archivedAt) return client;

    const archived = await this.prisma.client.update({
      where: { id: clientId },
      data: { archivedAt: new Date() },
    });

    await this.activity.record(orgId, 'CLIENT_REMOVED', 'System', {
      clientId: archived.id,
      clientName: archived.name,
      outstandingAtArchive: Number(archived.outstandingBalance),
    });

    await this.recalculateOrg(orgId);
    return archived;
  }

  /** Undo an archive. */
  async restoreClient(orgId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
    });
    if (!client) throw new NotFoundException('Client not found');

    const restored = await this.prisma.client.update({
      where: { id: clientId },
      data: { archivedAt: null },
    });
    await this.recalculateOrg(orgId);
    return restored;
  }

  /**
   * Rescores every active client in the org.
   *
   * Contribution % is relative to org-wide invoiced revenue, so adding or
   * archiving one client shifts everyone else's number. Recomputing only the
   * changed row would leave the rest of the scoreboard quietly stale.
   */
  async recalculateOrg(orgId: string) {
    const clients = await this.prisma.client.findMany({
      where: { organizationId: orgId, archivedAt: null },
      select: { id: true },
    });

    for (const c of clients) {
      // One bad client must not abort the sweep for the others.
      await this.riskEngine.calculateClientHealthScore(c.id).catch(() => undefined);
    }
    return { rescored: clients.length };
  }

  async getClients(orgId: string, includeArchived = false) {
    const clients = await this.prisma.client.findMany({
      where: {
        organizationId: orgId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      include: { riskProfile: true },
      orderBy: { name: 'asc' },
    });
    return clients.map((c) => this.withHonestReliability(c));
  }

  /**
   * The stored paymentReliability starts at 100 and only moves once invoices
   * are paid, so a client with no history sits at a flattering 100 in the DB.
   * Blank it at the API boundary rather than relying on every consumer to
   * check hasSufficientHistory first - one forgetful caller and a fabricated
   * score is on screen.
   */
  private withHonestReliability<T extends { riskProfile: any }>(client: T): T {
    if (client.riskProfile && !client.riskProfile.hasSufficientHistory) {
      return {
        ...client,
        riskProfile: { ...client.riskProfile, paymentReliability: null, creditScoreConfidence: 0 },
      };
    }
    return client;
  }

  async getClient(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { riskProfile: true, invoices: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return this.withHonestReliability(client as any);
  }
}
