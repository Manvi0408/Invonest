import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { TeamService } from './team.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/jwt-auth.guard';
import { Role } from '@prisma/client';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async list(@CurrentUser('orgId') orgId: string) {
    return this.teamService.listMembers(orgId);
  }

  @Post('invite')
  async invite(
    @CurrentUser() user: AuthedUser,
    @Body() body: { email: string; role?: Role },
  ) {
    return this.teamService.invite(user.orgId, user.role, body.email, body.role ?? 'MEMBER');
  }

  @Delete('member/:membershipId')
  async remove(@CurrentUser() user: AuthedUser, @Param('membershipId') membershipId: string) {
    return this.teamService.removeMember(user.orgId, user.role, membershipId);
  }
}
