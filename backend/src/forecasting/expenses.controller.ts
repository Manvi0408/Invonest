import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  TransactionDirection,
  ExpenseCategory,
  CashAccountType,
  TransactionSource,
} from '@prisma/client';

/**
 * Manual entry for the cash ledger — phase 1 of the input paths in
 * docs/specs/transaction-expense-model.md. CSV import and accounting sync are
 * deliberately not built yet.
 *
 * Every handler scopes by the caller's orgId from the JWT, never from the body,
 * so one tenant can't read or mutate another's ledger.
 */
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- accounts

  @Get('accounts')
  async listAccounts(@CurrentUser('orgId') orgId: string) {
    return this.prisma.cashAccount.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('accounts')
  async createAccount(
    @CurrentUser('orgId') orgId: string,
    @Body()
    body: {
      name?: string;
      accountType?: CashAccountType;
      currentBalance?: number;
      balanceAsOf?: string;
      currency?: string;
    },
  ) {
    if (!body.name?.trim()) throw new BadRequestException('Account name is required.');
    if (body.currentBalance === undefined || Number.isNaN(Number(body.currentBalance))) {
      throw new BadRequestException('A numeric current balance is required.');
    }

    return this.prisma.cashAccount.create({
      data: {
        organizationId: orgId,
        name: body.name.trim(),
        accountType: body.accountType ?? CashAccountType.CURRENT,
        currency: body.currency ?? 'INR',
        currentBalance: Number(body.currentBalance),
        // Defaulting to "now" is right for manual entry: the user is reading the
        // balance off their banking app as they type it.
        balanceAsOf: body.balanceAsOf ? new Date(body.balanceAsOf) : new Date(),
        source: TransactionSource.MANUAL,
      },
    });
  }

  @Patch('accounts/:id')
  async updateAccount(
    @CurrentUser('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; currentBalance?: number; balanceAsOf?: string; isActive?: boolean },
  ) {
    const existing = await this.prisma.cashAccount.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Cash account not found.');

    return this.prisma.cashAccount.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.currentBalance !== undefined
          ? { currentBalance: Number(body.currentBalance), balanceAsOf: new Date() }
          : {}),
        ...(body.balanceAsOf !== undefined ? { balanceAsOf: new Date(body.balanceAsOf) } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
  }

  @Delete('accounts/:id')
  async deleteAccount(@CurrentUser('orgId') orgId: string, @Param('id') id: string) {
    const existing = await this.prisma.cashAccount.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Cash account not found.');
    await this.prisma.cashAccount.delete({ where: { id } });
    return { deleted: true };
  }

  // ------------------------------------------------------------ transactions

  @Get('transactions')
  async listTransactions(@CurrentUser('orgId') orgId: string) {
    return this.prisma.transaction.findMany({
      where: { organizationId: orgId },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }

  @Post('transactions')
  async createTransaction(
    @CurrentUser('orgId') orgId: string,
    @Body()
    body: {
      direction?: TransactionDirection;
      amount?: number;
      category?: ExpenseCategory | null;
      description?: string;
      counterparty?: string;
      occurredAt?: string;
      isRecurring?: boolean;
      excludedFromBurn?: boolean;
      currency?: string;
    },
  ) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      // Direction carries the sign; a negative amount here means the caller is
      // confused about which field expresses direction.
      throw new BadRequestException('Amount must be a positive number. Use direction for sign.');
    }
    if (!body.description?.trim()) {
      throw new BadRequestException('Description is required.');
    }

    return this.prisma.transaction.create({
      data: {
        organizationId: orgId,
        direction: body.direction ?? TransactionDirection.OUTFLOW,
        amount,
        currency: body.currency ?? 'INR',
        category: body.category ?? null,
        description: body.description.trim(),
        counterparty: body.counterparty?.trim() || null,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        isRecurring: body.isRecurring ?? false,
        excludedFromBurn: body.excludedFromBurn ?? false,
        source: TransactionSource.MANUAL,
      },
    });
  }

  @Delete('transactions/:id')
  async deleteTransaction(@CurrentUser('orgId') orgId: string, @Param('id') id: string) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Transaction not found.');
    await this.prisma.transaction.delete({ where: { id } });
    return { deleted: true };
  }
}
