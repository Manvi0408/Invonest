import { Controller, Post, Get, Delete, Param, Body, Query, BadRequestException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { OwnershipService } from '../auth/ownership.service';

@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly ownership: OwnershipService,
  ) {}

  // orgId now comes from the token, so the :orgId path segment is gone.
  @Post()
  async create(
    @CurrentUser('orgId') orgId: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      companyName?: string;
      industry?: string;
      creditLimit?: number;
      outstandingBalance?: number;
    },
  ) {
    if (!body.name?.trim()) throw new BadRequestException('Company name is required.');
    if (!body.email?.trim()) throw new BadRequestException('Contact email is required.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email.trim())) {
      throw new BadRequestException('Enter a valid contact email.');
    }
    const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
    const creditLimit = num(body.creditLimit);
    const outstanding = num(body.outstandingBalance);
    if (creditLimit !== undefined && (!Number.isFinite(creditLimit) || creditLimit < 0)) {
      throw new BadRequestException('Credit limit must be a positive number.');
    }
    if (outstanding !== undefined && (!Number.isFinite(outstanding) || outstanding < 0)) {
      throw new BadRequestException('Overdue amount must be a positive number.');
    }

    return this.clientsService.createClient(orgId, {
      name: body.name.trim(),
      email: body.email.trim(),
      phone: body.phone?.trim(),
      companyName: body.companyName?.trim() || body.name.trim(),
      industry: body.industry?.trim() || undefined,
      creditLimit,
      outstandingBalance: outstanding,
    });
  }

  /** Soft delete. Historical invoices and activity are preserved. */
  @Delete(':id')
  async archive(@Param('id') id: string, @CurrentUser('orgId') orgId: string) {
    await this.ownership.assertClient(id, orgId);
    return this.clientsService.archiveClient(orgId, id);
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string, @CurrentUser('orgId') orgId: string) {
    await this.ownership.assertClient(id, orgId);
    return this.clientsService.restoreClient(orgId, id);
  }

  @Get()
  async getAll(
    @CurrentUser('orgId') orgId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.clientsService.getClients(orgId, includeArchived === 'true');
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser('orgId') orgId: string) {
    await this.ownership.assertClient(id, orgId);
    return this.clientsService.getClient(id);
  }
}
