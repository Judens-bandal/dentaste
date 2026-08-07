import { Body, Controller, Get, Patch } from '@nestjs/common';
import { SkipMaintenance } from './common/decorators/skip-maintenance.decorator';
import { SystemmaintenanceService } from './systemmaintenance.service';
import { UpdateMaintenanceDto } from './common/dto/update-maintenance.dto';
import { EPermissions, ERole } from '../../utils/common.enum';
import { Roles } from '../../common/commons/decorator/roles.decorator';
import { Permission } from '../../common/commons/decorator/permissions.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@SkipMaintenance()
@Roles(ERole.ADMIN)
@Permission(EPermissions.MAINTENANCE_SETTINGS)
@Controller('admin/maintenance')
export class SystemmaintenanceController {
  constructor(private readonly maintenanceService: SystemmaintenanceService) {}

  @Get()
  async getStatus() {
    return this.maintenanceService.getStatus();
  }

  @Patch()
  async update(
    @Body()
    dto: UpdateMaintenanceDto,
  ) {
    return this.maintenanceService.update(dto);
  }
}
