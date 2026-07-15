import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { JwtPayload } from 'src/auth/common/jwt-payload.interface';
import { ERole, ErrorCode } from 'utils/common.enum';
import { ROLES_KEY } from '../decorator/roles.decorator';

interface AuthRoleRequest extends Request {
  user?: JwtPayload | { role?: ERole };
  claims?: { role?: ERole };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<ERole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRoleRequest>();

    const user = request.user ?? request.claims;

    if (!user) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN_ROLE,
      });
    }

    const role = user.role;

    if (!role) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN_ROLE,
      });
    }

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException({});
    }

    return true;
  }
}
