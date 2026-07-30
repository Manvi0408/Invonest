import { Global, Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';

/**
 * Global: almost every feature module needs to append an activity row, and
 * threading an import through each one adds noise without adding safety.
 */
@Global()
@Module({
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
