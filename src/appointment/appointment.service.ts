import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Appointment } from './entity/appointment';
import { InjectRepository } from '@nestjs/typeorm';
import { IResponse } from '../../utils/common.interface';
import type { Response } from 'express';
import { ErrorCode } from '../../utils/common.enum';

import {
  assertBranchAllowedForDate,
  assertNoScheduleConflict,
  expressResponse,
  extractUser,
  formatDateTime,
} from '../../utils/common.helper';
import {
  CreateAppointmentDto,
  DeleteAppointmentDto,
  GetAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment';

import { RedisCacheService } from '../redis/redis-cach.service';

import {
  EDoctorAppointmentNotification,
  NotificationHelper,
} from '../notification/common/notification.helper';
import type {
  IAppointments,
  ICustomRequest,
} from '../../utils/common.interface';

import { APPIONMENT_TTL } from '../redis/redis.ttl';
import { EStatus } from './enum/appointment';
import { appointmentKey, appointmentsKey } from '../redis/redis.keys';
import { Patient } from '../patient/entity/patient';
import { RedisLock } from '../redis/redis.lock';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment, 'main_repo')
    private readonly appointmentRepository: Repository<Appointment>,

    @InjectRepository(Patient, 'main_repo')
    private readonly patientRepository: Repository<Patient>,
    private readonly redis: RedisCacheService,
    private readonly redisLock: RedisLock,
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
          treatmentDone: true,
          scheduledAt: true,
          noShow: true,
          patient: {
            id: true,
            name: true,
            cellphoneNumber: true,
            address: true,
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
            cellphoneNumber: appointment.patient?.cellphoneNumber ?? null,
            address: appointment.patient?.address ?? null,
          },
          branch: appointment.branch,
          treatmentDone: appointment.treatmentDone ?? null,
          noShow: appointment.noShow ? EStatus.ACTIVE : EStatus.INACTIVE,
          scheduledAt: formatDateTime(appointment.scheduledAt), // display formatting — fine here, this is output only
        });
      }

      await this.redis.set(cachekey, data, APPIONMENT_TTL);
      response.code = HttpStatus.OK;
      response.data = { code: 0, data };
    } catch (error) {
      console.error('Error fetching appointments:', error);
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

    // lock scoped to this exact branch+time slot, so two near-simultaneous
    // requests can't both pass the conflict check before either finishes saving
    const lockResource = this.redisLock.generateLock(
      'appointment-slot',
      `${dto.branch}:${dto.scheduledAt}`,
    );
    const lock = await this.redisLock.singleLock(lockResource, 5000);

    if (!lock) {
      response.data = { code: ErrorCode.SCHEDULE_CONFLICT };
      response.code = HttpStatus.CONFLICT;
      expressResponse(res, response);
      return;
    }

    try {
      const { id } = extractUser(req, dto);

      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      // enforce the 2nd Thu/Fri-of-the-month Calbayog-only rule
      assertBranchAllowedForDate(new Date(dto.scheduledAt), dto.branch);

      await assertNoScheduleConflict(
        this.appointmentRepository,
        dto.branch,
        dto.scheduledAt,
      );

      const appointment = this.appointmentRepository.create({
        patientId: dto.patientId,
        branch: dto.branch,
        scheduledAt: dto.scheduledAt, // raw ISO value — DO NOT format before persisting
        treatmentDone: dto.treatmentDone,
        debitAmount: dto.debitAmount,
        noShow: dto.noShow,
        // balance omitted — trg_appointments_recalc_balance computes it on INSERT
      });

      const saved = await this.appointmentRepository.save(appointment);

      await this.redis.del(appointmentsKey());

      const patient = await this.patientRepository.findOne({
        where: { id: saved.patientId },
        select: { name: true },
      });

      void this.notificationHelper.notifyDoctors(
        EDoctorAppointmentNotification.APPOINTMENT_CREATED,
        `New appointment for ${patient?.name ?? 'a patient'} scheduled at ${saved.branch} on ${formatDateTime(saved.scheduledAt)}.`,
        {
          branch: saved.branch,
          scheduledAt: formatDateTime(saved.scheduledAt), // display-formatted for the notification only
          patientName: patient?.name,
        },
      );

      response.data = {
        code: 0,
        data: { ...saved, scheduledAt: formatDateTime(saved.scheduledAt) },
      };
      response.code = HttpStatus.CREATED;
    } catch (error) {
      console.error('Error creating appointment:', error);

      if (error instanceof HttpException) {
        const errorResponse = error.getResponse();
        response.data =
          typeof errorResponse === 'string'
            ? { message: errorResponse }
            : (errorResponse as Record<string, any>);
        response.code = error.getStatus();
      } else {
        response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
        response.code = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    } finally {
      await this.redisLock.releaseLock(lock);
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

      // enforce the 2nd Thu/Fri-of-the-month Calbayog-only rule
      assertBranchAllowedForDate(new Date(newScheduledAt), newBranch);

      const lockResource = this.redisLock.generateLock(
        'appointment-slot',
        `${newBranch}:${newScheduledAt}`,
      );
      const lock = await this.redisLock.singleLock(lockResource, 5000);

      if (!lock) {
        response.data = { code: ErrorCode.SCHEDULE_CONFLICT };
        response.code = HttpStatus.CONFLICT;
        return;
      }

      try {
        await assertNoScheduleConflict(
          this.appointmentRepository,
          newBranch,
          newScheduledAt,
          dto.id, // exclude this appointment from conflicting with itself
        );

        const appointment: Partial<Appointment> = {
          branch: newBranch,
          scheduledAt: newScheduledAt, // raw value — not formatted
          treatmentDone: dto.treatmentDone ?? existing.treatmentDone,
          debitAmount: dto.debitAmount ?? existing.debitAmount,
          noShow:
            (dto.noShow ?? existing.noShow) ? EStatus.INACTIVE : EStatus.ACTIVE,
        };

        await this.appointmentRepository.update({ id: dto.id }, appointment);
        await this.redis.del(appointmentKey(dto.id));
        await this.redis.del(appointmentsKey());

        const patient = await this.patientRepository.findOne({
          where: { id: existing.patientId },
          select: { name: true },
        });

        void this.notificationHelper.notifyDoctors(
          EDoctorAppointmentNotification.APPOINTMENT_UPDATED,
          `Appointment for ${patient?.name ?? 'a patient'} updated — now ${newBranch} on ${formatDateTime(newScheduledAt)}.`,
          {
            branch: newBranch,
            scheduledAt: formatDateTime(newScheduledAt),
            patientName: patient?.name,
          },
        );

        response.data = {
          code: 0,
          data: {
            ...existing,
            ...appointment,
            scheduledAt: formatDateTime(newScheduledAt),
          },
        };
        response.code = HttpStatus.OK;
      } finally {
        await this.redisLock.releaseLock(lock);
      }
    } catch (error) {
      console.error('Error updating appointment:', error);

      if (error instanceof HttpException) {
        const errorResponse = error.getResponse();
        response.data =
          typeof errorResponse === 'string'
            ? { message: errorResponse }
            : (errorResponse as Record<string, any>);
        response.code = error.getStatus();
      } else {
        response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
        response.code = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    } finally {
      expressResponse(res, response);
    }
  }

  async deleteAppointment(
    dto: DeleteAppointmentDto,
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
      const patient = await this.patientRepository.findOne({
        where: { id: appointment.patientId },
        select: { name: true },
      });

      if (!patient) {
        response.data = { code: ErrorCode.APPOINTMENT_NOT_FOUND };
        response.code = HttpStatus.NOT_FOUND;
        return;
      }
      await this.appointmentRepository.delete({ id: dto.id });
      await this.redis.del(appointmentKey(dto.id));
      await this.redis.del(appointmentsKey());

      void this.notificationHelper.notifyDoctors(
        EDoctorAppointmentNotification.APPOINTMENT_DELETED,
        `Appointment ${patient.name} was canceled.`,
      );

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
