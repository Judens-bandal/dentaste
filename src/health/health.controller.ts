import { Controller, Get, Logger, UseInterceptors } from '@nestjs/common';
import { HealthLoggingInterceptor } from './common/dd.logging';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Public } from '../../common/commons/decorator/jwt.decorator';

@Controller('health')
@UseInterceptors(HealthLoggingInterceptor)
// @ApiBearerAuth()
// @SkipThrottle({ default: false })
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private configService: ConfigService,
    @InjectDataSource('main_repo')
    private dataSource: DataSource,
  ) {}

  @Get()
  @HealthCheck()
  @Public()
  check() {
    return this.health.check([
      () =>
        this.db.pingCheck(this.configService.get('DB_DATABASE') ?? 'System', {
          connection: this.dataSource,
        }),
    ]);
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async logHealthStatus() {
    const result = await this.health.check([
      () =>
        this.db.pingCheck(this.configService.get('DB_DATABASE') ?? 'System', {
          connection: this.dataSource,
        }),
    ]);
    this.logger.log(`Health status: ${result.status}`);
  }
}
