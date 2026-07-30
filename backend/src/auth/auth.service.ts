import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';

const PERSONAL_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(data: { email: string; pass: string; firstName?: string; lastName?: string }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.pass, salt);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    // Auto-provision a default organization to speed up trial boarding
    const orgName = data.firstName ? `${data.firstName}'s Workspace` : 'Default Workspace';
    const orgSlug = `${user.email.split('@')[0]}-org-${Math.floor(Math.random() * 1000)}`;

    const org = await this.prisma.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
      },
    });

    // Map user as admin in organization
    const membership = await this.prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'ADMIN',
      },
    });

    const token = this.generateToken(user.id, user.email, org.id, 'ADMIN');

    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      organization: org,
      token,
    };
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { include: { organization: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Grab first active organization or map empty
    const mainMembership = user.memberships[0];
    const orgId = mainMembership ? mainMembership.organizationId : '';
    const role = mainMembership ? mainMembership.role : 'MEMBER';

    const token = this.generateToken(user.id, user.email, orgId, role);

    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      organization: mainMembership?.organization || null,
      token,
    };
  }

  /** Every workspace the user belongs to, for the switcher. */
  async listWorkspaces(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: { select: { id: true, name: true, slug: true, plan: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      plan: m.organization.plan,
      role: m.role,
    }));
  }

  /**
   * Re-issue the token against a different org.
   *
   * The membership check is the security boundary: without it, any authenticated
   * user could name any organizationId and be handed a token granting access to
   * another tenant's data.
   */
  async switchCompany(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, organizationId },
      include: { organization: true },
    });
    if (!membership) {
      throw new UnauthorizedException('You do not have access to that workspace.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found.');

    const token = this.generateToken(user.id, user.email, organizationId, membership.role);

    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      organization: membership.organization,
      token,
    };
  }

  async loginWithGoogle(idToken: string) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new UnauthorizedException(
        'Google Sign-In is not configured on this server (missing GOOGLE_CLIENT_ID).',
      );
    }

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google credential.');
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google credential.');
    }

    const domain = payload.email.split('@')[1]?.toLowerCase();

    // Google only sets `hd` for Workspace accounts; personal Gmail accounts never have it.
    if (!payload.hd || PERSONAL_EMAIL_DOMAINS.includes(domain)) {
      throw new ForbiddenException(
        "Not a company account. Please sign in using your organization's Google Workspace account.",
      );
    }

    let user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: { memberships: { include: { organization: true } } },
    });

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomUUID(), salt);

      const created = await this.prisma.user.create({
        data: {
          email: payload.email,
          passwordHash,
          firstName: payload.given_name,
          lastName: payload.family_name,
        },
      });

      const org = await this.prisma.organization.create({
        data: {
          name: `${domain} Workspace`,
          slug: `${domain.split('.')[0]}-org-${Math.floor(Math.random() * 1000)}`,
        },
      });

      await this.prisma.membership.create({
        data: { userId: created.id, organizationId: org.id, role: 'ADMIN' },
      });

      user = await this.prisma.user.findUnique({
        where: { id: created.id },
        include: { memberships: { include: { organization: true } } },
      });
    }

    const mainMembership = user!.memberships[0];
    const orgId = mainMembership ? mainMembership.organizationId : '';
    const role = mainMembership ? mainMembership.role : 'MEMBER';

    const token = this.generateToken(user!.id, user!.email, orgId, role);

    return {
      user: { id: user!.id, email: user!.email, firstName: user!.firstName, lastName: user!.lastName },
      organization: mainMembership?.organization || null,
      token,
    };
  }

  private generateToken(userId: string, email: string, orgId: string, role: string) {
    return this.jwtService.sign({
      sub: userId,
      email,
      orgId,
      role,
    });
  }
}
