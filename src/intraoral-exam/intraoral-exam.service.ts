import { HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'express';

import { IntraoralExam } from './entity/intraoral-exam';
import { ICustomRequest, IResponse } from '../../utils/common.interface';
import { ErrorCode } from '../../utils/common.enum';
import { expressResponse, extractUser } from '../../utils/common.helper';
import {
  UpsertToothRecordDto,
  GetToothRecordsDto,
  CreateIntraoralExamDto,
  GetIntraoralExamDto,
} from './dto/intraoral-exam';
import { toothRecordsKey, intraoralExamsKey } from '../redis/redis.keys';
import { RedisCacheService } from '../redis/redis-cach.service';
import {
  EDoctorNotification,
  NotificationHelper,
} from '../notification/common/notification.helper';
import { PATIENT_TTL } from '../redis/redis.ttl';
import { ToothRecord } from 'src/tooth-records/entity/tooth-record';

@Injectable()
export class IntraoralExamService {
  constructor(
    @InjectRepository(ToothRecord, 'main_repo')
    private readonly toothRecordRepository: Repository<ToothRecord>,
    @InjectRepository(IntraoralExam, 'main_repo')
    private readonly intraoralExamRepository: Repository<IntraoralExam>,
    private readonly redis: RedisCacheService,
    private readonly notificationHelper: NotificationHelper,
  ) {}

  async getToothRecords(
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

  async upsertToothRecord(
    dto: UpsertToothRecordDto,
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

      const existing = await this.toothRecordRepository.findOne({
        where: { patient_id: dto.patient_id, tooth_number: dto.tooth_number },
      });

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

  async getExams(dto: GetIntraoralExamDto, req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const cachekey = intraoralExamsKey(dto.patient_id);
      const cacheData = await this.redis.get<IntraoralExam[]>(cachekey);
      if (cacheData) {
        response.data = { code: 0, data: cacheData };
        response.code = HttpStatus.OK;
        return;
      }

      const exams = await this.intraoralExamRepository.find({
        where: { patient_id: dto.patient_id },
        order: { created_at: 'DESC' },
      });
      await this.redis.set(cachekey, exams, PATIENT_TTL);

      response.data = { code: 0, data: exams };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error fetching intraoral exams:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async createExam(
    dto: CreateIntraoralExamDto,
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

      const exam = this.intraoralExamRepository.create({
        patient_id: dto.patient_id,
        exam_date: dto.exam_date,
        periodontal: dto.periodontal ?? null,
        occlusion: dto.occlusion ?? null,
        appliances: dto.appliances ?? null,
        appliances_other: dto.appliances_other ?? null,
        tmd: dto.tmd ?? null,
        xray_taken: dto.xray_taken ?? null,
        xray_periapical_teeth: dto.xray_periapical_teeth ?? null,
        xray_others: dto.xray_others ?? null,
        tooth_records: dto.tooth_records ?? null,
      });
      await this.intraoralExamRepository.save(exam);
      await this.redis.del(intraoralExamsKey(dto.patient_id));

      void this.notificationHelper.notifyDoctor(
        id,
        EDoctorNotification.INTRAORAL_EXAM_CREATED,
        'An intraoral exam was recorded.',
      );

      response.data = { code: 0, data: exam };
      response.code = HttpStatus.CREATED;
    } catch (error) {
      console.error('Error creating intraoral exam:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async deleteExam(id: string, req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id: userId } = extractUser(req);
      if (!userId) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const exam = await this.intraoralExamRepository.findOne({
        where: { id },
      });
      if (!exam) {
        response.data = { code: 0 };
        response.code = HttpStatus.NOT_FOUND;
        return;
      }

      await this.intraoralExamRepository.delete({ id });
      await this.redis.del(intraoralExamsKey(exam.patient_id));

      response.data = { code: 0 };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error deleting intraoral exam:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }
}
