import { Controller, Post, Get, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import type { AuthedUser } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(
    @Body() body: { email: string; pass: string; firstName?: string; lastName?: string },
  ) {
    return this.authService.signup(body);
  }

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; pass: string }) {
    return this.authService.login(body.email, body.pass);
  }

  /**
   * Switch the active workspace.
   *
   * orgId lives in the JWT and the guard reads it from there, never from a
   * request body - that is what keeps tenancy enforceable. So switching cannot
   * be client state: the server verifies the caller actually belongs to the
   * target org, then mints a fresh token carrying the new orgId and role.
   */
  /** Workspaces the caller belongs to — populates the switcher dropdown. */
  @Get('workspaces')
  async workspaces(@CurrentUser() user: AuthedUser) {
    return this.authService.listWorkspaces(user.userId);
  }

  @Post('switch-company')
  async switchCompany(
    @CurrentUser() user: AuthedUser,
    @Body() body: { organizationId?: string },
  ) {
    if (!body?.organizationId) {
      throw new BadRequestException('organizationId is required.');
    }
    return this.authService.switchCompany(user.userId, body.organizationId);
  }

  @Public()
  @Post('google')
  async google(@Body() body: { idToken: string }) {
    return this.authService.loginWithGoogle(body.idToken);
  }
}
