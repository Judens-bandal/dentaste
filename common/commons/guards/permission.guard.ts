// import {
//   CanActivate,
//   ExecutionContext,
//   ForbiddenException,
//   Injectable,
// } from '@nestjs/common';

// import { Reflector } from '@nestjs/core';

// import { PER_KEY } from '../decorator/permissions.decorator';
// import { JwtPayload } from '../../../src/auth/common/jwt-payload.interface';
// import { EPermissions, ErrorCode } from '../../../utils/common.enum';

// interface ClaimsRequest extends Request {
//   user: JwtPayload & {
//     permissions: EPermissions[];
//   };
// }

// @Injectable()
// export class PermissionGuard implements CanActivate {
//   constructor(private readonly reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const requiredClaims = this.reflector.getAllAndOverride<EPermissions[]>(
//       PER_KEY,
//       [context.getHandler(), context.getClass()],
//     );

//     if (!requiredClaims?.length) {
//       return true;
//     }

//     const request = context.switchToHttp().getRequest<ClaimsRequest>();

//     const user = request.user;

//     if (!user) {
//       throw new ForbiddenException({
//         code: ErrorCode.MISSING_AUTH_CLAIMS,
//       });
//     }

//     console.log('Required Claims:', requiredClaims);
//     console.log('User Claims:', user.permissions);

//     const hasPermissions = requiredClaims.every((claim) =>
//       user.permissions.includes(claim),
//     );

//     if (!hasPermissions) {
//       throw new ForbiddenException({
//         code: ErrorCode.FORBIDDEN_PERMISSION,
//       });
//     }

//     return true;
//   }
// }

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PER_KEY } from '../decorator/permissions.decorator';
import { EPermissions, ErrorCode } from '../../../utils/common.enum';
import { ICustomRequest } from '../../../utils/common.interface';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredClaims = this.reflector.getAllAndOverride<EPermissions[]>(
      PER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredClaims?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ICustomRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        code: ErrorCode.NO_PERMISSION,
      });
    }

    const hasPermissions = requiredClaims.every((claim) =>
      user.permissions.includes(claim),
    );

    if (!hasPermissions) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN_PERMISSION,
      });
    }

    return true;
  }
}
