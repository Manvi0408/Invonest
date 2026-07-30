import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityEventType, Prisma } from '@prisma/client';

/**
 * Append-only activity stream behind the Overview feed.
 *
 * `record()` deliberately never throws. An audit write failing must not roll
 * back the business action that produced it — losing a feed row is survivable,
 * failing a payment because its log entry failed is not.
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    organizationId: string,
    eventType: ActivityEventType,
    actor: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: { organizationId, eventType, actor, metadata },
      });
    } catch (err: any) {
      this.logger.warn(
        `Activity log write failed (${eventType}, org ${organizationId}): ${err?.message}`,
      );
    }
  }

  /** Latest events for the feed. Capped so a caller can't request the world. */
  async recent(organizationId: string, limit = 15) {
    return this.prisma.activityLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
    });
  }
}
