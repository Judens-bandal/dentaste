import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SKIP_MAINTENANCE_KEY } from '../decorators/skip-maintenance.decorator';
import { MAINTENANCE_WHITELIST } from '../maintenance.constants';
import { SystemmaintenanceService } from '../../systemmaintenance.service';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  private readonly logger = new Logger(MaintenanceGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly maintenanceService: SystemmaintenanceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    /**
     * Skip @SkipMaintenance()
     */
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_MAINTENANCE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const path = request.path;

    /**
     * Whitelist
     */
    if (MAINTENANCE_WHITELIST.some((route) => path.startsWith(route))) {
      return true;
    }

    /**
     * Current maintenance status
     */
    const status = await this.maintenanceService.getStatus();

    this.logger.debug({
      path,
      maintenance: status,
    });

    /**
     * enabled = 1 means ONLINE
     */
    if (status.enabled === 1) {
      return true;
    }

    /**
     * enabled = 0 means MAINTENANCE
     */
    const now = new Date();

    const from = status.date_from ? new Date(status.date_from) : null;

    const to = status.date_to ? new Date(status.date_to) : null;

    /**
     * Invalid dates
     */
    if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
      this.logger.warn('Invalid maintenance schedule. Blocking requests.');

      throw new ServiceUnavailableException({
        success: false,
        statusCode: 503,
        message: status.message ?? 'System is under maintenance.',
      });
    }

    /**
     * Before maintenance starts
     */
    if (from && now < from) {
      return true;
    }

    /**
     * Maintenance ended
     */
    if (to && now > to) {
      await this.maintenanceService.disable();
      return true;
    }

    /**
     * Active maintenance
     */
    throw new ServiceUnavailableException({
      success: false,
      statusCode: 503,
      message: status.message ?? 'System is currently under maintenance.',
      date_from: status.date_from,
      date_to: status.date_to,
    });
  }
}
