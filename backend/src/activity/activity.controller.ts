import { Controller, Get, Query } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  /** Feed for the Overview panel. Scoped to the caller's org by the guard. */
  @Get()
  async recent(@CurrentUser('orgId') orgId: string, @Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 15;
    return this.activity.recent(orgId, Number.isFinite(n) ? n : 15);
  }
}
