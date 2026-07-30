import { PrismaClient, InvoiceStatus, Role, PaymentMethod, ReminderChannel, ReminderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding InvoNest Database with rich mock data...');

  // 1. Clean Database
  await prisma.aiConversation.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.riskPrediction.deleteMany({});
  await prisma.cashflowForecast.deleteMany({});
  await prisma.reminderLog.deleteMany({});
  await prisma.reminder.deleteMany({});
  await prisma.paymentLink.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.clientRiskProfile.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Default User & Organization
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Demo@123', salt);

  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@invonest.ai',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Jenkins',
    },
  });

  const demoOrg = await prisma.organization.create({
    data: {
      name: 'Global Fintech Solutions',
      slug: 'global-fintech',
    },
  });

  await prisma.membership.create({
    data: {
      userId: demoUser.id,
      organizationId: demoOrg.id,
      role: Role.ADMIN,
    },
  });

  // 3. Create Clients
  const clientABC = await prisma.client.create({
    data: {
      organizationId: demoOrg.id,
      name: 'ABC Corp',
      email: 'finance@abccorp.com',
      phone: '+919876543210',
      companyName: 'ABC Industrial Corp',
      outstandingBalance: 135000.0,
    },
  });

  const clientXYZ = await prisma.client.create({
    data: {
      organizationId: demoOrg.id,
      name: 'XYZ Ltd',
      email: 'ap@xyz.co.in',
      phone: '+919988776655',
      companyName: 'XYZ Technologies Ltd',
      outstandingBalance: 80000.0, // Only count unpaid
    },
  });

  const clientAcquirer = await prisma.client.create({
    data: {
      organizationId: demoOrg.id,
      name: 'Acquirer Corp',
      email: 'accounting@acquirer.com',
      phone: '+14155552671',
      companyName: 'Acquirer Holdings LLC',
      outstandingBalance: 520000.0,
    },
  });

  // 4. Create Client Risk Profiles
  await prisma.clientRiskProfile.create({
    data: {
      clientId: clientABC.id,
      riskScore: 83,
      riskLevel: 'CRITICAL',
      averageDelayDays: 23.4,
      historicalBehavior: 'Frequently delays settlements until secondary automated reminders trigger.',
      outstandingDebt: 135000.0,
      paymentReliability: 40,
      revenueContribution: 15,
      creditworthinessLimit: 100000.0,
      creditScoreConfidence: 0.88,
    },
  });

  await prisma.clientRiskProfile.create({
    data: {
      clientId: clientXYZ.id,
      riskScore: 26,
      riskLevel: 'MONITOR',
      averageDelayDays: 14.2,
      historicalBehavior: 'Generally settles within standard terms; slight delay on invoices exceeding ₹1L.',
      outstandingDebt: 80000.0,
      paymentReliability: 74,
      revenueContribution: 25,
      creditworthinessLimit: 300000.0,
      creditScoreConfidence: 0.91,
    },
  });

  await prisma.clientRiskProfile.create({
    data: {
      clientId: clientAcquirer.id,
      riskScore: 84,
      riskLevel: 'CRITICAL',
      averageDelayDays: 28.1,
      historicalBehavior: 'Lengthy internal accounts payable hierarchy requires active manual reminders.',
      outstandingDebt: 520000.0,
      paymentReliability: 35,
      revenueContribution: 60,
      creditworthinessLimit: 200000.0,
      creditScoreConfidence: 0.89,
    },
  });

  // 5. Create Invoices, Line Items, Comments, Timelines
  const today = new Date();
  
  const dateAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

  const dateAhead = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  // ABC Overdue Invoice
  const inv1 = await prisma.invoice.create({
    data: {
      organizationId: demoOrg.id,
      clientId: clientABC.id,
      invoiceNumber: 'INV-1001',
      amount: 45000.0,
      status: InvoiceStatus.OVERDUE,
      issueDate: dateAgo(45),
      dueDate: dateAgo(15),
      ocrConfidence: 0.98,
      comments: [
        { userId: 'system', userName: 'Automation Agent', text: 'Visual workflow sent automated email reminder.', date: dateAgo(14).toISOString() },
        { userId: demoUser.id, userName: 'Sarah (Finance)', text: 'Called ABC finance team. They stated processing checks on Friday.', date: dateAgo(3).toISOString() }
      ] as any,
      timeline: [
        { status: 'DRAFT', date: dateAgo(45).toISOString(), description: 'Invoice auto-parsed via OCR pipeline.' },
        { status: 'SENT', date: dateAgo(45).toISOString(), description: 'Emailed invoice PDF to billing@abccorp.com.' },
        { status: 'VIEWED', date: dateAgo(43).toISOString(), description: 'Invoice viewed by accounts payable recipient.' },
        { status: 'DUE', date: dateAgo(15).toISOString(), description: 'Invoice terms deadline reached.' },
        { status: 'REMINDER_SENT', date: dateAgo(14).toISOString(), description: 'Soft email reminder sent.' }
      ] as any,
      items: {
        create: [
          { description: 'Enterprise SEO Campaign Support', quantity: 1, unitPrice: 38135.59, amount: 38135.59 },
          { description: 'Tax Surcharge (18%)', quantity: 1, unitPrice: 6864.41, amount: 6864.41 }
        ]
      }
    }
  });

  // ABC Sent Invoice
  const inv2 = await prisma.invoice.create({
    data: {
      organizationId: demoOrg.id,
      clientId: clientABC.id,
      invoiceNumber: 'INV-1002',
      amount: 90000.0,
      status: InvoiceStatus.SENT,
      issueDate: dateAgo(5),
      dueDate: dateAhead(25),
      timeline: [
        { status: 'DRAFT', date: dateAgo(5).toISOString(), description: 'Created draft.' },
        { status: 'SENT', date: dateAgo(4).toISOString(), description: 'Invoice sent out.' }
      ] as any,
      items: {
        create: [
          { description: 'UX Design Wireframe Sprints', quantity: 2, unitPrice: 45000.0, amount: 90000.0 }
        ]
      }
    }
  });

  // XYZ Overdue Invoice
  const inv3 = await prisma.invoice.create({
    data: {
      organizationId: demoOrg.id,
      clientId: clientXYZ.id,
      invoiceNumber: 'INV-2001',
      amount: 80000.0,
      status: InvoiceStatus.OVERDUE,
      issueDate: dateAgo(56),
      dueDate: dateAgo(26),
      timeline: [
        { status: 'DRAFT', date: dateAgo(56).toISOString(), description: 'Created.' },
        { status: 'SENT', date: dateAgo(55).toISOString(), description: 'Dispatched invoice.' },
        { status: 'VIEWED', date: dateAgo(54).toISOString(), description: 'Customer opened payment gateway.' },
        { status: 'DUE', date: dateAgo(26).toISOString(), description: 'Due date passed.' }
      ] as any,
      items: {
        create: [
          { description: 'Backend NestJS Security Patching', quantity: 10, unitPrice: 8000.0, amount: 80000.0 }
        ]
      }
    }
  });

  // XYZ Paid Invoice
  const inv4 = await prisma.invoice.create({
    data: {
      organizationId: demoOrg.id,
      clientId: clientXYZ.id,
      invoiceNumber: 'INV-2002',
      amount: 160000.0,
      status: InvoiceStatus.PAID,
      issueDate: dateAgo(60),
      dueDate: dateAgo(30),
      paidAt: dateAgo(28),
      timeline: [
        { status: 'DRAFT', date: dateAgo(60).toISOString(), description: 'Created.' },
        { status: 'SENT', date: dateAgo(59).toISOString(), description: 'Sent out.' },
        { status: 'PAID', date: dateAgo(28).toISOString(), description: 'Paid in full via Stripe Card Checkout.' }
      ] as any,
      items: {
        create: [
          { description: 'Frontend React Architecture Audits', quantity: 1, unitPrice: 160000.0, amount: 160000.0 }
        ]
      }
    }
  });

  // Acquirer Sent Invoice
  const inv5 = await prisma.invoice.create({
    data: {
      organizationId: demoOrg.id,
      clientId: clientAcquirer.id,
      invoiceNumber: 'INV-3001',
      amount: 120000.0,
      status: InvoiceStatus.SENT,
      issueDate: dateAgo(1),
      dueDate: dateAhead(29),
      timeline: [
        { status: 'DRAFT', date: dateAgo(1).toISOString(), description: 'Created.' },
        { status: 'SENT', date: dateAgo(1).toISOString(), description: 'Emailed billing team.' }
      ] as any,
      items: {
        create: [
          { description: 'API Integration Consulting', quantity: 1, unitPrice: 120000.0, amount: 120000.0 }
        ]
      }
    }
  });

  // Acquirer Overdue Invoice
  const inv6 = await prisma.invoice.create({
    data: {
      organizationId: demoOrg.id,
      clientId: clientAcquirer.id,
      invoiceNumber: 'INV-3002',
      amount: 400000.0,
      status: InvoiceStatus.OVERDUE,
      issueDate: dateAgo(42),
      dueDate: dateAgo(12),
      comments: [
        { userId: 'system', userName: 'WhatsApp Agent', text: 'WhatsApp message sent with secure payment link.', date: dateAgo(11).toISOString() }
      ] as any,
      timeline: [
        { status: 'DRAFT', date: dateAgo(42).toISOString(), description: 'Created.' },
        { status: 'SENT', date: dateAgo(41).toISOString(), description: 'Dispatched to accounting.' },
        { status: 'DUE', date: dateAgo(12).toISOString(), description: 'Passed terms deadline.' },
        { status: 'REMINDER_SENT', date: dateAgo(11).toISOString(), description: 'Automated WhatsApp warning dispatched.' }
      ] as any,
      items: {
        create: [
          { description: 'Kubernetes Cluster Migrations (Production)', quantity: 1, unitPrice: 400000.0, amount: 400000.0 }
        ]
      }
    }
  });

  // 6. Create Risk Predictions & Curves
  await prisma.riskPrediction.create({
    data: {
      invoiceId: inv1.id,
      riskScore: 83,
      predictedPaymentDate: dateAhead(8),
      probabilityCurve: { day7: '35%', day14: '62%', day30: '84%' },
      factors: [
        'Client average settlement delays is 23.4 days.',
        'Recipient has 2 other overdue invoices currently active.'
      ] as any,
      confidence: 0.89,
    }
  });

  await prisma.riskPrediction.create({
    data: {
      invoiceId: inv3.id,
      riskScore: 26,
      predictedPaymentDate: dateAhead(4),
      probabilityCurve: { day7: '70%', day14: '88%', day30: '96%' },
      factors: [
        'Standard ticket sizes resolve quickly.',
        'Payment behavior historical delays is within 14 days.'
      ] as any,
      confidence: 0.94,
    }
  });

  await prisma.riskPrediction.create({
    data: {
      invoiceId: inv6.id,
      riskScore: 84,
      predictedPaymentDate: dateAhead(15),
      probabilityCurve: { day7: '12%', day14: '45%', day30: '72%' },
      factors: [
        'Total exposure (₹4L) is larger than the client’s recommended credit limit ceiling (₹2L).',
        'History shows high average accounts receivable delay patterns (28 days).'
      ] as any,
      confidence: 0.91,
    }
  });

  // 7. Create Mock Payments (Seeding a historical payment for the charts)
  await prisma.payment.create({
    data: {
      invoiceId: inv4.id,
      amount: 160000.0,
      paymentMethod: PaymentMethod.STRIPE,
      transactionId: 'ch_stripe_receipt_9921',
      status: 'SUCCESS',
      processedAt: dateAgo(28),
    }
  });

  // 8. Create Cash Flow Forecast
  await prisma.cashflowForecast.create({
    data: {
      organizationId: demoOrg.id,
      forecastDate: today,
      expectedCollections: 245000.0,
      expectedRevenue: 310000.0,
      atRiskRevenue: 525000.0,
      predictedCashPosition: 1240000.0,
      confidenceBands: {
        bestCase: 1660000,
        expectedCase: 1240000,
        worstCase: 980000,
      } as any,
      confidence: 0.88,
      rangeDays: 30,
    }
  });

  // 9. Send a default system notification to display
  await prisma.notification.create({
    data: {
      organizationId: demoOrg.id,
      title: 'High Risk Receivable Exposure Alert',
      message: 'Total accounts receivable overdue is ₹5.25L. We recommend initiating a Smart Collections flow.',
      type: 'WARNING',
    }
  });

  // 10. Cash ledger — a cash account plus four complete months of outflows and
  // operating inflows, so Forecast Runway shows a real computed figure rather
  // than an empty state. Four months means the 3-month window is fully covered
  // even though the current (partial) month is excluded from the average.
  const monthStart = (back: number) => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth() - back, 1);
  };
  const dayIn = (back: number, day: number) => {
    const m = monthStart(back);
    return new Date(m.getFullYear(), m.getMonth(), day);
  };

  await prisma.cashAccount.create({
    data: {
      organizationId: demoOrg.id,
      name: 'HDFC Current — 4471',
      accountType: 'CURRENT',
      currency: 'INR',
      currentBalance: 4850000, // ₹48.5L
      balanceAsOf: new Date(),
      source: 'MANUAL',
    },
  });

  // Recurring monthly outflows, repeated across the last four complete months.
  const recurring: Array<{
    description: string;
    counterparty: string;
    category: any;
    amount: number;
    day: number;
  }> = [
    { description: 'Monthly payroll', counterparty: 'Team payroll', category: 'PAYROLL', amount: 980000, day: 1 },
    { description: 'Office rent', counterparty: 'Prestige Estates', category: 'RENT', amount: 185000, day: 5 },
    { description: 'Cloud + SaaS tooling', counterparty: 'AWS / Vercel / Slack', category: 'SOFTWARE', amount: 142000, day: 8 },
    { description: 'Performance marketing', counterparty: 'Google Ads', category: 'MARKETING', amount: 96000, day: 12 },
    { description: 'Accounting retainer', counterparty: 'Sharma & Associates', category: 'PROFESSIONAL_FEES', amount: 45000, day: 15 },
    { description: 'Utilities and internet', counterparty: 'BESCOM / ACT', category: 'UTILITIES', amount: 28000, day: 18 },
  ];

  for (let back = 1; back <= 4; back++) {
    for (const r of recurring) {
      await prisma.transaction.create({
        data: {
          organizationId: demoOrg.id,
          direction: 'OUTFLOW',
          amount: r.amount,
          currency: 'INR',
          category: r.category,
          description: r.description,
          counterparty: r.counterparty,
          occurredAt: dayIn(back, r.day),
          isRecurring: true,
          source: 'MANUAL',
        },
      });
    }

    // Operating inflow — collections actually landing in the bank. Recorded
    // independently of the AR ledger on purpose: invoices never auto-create
    // these, so the two ledgers stay separate sources of truth.
    await prisma.transaction.create({
      data: {
        organizationId: demoOrg.id,
        direction: 'INFLOW',
        amount: 610000 + back * 20000,
        currency: 'INR',
        description: 'Client collections settled',
        counterparty: 'Various clients',
        occurredAt: dayIn(back, 22),
        source: 'MANUAL',
      },
    });
  }

  // A one-off capital purchase, flagged out of burn so it doesn't distort the
  // trailing average — exactly the case excludedFromBurn exists for.
  await prisma.transaction.create({
    data: {
      organizationId: demoOrg.id,
      direction: 'OUTFLOW',
      amount: 420000,
      currency: 'INR',
      category: 'EQUIPMENT',
      description: 'Laptop refresh (one-off)',
      counterparty: 'Apple India',
      occurredAt: dayIn(2, 14),
      excludedFromBurn: true,
      source: 'MANUAL',
    },
  });

  console.log('Database Seeding Successful! Demo Account credentials:');
  console.log('Email: demo@invonest.ai');
  console.log('Password: Demo@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
