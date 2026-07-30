import { Injectable, Logger, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PlanService } from '../billing/plan.service';
import { PlanLimitException } from '../billing/plan-limit.exception';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlanService,
  ) {}

  async listMembers(orgId: string) {
    const [members, quota] = await Promise.all([
      this.prisma.membership.findMany({
        where: { organizationId: orgId },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.plans.remainingQuota(orgId, 'team_seat'),
    ]);

    return {
      members,
      seats: { used: quota.used, limit: quota.limit, remaining: quota.remaining },
    };
  }

  /**
   * Adds a member to the org, creating a shell user if the email is new.
   * Seat limit is enforced before anything is written.
   */
  async invite(orgId: string, actorRole: string, email: string, role: Role = 'MEMBER') {
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenException('Only organization admins can invite team members.');
    }

    const quota = await this.plans.remainingQuota(orgId, 'team_seat');
    if (!quota.unlimited && quota.remaining !== null && quota.remaining <= 0) {
      throw new PlanLimitException(
        'seat_limit',
        `You've reached your team seat limit (${quota.used}/${quota.limit}).`,
        { quota: { used: quota.used, limit: quota.limit, remaining: quota.remaining } },
      );
    }

    const normalized = email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      // Placeholder credential — the invitee sets a real password on first sign-in.
      const passwordHash = await bcrypt.hash(randomUUID(), await bcrypt.genSalt(10));
      user = await this.prisma.user.create({ data: { email: normalized, passwordHash } });
    }

    const existing = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException('That person is already a member of this organization.');
    }

    const membership = await this.prisma.membership.create({
      data: { organizationId: orgId, userId: user.id, role },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    this.logger.log(`Added ${normalized} to org ${orgId} as ${role}.`);

    const after = await this.plans.remainingQuota(orgId, 'team_seat');
    return {
      membership,
      seats: { used: after.used, limit: after.limit, remaining: after.remaining },
    };
  }

  async removeMember(orgId: string, actorRole: string, membershipId: string) {
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenException('Only organization admins can remove team members.');
    }

    const membership = await this.prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.organizationId !== orgId) {
      throw new ForbiddenException('You do not have access to this membership.');
    }

    const adminCount = await this.prisma.membership.count({
      where: { organizationId: orgId, role: 'ADMIN' },
    });
    if (membership.role === 'ADMIN' && adminCount <= 1) {
      throw new ConflictException('An organization must keep at least one admin.');
    }

    await this.prisma.membership.delete({ where: { id: membershipId } });
    return { removed: true };
  }
}
