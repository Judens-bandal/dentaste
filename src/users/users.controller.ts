import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ICustomRequest } from '../../utils/common.interface';

import { Permission } from '../../common/commons/decorator/permissions.decorator';
import { Roles } from '../../common/commons/decorator/roles.decorator';
import { EPermissions, ERole } from '../../utils/common.enum';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  DeleteUserDto,
  UpdateUserPermissionsDto,
} from './dto/user';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Roles(ERole.ADMIN)
  @Permission(EPermissions.MANAGE_USERS)
  @Post('/create')
  async createUser(
    @Body() dto: CreateUserDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.userService.createUser(dto, req, res);
  }

  @Roles(ERole.ADMIN)
  @Permission(EPermissions.MANAGE_USERS)
  @Get()
  async getAllUsers(@Req() req: ICustomRequest, @Res() res: Response) {
    return await this.userService.getAllUsers(req, res);
  }

  @Roles(ERole.ADMIN, ERole.DOCTOR)
  @Permission(EPermissions.MANAGE_PERMISSIONS)
  @Put('/permissions')
  async updatePermissions(
    @Body() dto: UpdateUserPermissionsDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.userService.updateUserPermissions(dto, req, res);
  }

  @Roles(ERole.ADMIN)
  @Permission(EPermissions.MANAGE_USERS)
  @Delete('/delete')
  async deleteUser(
    @Body() dto: DeleteUserDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.userService.deleteUser(dto, req, res);
  }
}
