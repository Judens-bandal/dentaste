import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './common/entity/user';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './common/jwt-payload.interface';
import { CreateUserDto, LoginUserDto } from './common/dto/user';
import { ERole, ErrorCode } from 'utils/common.enum';

import * as bcrypt from 'bcrypt';
import { DEFAULT_ROLE_PERMISSIONS } from 'utils/role.permission.constant';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User, 'main_repo')
    private userRepository: Repository<User>,

    private readonly jwtService: JwtService,
    // private readonly notificationHelper: NotificationHelper, for redis
  ) {}

  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token);
  }

  decodeToken(token: string): JwtPayload | null {
    return this.jwtService.decode<JwtPayload>(token);
  }

  async register(authCredentialsDto: CreateUserDto): Promise<void> {
    const { name, username, password, role, permissions } = authCredentialsDto;

    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException({
        code: ErrorCode.USERNAME_ALREADY_EXIST,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // no role provided -> default to ASSISTANT
    const finalRole = role ?? ERole.ASSISTANT;

    // no permissions explicitly provided -> fall back to the role's default set
    // (ADMIN gets everything, DOCTOR gets clinical + assistant-management access,
    // ASSISTANT gets none until a doctor/admin grants some)
    const finalPermissions = permissions ?? DEFAULT_ROLE_PERMISSIONS[finalRole];

    const user = this.userRepository.create({
      name,
      username,
      password: hashedPassword,
      role: finalRole,
      permissions: finalPermissions,
    });

    await this.userRepository.save(user);

    // for notification
    // void this.notificationHelper.notifyAdmins(
    //   EAdminNotification.USER_REGISTERED,
    //   `New user "${name}" registered`,
    //   { id: user.id },
    // );
  }

  async login(
    authCredentialsDto: LoginUserDto,
  ): Promise<{ accessToken: string }> {
    const { username, password } = authCredentialsDto;

    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Please check your valid credentials!');
    }

    const payload: JwtPayload = {
      name: user.name,
      username: user.username,
      role: user.role,
      id: user.id,
      permissions: user.permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: 86400, // 1 day, in seconds
    });

    // void this.notificationHelper.notifyAdmins(
    //   EAdminNotification.USER_LOGIN,
    //   `${user.name} logged in`,
    //   { id: user.id },
    // );

    return { accessToken };
  }

  // getAllUsers(): Promise<User[]> {
  //   return this.userRepository.find();
  // }
}
