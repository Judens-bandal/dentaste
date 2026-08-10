import { Body, Controller, Get, Patch } from '@nestjs/common';
import { SkipMaintenance } from './common/decorators/skip-maintenance.decorator';
import { SystemmaintenanceService } from './systemmaintenance.service';
import { UpdateMaintenanceDto } from './common/dto/update-maintenance.dto';
import { EPermissions, ERole } from '../../utils/common.enum';
import { Roles } from '../../common/commons/decorator/roles.decorator';
import { Permission } from '../../common/commons/decorator/permissions.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/commons/decorator/jwt.decorator';

@SkipMaintenance()
@Controller('maintenance')
export class SystemmaintenanceController {
  constructor(private readonly maintenanceService: SystemmaintenanceService) {}

  // Public — any client can check if maintenance is active
  @Public()
  @Get('status')
  async getPublicStatus() {
    return this.maintenanceService.getStatus();
  }

  // Admin-only — manage maintenance settings
  @ApiBearerAuth()
  @Roles(ERole.ADMIN)
  @Permission(EPermissions.MAINTENANCE_SETTINGS)
  @Get()
  async getStatus() {
    return this.maintenanceService.getStatus();
  }

  @ApiBearerAuth()
  @Roles(ERole.ADMIN)
  @Permission(EPermissions.MAINTENANCE_SETTINGS)
  @Patch()
  async update(@Body() dto: UpdateMaintenanceDto) {
    return this.maintenanceService.update(dto);
  }
}
