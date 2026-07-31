import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayUnique,
  IsUUID,
} from 'class-validator';
import { ERole, EPermissions } from '../../../utils/common.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  username: string;

  // No password field — every new account starts with the default
  // password (hashed in the service) and is expected to change it on
  // first login. Keeps account creation a single fast action for admins.

  @IsOptional()
  @IsEnum(ERole)
  role?: ERole;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(EPermissions, { each: true })
  permissions?: EPermissions[];
}

export class UpdateUserPermissionsDto {
  @IsUUID()
  id: string;

  @IsArray()
  @ArrayUnique()
  @IsEnum(EPermissions, { each: true })
  permissions: EPermissions[];
}

export class DeleteUserDto {
  @IsUUID()
  id: string;
}
