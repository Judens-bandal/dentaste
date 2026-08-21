import { HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'express';
import { ToothRecord } from './entity/tooth-record';
import { ICustomRequest, IResponse } from '../../utils/common.interface';
import { ErrorCode } from '../../utils/common.enum';
import { expressResponse, extractUser } from '../../utils/common.helper';
import { UpsertToothRecordDto, GetToothRecordsDto } from './dto/tooth-record';
import { toothRecordsKey } from '../redis/redis.keys';
import { RedisCacheService } from '../redis/redis-cach.service';
import {
  EDoctorNotification,
  NotificationHelper,
} from '../notification/common/notification.helper';
import { PATIENT_TTL } from '../redis/redis.ttl';

@Injectable()
export class ToothRecordsService {
  constructor(
    @InjectRepository(ToothRecord, 'main_repo')
    private readonly toothRecordRepository: Repository<ToothRecord>,
    private readonly redis: RedisCacheService,
    private readonly notificationHelper: NotificationHelper,
  ) {}

  async getByPatient(
    dto: GetToothRecordsDto,
    req: ICustomRequest,
    res: Response,
  ) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const cachekey = toothRecordsKey(dto.patient_id);
      const cacheData = await this.redis.get<ToothRecord[]>(cachekey);
      if (cacheData) {
        response.data = { code: 0, data: cacheData };
        response.code = HttpStatus.OK;
        return;
      }

      const records = await this.toothRecordRepository.find({
        where: { patient_id: dto.patient_id },
      });

      await this.redis.set(cachekey, records, PATIENT_TTL);

      response.data = { code: 0, data: records };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error fetching tooth records:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async upsert(dto: UpsertToothRecordDto, req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const existing = await this.toothRecordRepository.findOne({
        where: { patient_id: dto.patient_id, tooth_number: dto.tooth_number },
      });

      // condition omitted/null → clear the tooth (delete the row if it exists)
      if (!dto.condition) {
        if (existing)
          await this.toothRecordRepository.delete({ id: existing.id });
        await this.redis.del(toothRecordsKey(dto.patient_id));
        response.data = { code: 0, data: null };
        response.code = HttpStatus.OK;
        return;
      }

      let record: ToothRecord;
      if (existing) {
        await this.toothRecordRepository.update(
          { id: existing.id },
          { condition: dto.condition, remarks: dto.remarks ?? null },
        );
        record = {
          ...existing,
          condition: dto.condition,
          remarks: dto.remarks ?? null,
        };
      } else {
        record = this.toothRecordRepository.create({
          patient_id: dto.patient_id,
          tooth_number: dto.tooth_number,
          condition: dto.condition,
          remarks: dto.remarks ?? null,
        });
        await this.toothRecordRepository.save(record);
      }

      await this.redis.del(toothRecordsKey(dto.patient_id));

      void this.notificationHelper.notifyDoctor(
        id,
        EDoctorNotification.TOOTH_RECORD_UPDATED,
        `Tooth ${dto.tooth_number} was updated.`,
      );

      response.data = { code: 0, data: record };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error upserting tooth record:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }
}
