import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { Public } from './auth.decorator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ouvre une session propriétaire' })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(body.password);
    response.cookie(
      this.auth.cookieName(),
      `${session.id}.${session.token}`,
      { ...this.auth.cookieOptions(), expires: session.expiresAt },
    );
    return { authenticated: true };
  }

  @Get('session')
  @ApiOperation({ summary: 'Vérifie la session propriétaire' })
  session() {
    return { authenticated: true };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.[this.auth.cookieName()]);
    const options = this.auth.cookieOptions();
    response.clearCookie(this.auth.cookieName(), {
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
      path: options.path,
    });
    return { authenticated: false };
  }
}
