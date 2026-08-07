import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisCacheService } from '../redis/redis-cach.service';
import { MAINTENANCE_KEY } from './common/maintenance.constants';
import { json } from 'express';

export interface MaintenanceStatus {
  enabled: 0 | 1;
  message?: string;
  date_from?: string;
  date_to?: string;
}

@Injectable()
export class SystemmaintenanceService {
  constructor(private readonly redis: RedisCacheService) {}

  async enable(dto: MaintenanceStatus) {
    if (!dto.date_from || !dto.date_to) {
      throw new BadRequestException('date_from and date_to are required.');
    }

    const from = new Date(dto.date_from);
    const to = new Date(dto.date_to);

    if (from >= to) {
      throw new BadRequestException('date_from must be earlier than date_to.');
    }

    const payload: MaintenanceStatus = {
      enabled: 0, // Maintenance
      message: dto.message ?? 'System is currently under maintenance.',
      date_from: dto.date_from,
      date_to: dto.date_to,
    };

    await this.redis.set(MAINTENANCE_KEY, JSON.stringify(payload));

    return payload;
  }

  async disable() {
    const payload: MaintenanceStatus = {
      enabled: 1,
    };

    await this.redis.set(MAINTENANCE_KEY, JSON.stringify(payload));

    return payload;
  }

  async update(dto: MaintenanceStatus) {
    if (dto.enabled === 1) {
      return this.disable();
    }

    return this.enable(dto);
  }
  async getStatus(): Promise<MaintenanceStatus> {
    const cache = await this.redis.get(MAINTENANCE_KEY);

    if (!cache) {
      return {
        enabled: 1,
      };
    }

    return JSON.parse(cache as string) as MaintenanceStatus;
  }

  async isMaintenanceActive(): Promise<boolean> {
    const status = await this.getStatus();

    // enabled = 1 means system is available
    if (status.enabled === 1) {
      return false;
    }

    const now = new Date();

    const from = new Date(status.date_from!);
    const to = new Date(status.date_to!);

    if (now > to) {
      await this.disable();
      return false;
    }

    return now >= from && now <= to;
  }
}
