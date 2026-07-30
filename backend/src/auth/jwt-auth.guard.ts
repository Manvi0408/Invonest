import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthedUser {
  userId: string;
  email: string;
  orgId: string;
  role: string;
}

declare module 'express' {
  interface Request {
    user?: AuthedUser;
  }
}

/**
 * Registered globally in AppModule. Every route is authenticated unless it opts
 * out with @Public(). Downstream code must read orgId/role from req.user only —
 * never from a body or param, which the client controls.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing bearer token.');

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super_secret_jwt_key_12345!',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (!payload?.sub || !payload?.orgId) {
      throw new UnauthorizedException('Token is missing an organization claim.');
    }

    // A signature-valid token can still name an organization that no longer
    // exists — after a re-seed, a deleted tenant, or a restored backup. Without
    // this check every downstream read silently returns an empty set and every
    // write dies on a foreign-key violation surfaced as a 500, which looks like
    // a broken feature rather than a dead session. A 401 lets the client's
    // existing redirect-to-login handle it.
    const orgExists = await this.prisma.organization.findUnique({
      where: { id: payload.orgId },
      select: { id: true },
    });
    if (!orgExists) {
      throw new UnauthorizedException(
        'Your session refers to an organization that no longer exists. Please sign in again.',
      );
    }

    req.user = {
      userId: payload.sub,
      email: payload.email,
      orgId: payload.orgId,
      role: payload.role ?? 'MEMBER',
    } satisfies AuthedUser;

    return true;
  }

  private extractToken(req: any): string | null {
    const header: string | undefined = req.headers?.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
