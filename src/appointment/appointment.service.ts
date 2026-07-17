import { HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Appointment } from './entity/appointment';
import { InjectRepository } from '@nestjs/typeorm';
import { IResponse } from '../../utils/common.interface';
import type { Response } from 'express';
import { ErrorCode } from '../../utils/common.enum';
import {
  assertBranchAllowedForDate,
  expressResponse,
  extractUser,
  formatDateTime,
} from '../../utils/common.helper';
import {
  CreateAppointmentDto,
  GetAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment';

import { RedisCacheService } from '../redis/redis-cach.service';
import { NotificationHelper } from '../notification/common/notification.helper';
import type {
  IAppointments,
  ICustomRequest,
} from '../../utils/common.interface';
// import { APPOINTMENT_TTL } from '../redis/redis.ttl';

import { APPIONMENT_TTL } from '../redis/redis.ttl';
import { EStatus } from './enum/appointment';
import { appointmentKey, appointmentsKey } from '../redis/redis.keys';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment, 'main_repo')
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly redis: RedisCacheService,
    private readonly notificationHelper: NotificationHelper,
  ) {}

  async getAllAppointments(
    dto: GetAppointmentDto,
    req: ICustomRequest,
    res: Response,
  ) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req, dto);
      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const cachekey = appointmentsKey();
      const cacheData = await this.redis.get<IAppointments[]>(cachekey);
      if (cacheData) {
        response.code = HttpStatus.OK;
        response.data = { code: 0, data: cacheData };
        return;
      }

      const appointments = await this.appointmentRepository.find({
        relations: {
          patient: true,
        },
        select: {
          id: true,
          branch: true,
          scheduledAt: true,
          patient: {
            id: true,
            name: true,
          },
        },
        order: { scheduledAt: 'DESC' },
      });

      const data: IAppointments[] = [];

      for (const appointment of appointments) {
        data.push({
          id: appointment.id ?? null,
          patient: {
            name: appointment.patient?.name ?? null,
          },
          branch: appointment.branch,
          scheduledAt: formatDateTime(appointment.scheduledAt),
        });
      }

      await this.redis.set(cachekey, data, APPIONMENT_TTL);
      response.code = HttpStatus.OK;
      response.data = { code: 0, data };
    } catch (error) {
      //   errorLog(`CATCH: getAllAppointments`, {
      //     catch_error: extractError(error),
      //   });
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async addAppointment(
    dto: CreateAppointmentDto,
    req: ICustomRequest,
    res: Response,
  ) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req, dto);

      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      // enforce the 2nd Thu/Fri-of-the-month Calbayog-only rule
      assertBranchAllowedForDate(new Date(dto.scheduledAt), dto.branch);

      const appointment = this.appointmentRepository.create({
        patientId: dto.id,
        branch: dto.branch,
        scheduledAt: dto.scheduledAt,
        treatmentDone: dto.treatmentDone,
        debitAmount: dto.debitAmount,
        // balance omitted — trg_appointments_recalc_balance computes it on INSERT
      });

      const saved = await this.appointmentRepository.save(appointment);

      await this.redis.del(appointmentsKey());

      //   void this.notificationHelper.notifyAdmins(
      //     'APPOINTMENT_CREATED',
      //     `New appointment scheduled at ${dto.branch} on ${formatDateTime(dto.scheduledAt)}`,
      //     { id: saved.id },
      //   );

      response.data = {
        code: 0,
        data: {
          ...saved,
          scheduledAt: formatDateTime(saved.scheduledAt),
        },
      };
      response.code = HttpStatus.CREATED;
    } catch (error) {
      console.error('Error creating appointment:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }
  async updateAppointment(
    dto: UpdateAppointmentDto,
    req: ICustomRequest,
    res: Response,
  ) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req, dto);

      if (!id) {
        response.data = { code: ErrorCode.NO_PERMISSION };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const existing = await this.appointmentRepository.findOne({
        where: { id: dto.id },
      });

      if (!existing) {
        response.data = { code: ErrorCode.APPOINTMENT_NOT_FOUND };
        response.code = HttpStatus.NOT_FOUND;
        return;
      }

      const newScheduledAt = dto.scheduledAt ?? existing.scheduledAt;
      const newBranch = dto.branch ?? existing.branch;
      assertBranchAllowedForDate(new Date(newScheduledAt), newBranch);

      const appointment: Partial<Appointment> = {
        branch: newBranch,
        scheduledAt: newScheduledAt,
        treatmentDone: dto.treatmentDone ?? existing.treatmentDone,
        debitAmount: dto.debitAmount ?? existing.debitAmount,
        noShow:
          (dto.noShow ?? existing.noShow) ? EStatus.ACTIVE : EStatus.INACTIVE,
      };

      await this.appointmentRepository.update({ id: dto.id }, appointment);
      await this.redis.del(appointmentKey(dto.id));
      await this.redis.del(appointmentsKey());

      //   void this.notificationHelper.notifyAdmins(
      //     'APPOINTMENT_UPDATED',
      //     `Appointment updated (now ${newScheduledAt}, ${newBranch})`,
      //     { id: dto.id },
      //   );

      response.data = { code: 0, data: appointment };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error updating appointment:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async deleteAppointment(
    dto: GetAppointmentDto,
    req: ICustomRequest,
    res: Response,
  ) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req, dto);

      if (!id) {
        response.data = { code: ErrorCode.NO_PERMISSION };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const appointment = await this.appointmentRepository.findOne({
        where: { id: dto.id },
      });

      if (!appointment) {
        response.data = { code: ErrorCode.APPOINTMENT_NOT_FOUND };
        response.code = HttpStatus.NOT_FOUND;
        return;
      }

      await this.appointmentRepository.delete({ id: dto.id });
      await this.redis.del(appointmentKey(id));
      await this.redis.del(appointmentsKey());

      response.data = { code: 0 };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }
}
