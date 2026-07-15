// src/users/dto/create-user.dto.ts
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { EPermissions, ERole } from 'utils/common.enum';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  // optional -> service defaults to ASSISTANT if omitted
  @IsOptional()
  @IsEnum(ERole)
  role?: ERole;

  // optional -> service defaults to the role's permission set if omitted
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(EPermissions, { each: true })
  permissions?: EPermissions[];
}

// password excluded here on purpose — use a separate change-password flow instead
// export class UpdateUserDto extends PartialType(
//   OmitType(CreateUserDto, ['password'] as const),
// ) {}

export class UpdatePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsEnum(EPermissions, { each: true })
  permissions: EPermissions[];
}

export class LoginUserDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  current_password: string;

  @IsString()
  @MinLength(8)
  new_password: string;
}
