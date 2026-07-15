import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginUserDto } from './common/dto/user';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/register')
  //   @Public()
  register(@Body() authCredentialsDto: CreateUserDto): Promise<void> {
    return this.authService.register(authCredentialsDto);
  }

  @Post('/login')
  //   @Public()
  login(
    @Body() authCredentialsDto: LoginUserDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.login(authCredentialsDto);
  }
}
