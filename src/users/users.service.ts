import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../auth/common/entity/user';
import { IResponse } from '../../utils/common.interface';
import type { Response } from 'express';
import { ErrorCode } from '../../utils/common.enum';
import { expressResponse, extractUser } from '../../utils/common.helper';
import type { ICustomRequest } from '../../utils/common.interface';

import { RedisCacheService } from '../redis/redis-cach.service';
import { userKey, usersKey } from '../redis/redis.keys';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { userRoom } from '../websocket/common/websocket.rooms';

import {
  EAdminNotification,
  EDoctorNotification,
  NotificationHelper,
} from '../notification/common/notification.helper';
import { PATIENT_TTL } from '../redis/redis.ttl';
import {
  CreateUserDto,
  DeleteUserDto,
  UpdateUserPermissionsDto,
} from './dto/user';
import { DEFAULT_PASSWORD } from '../../utils/common.constant';
import { AuthService } from '../auth/auth.service';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User, 'main_repo')
    private readonly userRepository: Repository<User>,
    private readonly redis: RedisCacheService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly notificationHelper: NotificationHelper,
    private readonly authService: AuthService,
  ) {}

  async createUser(dto: CreateUserDto, req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.NO_PERMISSION };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const existing = await this.userRepository.findOne({
        where: { username: dto.username },
      });

      if (existing) {
        response.data = { code: ErrorCode.USERNAME_ALREADY_EXIST };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

      const user = this.userRepository.create({
        name: dto.name,
        username: dto.username,
        password: hashedPassword,
        role: dto.role,
        permissions: dto.permissions ?? [],
      });

      const saved = await this.userRepository.save(user);

      await this.redis.del(usersKey());

      void this.notificationHelper.notifyAdmins(
        EAdminNotification.USER_REGISTERED,
        `New user account created: ${saved.name} (${saved.username}).`,
        { userId: saved.id },
      );

      response.data = {
        code: 0,
        data: {
          id: saved.id,
          name: saved.name,
          username: saved.username,
          role: saved.role,
        },
      };
      response.code = HttpStatus.CREATED;
    } catch (error) {
      console.error('Error creating user:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async getAllUsers(req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const cachekey = usersKey();
      const cacheData = await this.redis.get<User[]>(cachekey);
      if (cacheData) {
        response.code = HttpStatus.OK;
        response.data = { code: 0, data: cacheData };
        return;
      }

      const users = await this.userRepository.find({
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          permissions: true,
          created_at: true,
        },
        order: { created_at: 'DESC' },
      });

      await this.redis.set(cachekey, users, PATIENT_TTL);
      response.code = HttpStatus.OK;
      response.data = { code: 0, data: users };
    } catch (error) {
      console.error('Error fetching users:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async updateUserPermissions(
    dto: UpdateUserPermissionsDto,
    req: ICustomRequest,
    res: Response,
  ) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.NO_PERMISSION };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const target = await this.userRepository.findOne({
        where: { id: dto.id },
      });

      if (!target) {
        response.data = { code: ErrorCode.USER_NOT_FOUND };
        response.code = HttpStatus.NOT_FOUND;
        return;
      }

      await this.userRepository.update(
        { id: dto.id },
        { permissions: dto.permissions },
      );

      await this.redis.del(userKey(dto.id));
      await this.redis.del(usersKey());

      // Generate a fresh token with updated permissions
      const { accessToken } = await this.authService.refreshToken(dto.id);

      // Emit permissions + new token in one event so frontend rehydrates instantly
      this.websocketGateway.server
        .to(userRoom(dto.id))
        .emit('permissions_updated', {
          permissions: dto.permissions,
          accessToken,
        });

      void this.notificationHelper.notifyDoctors(
        EDoctorNotification.ASSISTANT_PERMISSIONS_CHANGED,
        `Permissions updated for ${target.name}.`,
        { userId: dto.id, permissions: dto.permissions },
      );

      response.data = {
        code: 0,
        data: { id: dto.id, permissions: dto.permissions },
      };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error updating user permissions:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async deleteUser(dto: DeleteUserDto, req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.NO_PERMISSION };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      if (id === dto.id) {
        response.data = { code: ErrorCode.USER_CANNOT_DELETE_SELF };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const target = await this.userRepository.findOne({
        where: { id: dto.id },
      });

      if (!target) {
        response.data = { code: ErrorCode.USER_NOT_FOUND };
        response.code = HttpStatus.NOT_FOUND;
        return;
      }

      // force-logout BEFORE deleting the row — if the socket push happened
      // after the delete, a still-connected client could keep working for
      // a few more seconds on now-orphaned data before anything catches it
      this.websocketGateway.server
        .to(userRoom(dto.id))
        .emit('force_logout', { reason: 'account_deleted' });

      await this.userRepository.delete({ id: dto.id });

      await this.redis.del(userKey(dto.id));
      await this.redis.del(usersKey());

      void this.notificationHelper.notifyAdmins(
        EAdminNotification.USER_REGISTERED, // swap for a proper "user deleted" admin enum value if you have one
        `User account deleted: ${target.name} (${target.username}).`,
        { userId: dto.id },
      );

      response.data = { code: 0 };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error deleting user:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }
}
