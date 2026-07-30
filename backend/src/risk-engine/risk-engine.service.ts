import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RiskEngineService {
  /**
   * Paid invoices required before a reliability score is reported at all.
   * Below this, one unusually early or late payment swings the number to an
   * extreme, so it is withheld rather than shown.
   */
  static readonly MIN_PAID_INVOICES_FOR_RELIABILITY = 3;

  constructor(private readonly prisma: PrismaService) {}

  async calculateClientHealthScore(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { invoices: { include: { payments: true } } },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const invoices = client.invoices;
    const paidInvoices = invoices.filter((inv) => inv.status === 'PAID');
    const overdueInvoices = invoices.filter((inv) => inv.status === 'OVERDUE');

    // 1. Payment Reliability Score.
    //
    // A brand-new client used to score a perfect 100 here purely because the
    // `if` below never ran - a confident-looking number backed by no evidence.
    // Below MIN_PAID_INVOICES_FOR_RELIABILITY the score is not trustworthy, so
    // `hasSufficientHistory` is false and callers render "Insufficient history"
    // instead of the placeholder value.
    const hasSufficientHistory =
      paidInvoices.length >= RiskEngineService.MIN_PAID_INVOICES_FOR_RELIABILITY;

    let paymentReliability = 100;
    if (paidInvoices.length > 0) {
      let totalDelayDays = 0;
      paidInvoices.forEach((inv) => {
        if (inv.paidAt && inv.dueDate) {
          const delay = Math.max(
            0,
            (inv.paidAt.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          totalDelayDays += delay;
        }
      });
      const avgDelay = totalDelayDays / paidInvoices.length;
      paymentReliability = Math.max(10, Math.round(100 - avgDelay * 2.5));
    }

    // 2. Revenue Contribution (Relative to organization totals)
    let revenueContribution = 10;
    const orgTotalInvoiced = await this.prisma.invoice.aggregate({
      where: { organizationId: client.organizationId },
      _sum: { amount: true },
    });
    const clientTotalInvoiced = invoices.reduce(
      (acc, inv) => acc + Number(inv.amount),
      0,
    );

    if (orgTotalInvoiced._sum.amount && Number(orgTotalInvoiced._sum.amount) > 0) {
      // True share of invoiced revenue. This was previously multiplied by 5,
      // so any client above 20% of revenue pegged at 100 - a display scaling
      // factor being fed into a weighted average as if it were a percentage.
      const percentage = (clientTotalInvoiced / Number(orgTotalInvoiced._sum.amount)) * 100;
      revenueContribution = Math.min(100, Math.round(percentage));
    }

    // 3. Outstanding Debt Index (100 is excellent/none, penalize high balances)
    const outstandingDebtVal = Number(client.outstandingBalance);
    let outstandingDebtScore = 100;
    if (outstandingDebtVal > 0) {
      const avgInvoiceSize =
        invoices.length > 0
          ? clientTotalInvoiced / invoices.length
          : 50000;
      const ratio = outstandingDebtVal / avgInvoiceSize;
      outstandingDebtScore = Math.max(0, Math.round(100 - ratio * 15));
    }

    // Calculate Combined Health Score (Weighted)
    // 50% reliability, 30% debt management, 20% revenue contribution
    //
    // NOTE: revenueContribution is a POSITIVE input here, so a client who is a
    // large share of revenue scores healthier for being large. For credit risk
    // that is arguably backwards - concentration is exposure, not virtue.
    // Left as-is deliberately: inverting it would move every existing score,
    // and that is a modelling decision to make on purpose, not in passing.
    const healthScore = Math.round(
      paymentReliability * 0.5 +
        outstandingDebtScore * 0.3 +
        revenueContribution * 0.2,
    );

    // Categories: Healthy, Monitor, Risky, Critical
    let riskLevel = 'HEALTHY';
    if (healthScore < 50) {
      riskLevel = 'CRITICAL';
    } else if (healthScore < 70) {
      riskLevel = 'RISKY';
    } else if (healthScore < 85) {
      riskLevel = 'MONITOR';
    }

    const averageDelayDays = paidInvoices.length > 0
      ? paidInvoices.reduce((acc, inv) => {
          if (inv.paidAt && inv.dueDate) {
            return acc + Math.max(0, (inv.paidAt.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
          }
          return acc;
        }, 0) / paidInvoices.length
      : 0;

    // AI Creditworthiness Calculation
    // Base limit is 3x avg invoice amount modified by reliability
    const avgInvoiceAmount = invoices.length > 0 ? clientTotalInvoiced / invoices.length : 100000;
    const creditworthinessLimit = Math.max(
      50000,
      Math.round(avgInvoiceAmount * 3 * (paymentReliability / 100)),
    );
    const creditScoreConfidence = Math.min(
      0.98,
      Number((0.7 + (paidInvoices.length / 50) * 0.28).toFixed(2)),
    );

    const updateProfile = await this.prisma.clientRiskProfile.upsert({
      where: { clientId: client.id },
      update: {
        riskScore: 100 - healthScore,
        riskLevel,
        averageDelayDays,
        outstandingDebt: outstandingDebtVal,
        paymentReliability,
        paidInvoiceCount: paidInvoices.length,
        hasSufficientHistory,
        revenueContribution,
        creditworthinessLimit,
        creditScoreConfidence,
        lastAssessmentAt: new Date(),
      },
      create: {
        clientId: client.id,
        riskScore: 100 - healthScore,
        riskLevel,
        averageDelayDays,
        outstandingDebt: outstandingDebtVal,
        paymentReliability,
        paidInvoiceCount: paidInvoices.length,
        hasSufficientHistory,
        revenueContribution,
        creditworthinessLimit,
        creditScoreConfidence,
        lastAssessmentAt: new Date(),
      },
    });

    return {
      clientId: client.id,
      clientName: client.name,
      healthScore,
      riskLevel,
      // null, not a placeholder - the caller must decide how to render "unknown"
      // rather than being handed a number that looks earned.
      paymentReliability: hasSufficientHistory ? paymentReliability : null,
      hasSufficientHistory,
      paidInvoiceCount: paidInvoices.length,
      revenueContribution,
      outstandingDebtScore,
      averageDelayDays,
      creditLimit: creditworthinessLimit,
      creditConfidence: creditScoreConfidence,
    };
  }

  async predictInvoiceRisk(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          include: { riskProfile: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const clientRisk = invoice.client.riskProfile;
    const clientRiskScore = clientRisk ? clientRisk.riskScore : 30; // Default medium risk
    const daysLateAvg = clientRisk ? clientRisk.averageDelayDays : 5;

    // Assess variables
    const amountVal = Number(invoice.amount);
    let amountRiskPenalty = 0;
    if (amountVal > 500000) {
      amountRiskPenalty = 15;
    } else if (amountVal > 100000) {
      amountRiskPenalty = 8;
    }

    // Days outstanding details
    const today = new Date();
    const isOverdue = today > invoice.dueDate && invoice.status !== 'PAID';
    const daysOutstanding = isOverdue
      ? Math.round((today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const overduePenalty = daysOutstanding > 0 ? Math.min(40, daysOutstanding * 2.5) : 0;

    // Final invoice risk calculation
    const riskScore = Math.min(
      100,
      Math.round(clientRiskScore * 0.5 + amountRiskPenalty + overduePenalty),
    );

    // Predict payment date based on average delays + risk score multipliers
    const finalBufferDays = Math.round(daysLateAvg + (riskScore / 10));
    const predictedPaymentDate = new Date(invoice.dueDate);
    predictedPaymentDate.setDate(predictedPaymentDate.getDate() + finalBufferDays);

    // Probability Curve points: 7 Days, 14 Days, 30 Days probability
    // Higher risk pushes the probability out
    const prob7 = Math.max(5, Math.round(Math.min(95, 100 - riskScore * 1.1)));
    const prob14 = Math.max(10, Math.round(Math.min(98, 100 - riskScore * 0.75)));
    const prob30 = Math.max(25, Math.round(Math.min(99, 100 - riskScore * 0.35)));

    const probabilityCurve = {
      day7: `${prob7}%`,
      day14: `${prob14}%`,
      day30: `${prob30}%`,
    };

    const factors = [
      `Client payment delay averages ${Math.round(daysLateAvg)} days.`,
      amountVal > 150000 ? `High-value transaction size increases processing cycles.` : `Standard ticket sizing.`,
      daysOutstanding > 0 ? `Invoice is already overdue by ${daysOutstanding} days.` : `Invoice is within terms.`,
      clientRisk && clientRisk.riskLevel === 'CRITICAL'
        ? `Client health is currently designated critical.`
        : `Client payment health profile is normal.`,
    ];

    const confidence = Number((0.85 + (riskScore > 70 || riskScore < 30 ? 0.1 : 0.0)).toFixed(2));

    const prediction = await this.prisma.riskPrediction.upsert({
      where: { invoiceId: invoice.id },
      update: {
        riskScore,
        predictedPaymentDate,
        probabilityCurve,
        factors: factors as any,
        confidence,
      },
      create: {
        invoiceId: invoice.id,
        riskScore,
        predictedPaymentDate,
        probabilityCurve,
        factors: factors as any,
        confidence,
      },
    });

    return prediction;
  }

  async getRevenueRiskHeatmap(orgId: string) {
    const clients = await this.prisma.client.findMany({
      where: { organizationId: orgId },
      include: {
        invoices: {
          where: { status: { not: 'PAID' } },
        },
        riskProfile: true,
      },
    });

    return clients.map((c) => {
      const openInvoicesAmount = c.invoices.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const riskLevel = c.riskProfile ? c.riskProfile.riskLevel : 'MONITOR';
      const riskScore = c.riskProfile ? c.riskProfile.riskScore : 40;

      return {
        clientId: c.id,
        name: c.name,
        company: c.companyName,
        exposure: openInvoicesAmount,
        riskScore,
        riskLevel,
      };
    });
  }
}
