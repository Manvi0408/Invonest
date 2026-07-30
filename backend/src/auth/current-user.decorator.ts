import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthedUser } from './jwt-auth.guard';

/**
 * Pulls the verified identity off the request.
 *
 *   @CurrentUser() user: AuthedUser        -> whole object
 *   @CurrentUser('orgId') orgId: string    -> single claim
 *
 * This is the ONLY sanctioned source of orgId/userId in a controller.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthedUser | undefined, ctx: ExecutionContext) => {
    const user: AuthedUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
