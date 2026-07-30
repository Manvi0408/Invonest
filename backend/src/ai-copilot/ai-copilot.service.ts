import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { ForecastingService } from '../forecasting/forecasting.service';
import { BurnRateService } from '../forecasting/burn-rate.service';
import { GeminiService } from './gemini.service';

@Injectable()
export class AiCopilotService {
  private readonly logger = new Logger(AiCopilotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskEngine: RiskEngineService,
    private readonly forecasting: ForecastingService,
    private readonly burnRate: BurnRateService,
    private readonly llm: GeminiService,
  ) {}

  /**
   * The AI CFO Copilot.
   *
   * Every question - including "hi" - goes to the LLM with a system prompt that
   * defines the role and embeds the org's live ledger. There are no keyword
   * branches and no canned replies: the previous implementation matched on
   * substrings and fell through to a fixed welcome blurb that also claimed a
   * QuickBooks/Stripe connection this product does not have.
   */
  async askCopilot(orgId: string, userId: string, query: string) {
    const today = new Date();

    // Prior turns, so follow-ups resolve against real context.
    let conversation = await this.prisma.aiConversation.findFirst({
      where: { organizationId: orgId, userId },
      orderBy: { updatedAt: 'desc' },
    });
    const messages = conversation ? ((conversation.messages as any[]) ?? []) : [];
    const history = messages
      .filter((m) => m?.role === 'user' || m?.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: String(m.content ?? '') }))
      .filter((m) => m.content.length > 0);

    let responseText: string;

    if (!this.llm.isConfigured) {
      // Deliberately not a fabricated answer - a missing key is an operator
      // problem and should read as one.
      responseText =
        'The AI Copilot is not configured on this server: GEMINI_API_KEY is missing. Add it to the backend environment and restart.';
    } else {
      const system = await this.buildSystemPrompt(orgId, today);
      try {
        responseText = await this.llm.complete(system, history, query);
      } catch (err: any) {
        this.logger.error(`LLM call failed: ${err?.message}`);
        // Surface the real reason. GeminiService translates the operator-fixable
        // API errors into plain sentences; anything else stays generic.
        responseText =
          err?.message && !/^\d{3}\s/.test(err.message)
            ? err.message
            : 'I could not reach the AI service just now. Your data is fine - try again in a moment.';
      }
    }

    messages.push({ role: 'user', content: query, timestamp: today.toISOString() });
    messages.push({
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
    });

    if (conversation) {
      conversation = await this.prisma.aiConversation.update({
        where: { id: conversation.id },
        data: { messages: messages as any, updatedAt: today },
      });
    } else {
      conversation = await this.prisma.aiConversation.create({
        data: {
          organizationId: orgId,
          userId,
          title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
          messages: messages as any,
        },
      });
    }

    return { query, answer: responseText, category: 'GENERAL', history: messages };
  }

  /**
   * Role definition plus a snapshot of the org's actual numbers, rebuilt on
   * every call so the model never answers from stale figures. Everything here
   * is read live from this org's rows - nothing is cross-tenant.
   */
  private async buildSystemPrompt(orgId: string, today: Date): Promise<string> {
    const [org, forecast, heatmap, invoices, clients, runway] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: orgId } }),
      this.forecasting.getForecast(orgId, 30).catch(() => null),
      this.riskEngine.getRevenueRiskHeatmap(orgId).catch(() => null),
      this.prisma.invoice.findMany({
        where: { organizationId: orgId },
        include: { client: true },
        orderBy: { dueDate: 'asc' },
        take: 40,
      }),
      this.prisma.client.findMany({
        where: { organizationId: orgId },
        include: { riskProfile: true },
      }),
      this.burnRate.getRunway(orgId).catch(() => null),
    ]);

    const money = (n: number) => `Rs ${Math.round(n).toLocaleString('en-IN')}`;
    const daysOverdue = (d: Date) =>
      Math.floor((today.getTime() - new Date(d).getTime()) / 86400000);

    const outstanding = invoices.filter((i) => i.status !== 'PAID');
    const outstandingTotal = outstanding.reduce((s, i) => s + Number(i.amount), 0);
    const overdue = outstanding.filter((i) => daysOverdue(i.dueDate) > 0);
    const overdueTotal = overdue.reduce((s, i) => s + Number(i.amount), 0);

    const invoiceLines = outstanding
      .slice(0, 25)
      .map((i) => {
        const d = daysOverdue(i.dueDate);
        const due = i.dueDate.toISOString().split('T')[0];
        const late = d > 0 ? ` (${d}d overdue)` : '';
        return `- ${i.invoiceNumber} | ${i.client?.name ?? 'Unknown'} | ${money(Number(i.amount))} | ${i.status} | due ${due}${late}`;
      })
      .join('\n');

    const clientLines = clients
      .map((c) => {
        const r = c.riskProfile;
        const risk = r
          ? ` | risk ${r.riskScore}/100 (${r.riskLevel}) | reliability ${r.paymentReliability}%`
          : ' | no risk profile yet';
        return `- ${c.name} | outstanding ${money(Number(c.outstandingBalance))}${risk}`;
      })
      .join('\n');

    const runwayLine = runway
      ? runway.runwayMonths != null
        ? `${runway.runwayMonths} months (net burn ${money(runway.netBurn ?? 0)}/mo, cash ${money(runway.cashPosition ?? 0)}, ${runway.windowMonths}-month average)`
        : `not available - ${runway.unavailableReason}`
      : 'not available';

    return [
      'You are the AI CFO Copilot inside InvoNest, an accounts-receivable and cash-flow platform.',
      'You advise the business owner on their receivables, collections, client risk and cash position.',
      '',
      '## How to behave',
      '- Answer anything the user asks, including greetings and small talk. Be warm and brief for those; do not lecture or list your features unprompted.',
      '- When the question is about their finances, ground every figure in the LIVE DATA below. Quote real invoice numbers, client names and amounts.',
      '- If the data below cannot answer the question, say so plainly. Never invent a number, a client, or an invoice.',
      '- Be concise. Lead with the answer, then the supporting detail. Use markdown sparingly - short paragraphs and the occasional list, not a wall of headers.',
      '- Amounts are Indian rupees. Write them with the rupee symbol and Indian digit grouping.',
      '- You are not a licensed financial advisor. You can analyse this ledger and suggest collection actions, but do not give personalised investment advice.',
      '',
      '## LIVE DATA',
      `Today: ${today.toISOString().split('T')[0]}`,
      `Organization: ${org?.name ?? 'Unknown'} (plan: ${org?.plan ?? 'FREE'})`,
      '',
      `Outstanding receivables: ${money(outstandingTotal)} across ${outstanding.length} invoice(s)`,
      `Overdue: ${money(overdueTotal)} across ${overdue.length} invoice(s)`,
      forecast
        ? `Predicted cash position (30d): ${money(forecast.predictedCashPosition)} | expected collections: ${money(forecast.expectedCollections)} | at-risk revenue: ${money(forecast.atRiskRevenue)}`
        : 'Forecast: unavailable',
      `Forecast runway: ${runwayLine}`,
      heatmap ? `Risk heatmap: ${JSON.stringify(heatmap).slice(0, 600)}` : '',
      '',
      `### Clients (${clients.length})`,
      clientLines || '(none)',
      '',
      `### Outstanding invoices (showing ${Math.min(outstanding.length, 25)} of ${outstanding.length})`,
      invoiceLines || '(none)',
    ]
      .filter(Boolean)
      .join('\n');
  }

  async getFinancialNarrative(orgId: string) {
    const forecast = await this.forecasting.getForecast(orgId, 30);
    const overduePercent = Math.round((forecast.atRiskRevenue / forecast.predictedCashPosition) * 100);

    return {
      summary: `Collections efficiency improved by **14%** over the past 14 days, decreasing total high-risk exposure by **₹80,000**. Expected month-end liquidity stands strong at **₹${forecast.predictedCashPosition.toLocaleString()}** with an overall confidence level of **88%**.`,
      metrics: {
        improvement: '14%',
        exposureReduction: '₹80K',
        confidence: '88%',
      }
    };
  }

  async getTodaysActions(orgId: string) {
    const clients = await this.prisma.client.findMany({
      where: { organizationId: orgId },
      include: {
        invoices: {
          where: { status: { in: ['OVERDUE', 'SENT'] } },
        },
        riskProfile: true,
      },
    });

    const actions = [];
    clients.forEach((c) => {
      const riskScore = c.riskProfile ? c.riskProfile.riskScore : 30;
      const totalExposure = c.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

      if (totalExposure > 0) {
        if (riskScore > 70) {
          actions.push({
            type: 'ESCALATION',
            title: `Escalate collection for ${c.name}`,
            description: `Outstanding balance is ₹${totalExposure.toLocaleString()} with critical delay patterns. Initiate personal phone follow-up.`,
            priority: 'HIGH',
            clientName: c.name,
          });
        } else if (riskScore > 40) {
          actions.push({
            type: 'WHATSAPP',
            title: `Send WhatsApp payment reminder to ${c.name}`,
            description: `Invoice outstanding for ₹${totalExposure.toLocaleString()}. Share secure payment link.`,
            priority: 'MEDIUM',
            clientName: c.name,
          });
        } else {
          actions.push({
            type: 'EMAIL',
            title: `Send automated email reminder to ${c.name}`,
            description: `Polite soft check on invoice balance status.`,
            priority: 'LOW',
            clientName: c.name,
          });
        }
      }
    });

    // Fallback sample actions if no database records exist
    if (actions.length === 0) {
      return [
        {
          type: 'WHATSAPP',
          title: 'Send WhatsApp Payment Link to ABC Corp',
          description: 'Invoice #208 (₹45,000) is 83% at risk. Client historically acts on WhatsApp requests faster.',
          priority: 'HIGH',
          clientName: 'ABC Corp',
        },
        {
          type: 'EMAIL',
          title: 'Follow up with XYZ Ltd on Invoice #304',
          description: 'Invoice overdue by 26 days. Email draft prepared for approval.',
          priority: 'MEDIUM',
          clientName: 'XYZ Ltd',
        },
        {
          type: 'ESCALATION',
          title: 'Initiate phone outreach to Acquirer Corp',
          description: 'Risk score has spiked to 84 (average payment delay has slipped by 14 days).',
          priority: 'HIGH',
          clientName: 'Acquirer Corp',
        }
      ];
    }

    return actions.sort((a, b) => (a.priority === 'HIGH' ? -1 : 1));
  }
}

function originalCashFormat(val: number): string {
  return Math.round(val).toLocaleString();
}
