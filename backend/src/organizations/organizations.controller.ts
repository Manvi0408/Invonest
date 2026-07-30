import { Controller, Get, Param } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { OwnershipService } from '../auth/ownership.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly orgsService: OrganizationsService,
    private readonly ownership: OwnershipService,
  ) {}

  /**
   * Returns only the caller's own organization.
   *
   * Previously `GET /organizations` returned every organization in the database —
   * a cross-tenant leak. The dashboard only ever reads the first entry, so it keeps
   * working, but the response is now scoped to the token.
   */
  @Get()
  async listMine(@CurrentUser('orgId') orgId: string) {
    const org = await this.orgsService.getOrg(orgId);
    return org ? [org] : [];
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser('orgId') orgId: string) {
    this.ownership.assertOrg(id, orgId);
    return this.orgsService.getOrg(id);
  }

  /**
   * `POST /organizations` removed: org creation belongs to the signup flow, which
   * provisions the organization and its ADMIN membership atomically. An open
   * create endpoint let any caller mint tenants.
   */
}
