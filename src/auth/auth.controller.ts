import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginUserDto } from './common/dto/user';
import { Public } from '../../common/commons/decorator/jwt.decorator';
import { JwtAuthGuard } from '../../common/commons/guards/jwt-auth.guard';
import { extractUser } from '../../utils/common.helper';
import { ICustomRequest } from '../../utils/common.interface';
import { ErrorCode } from '../../utils/common.enum';
import { SkipMaintenance } from '../systemmaintenance/common/decorators/skip-maintenance.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('refresh-token')
  async refreshToken(@Body('userId') userId: string) {
    return this.authService.refreshToken(userId);
  }
  @SkipMaintenance()
  @Post('/register')
  @Public()
  register(@Body() authCredentialsDto: CreateUserDto): Promise<void> {
    return this.authService.register(authCredentialsDto);
  }
  @SkipMaintenance()
  @Public()
  @Post('/login')
  login(
    @Body() authCredentialsDto: LoginUserDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.login(authCredentialsDto);
  }
}
