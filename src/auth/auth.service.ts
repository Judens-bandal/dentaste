import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './common/entity/user';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './common/jwt-payload.interface';
import { CreateUserDto, LoginUserDto } from './common/dto/user';

import * as bcrypt from 'bcrypt';

import { ERole, ErrorCode } from '../../utils/common.enum';
import {
  EXP,
  LOCKOUT_SECONDS,
  MAX_FAILED_ATTEMPTS,
} from '../../utils/common.constant';
import { DEFAULT_ROLE_PERMISSIONS } from '../../utils/role.permission.constant';
import {
  EAdminNotification,
  NotificationHelper,
} from '../notification/common/notification.helper';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User, 'main_repo')
    private userRepository: Repository<User>,

    private readonly jwtService: JwtService,
    private readonly notificationHelper: NotificationHelper,
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
    void this.notificationHelper.notifyAdmins(
      EAdminNotification.USER_REGISTERED,
      `New user "${name}" registered`,
    );
  }

  //   async login(
  //     authCredentialsDto: LoginUserDto,
  //   ): Promise<{ accessToken: string }> {
  //     const { username, password } = authCredentialsDto;

  //     const user = await this.userRepository.findOne({
  //       where: { username },
  //     });

  //     if (!user) {
  //       throw new UnauthorizedException({
  //         code: ErrorCode.INVALID_CREDENTIALS,
  //       });
  //     }

  //     const isPasswordValid = await bcrypt.compare(password, user.password);

  //     if (!isPasswordValid) {
  //       throw new UnauthorizedException('Please check your valid credentials!');
  //     }

  //     const payload: JwtPayload = {
  //       name: user.name,
  //       username: user.username,
  //       role: user.role,
  //       id: user.id,
  //       permissions: user.permissions,
  //     };

  //     const accessToken = this.jwtService.sign(payload, {
  //       expiresIn: 86400, // 1 day, in seconds
  //     });

  //     // void this.notificationHelper.notifyAdmins(
  //     //   EAdminNotification.USER_LOGIN,
  //     //   `${user.name} logged in`,
  //     //   { id: user.id },
  //     // );

  //     return { accessToken };
  //   }

  //   // getAllUsers(): Promise<User[]> {
  //   //   return this.userRepository.find();
  //   // }
  // }

  private loginAttempts = new Map<
    string,
    { count: number; expiresAt: number }
  >();

  private attemptsKey(username: string) {
    return `login-attempts:${username}`;
  }

  private getAttempts(key: string): number {
    const entry = this.loginAttempts.get(key);
    if (!entry) return 0;
    if (Date.now() > entry.expiresAt) {
      this.loginAttempts.delete(key);
      return 0;
    }
    return entry.count;
  }

  // Seconds left until the lockout clears — 0 if not locked / already expired.
  private getRemainingLockoutSeconds(key: string): number {
    const entry = this.loginAttempts.get(key);
    if (!entry) return 0;
    const remainingMs = entry.expiresAt - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  // 125 -> "2:05"
  private formatMmSs(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private setAttempts(key: string, count: number) {
    this.loginAttempts.set(key, {
      count,
      expiresAt: Date.now() + LOCKOUT_SECONDS * 1000,
    });
  }

  private clearAttempts(key: string) {
    this.loginAttempts.delete(key);
  }

  async login(
    authCredentialsDto: LoginUserDto,
  ): Promise<{ accessToken: string }> {
    const key = this.attemptsKey(authCredentialsDto.username);
    // const attempts = (await this.redisCacheService.get<number>(key)) ?? 0;

    const attempts = this.getAttempts(key);

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      // const ttlMs = await this.redisCacheService.ttl(key); // ms remaining, if your client supports it
      // const remainingSeconds = Math.ceil(ttlMs / 1000);
      const remainingSeconds = this.getRemainingLockoutSeconds(key);

      throw new HttpException(
        {
          code: ErrorCode.TOO_MANY_LOGIN_ATTEMPTS,
          message: `Too many failed login attempts. Please wait ${this.formatMmSs(
            remainingSeconds,
          )} before trying again.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const { username, password } = authCredentialsDto;

    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      // await this.redisCacheService.set(key, attempts + 1, LOCKOUT_SECONDS);
      this.setAttempts(key, attempts + 1);

      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // await this.redisCacheService.set(key, attempts + 1, LOCKOUT_SECONDS);
      this.setAttempts(key, attempts + 1);

      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
      });
    }

    // await this.redisCacheService.del(key);
    this.clearAttempts(key);

    const payload: JwtPayload = {
      name: user.name,
      username: user.username,
      role: user.role,
      id: user.id,
      permissions: user.permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: EXP, // 1 day, in seconds
    });

    void this.notificationHelper.notifyAdmins(
      EAdminNotification.USER_LOGIN,
      `${user.name} logged in`,
    );

    return { accessToken };
  }

  // getAllUsers(): Promise<User[]> {
  //   return this.userRepository.find();
  // }
}
