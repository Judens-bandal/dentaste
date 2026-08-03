import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Appointment } from './entity/appointment';
import { InjectRepository } from '@nestjs/typeorm';
import { IResponse } from '../../utils/common.interface';
import type { Response } from 'express';
import { ErrorCode } from '../../utils/common.enum';

import {
  assertBranchAllowedForDate,
  assertNoPatientScheduleConflict,
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
  UpdateAppointmentStatusDto,
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

import { EAppointmentStatus, EStatus } from './enum/appointment';
import { appointmentKey, appointmentsKey } from '../redis/redis.keys';
import { Patient } from '../patient/entity/patient';
import { ILock, RedisLock } from '../redis/redis.lock';
import {
  getAppointmentStatus,
  getPaymentStatus,
} from './helper/appointment.helper';
import { APPOINTMENT_TTL } from '../redis/redis.ttl';

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
          treatment_done: true,
          scheduled_at: true,
          appointment_status: true,
          debit_amount: true,
          balance: true,
          patient: {
            // id: true,
            name: true,
            cellphone_number: true,
            address: true,
            occupation: true,
            age: true,
          },
        },
        order: { scheduled_at: 'DESC' },
      });

      const data: IAppointments[] = [];

      for (const appointment of appointments) {
        const debit_amount = Number(appointment.debit_amount);
        const balance = Number(appointment.balance);

        data.push({
          id: appointment.id ?? null,
          patient: {
            name: appointment.patient?.name ?? null,
            cellphone_number: appointment.patient?.cellphone_number ?? null,
            address: appointment.patient?.address ?? null,
            occupation: appointment.patient?.occupation ?? null,
            age: appointment.patient?.age ?? null,
          },
          branch: appointment.branch,
          treatment_done: appointment.treatment_done ?? null,
          scheduled_at: formatDateTime(appointment.scheduled_at),
          debit_amount,
          balance,
          appointment_status: appointment.appointment_status,
          payment_status: getPaymentStatus(debit_amount, balance), // ← fixed: use the Number()-converted locals
        });
      }

      await this.redis.set(cachekey, data, APPOINTMENT_TTL);
      response.code = HttpStatus.OK;
      response.data = { code: 0, data };
    } catch (error) {
      console.error('Error fetching appointments:', error);

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

  async addAppointment(
    dto: CreateAppointmentDto,
    req: ICustomRequest,
    res: Response,
  ) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    // lock scoped to the BRANCH only (not branch+exact-time) — this matches
    // assertNoScheduleConflict's +/- 30 minute buffer window. A lock keyed to
    // the exact timestamp would let two requests 15 minutes apart both pass
    // the conflict check in parallel, since they'd acquire different lock
    // keys despite being a real conflict under the buffer rule.
    const lockResource = this.redisLock.generateLock(
      'appointment-slot',
      'global',
    );
    // const lock = await this.redisLock.singleLock(lockResource, 5000);
    const lock: ILock | undefined = await this.redisLock.singleLock(
      lockResource,
      5000,
    );

    if (!lock) {
      // distinct from ErrorCode.SCHEDULE_CONFLICT — this means "someone else
      // is mid-booking at this branch right now, retry shortly", not "this
      // slot is confirmed already taken" (that's the DB-level check below)
      response.data = { code: ErrorCode.LOCK_BUSY };
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
      assertBranchAllowedForDate(new Date(dto.scheduled_at), dto.branch);

      await assertNoScheduleConflict(
        this.appointmentRepository,
        dto.branch,
        dto.scheduled_at,
      );

      // separate check: same patient can't be at ANY branch at an
      // overlapping time, even if each branch individually has room
      await assertNoPatientScheduleConflict(
        this.appointmentRepository,
        dto.patient_id,
        dto.scheduled_at,
      );

      const appointment = this.appointmentRepository.create({
        patient_id: dto.patient_id,
        branch: dto.branch,
        scheduled_at: dto.scheduled_at, // raw ISO value — DO NOT format before persisting
        treatment_done: dto.treatment_done,
        debit_amount: dto.debit_amount,
        appointment_status: dto.appointment_status,
        // balance omitted — trg_appointments_recalc_balance computes it on INSERT
      });

      const saved = await this.appointmentRepository.save(appointment);

      await this.redis.del(appointmentsKey());

      const patient = await this.patientRepository.findOne({
        where: { id: saved.patient_id },
        select: { name: true },
      });

      void this.notificationHelper.notifyDoctors(
        EDoctorAppointmentNotification.APPOINTMENT_CREATED,
        `New appointment for ${patient?.name ?? 'a patient'} scheduled at ${saved.branch} on ${formatDateTime(saved.scheduled_at)}.`,
        {
          branch: saved.branch,
          scheduled_at: formatDateTime(saved.scheduled_at), // display-formatted for the notification only
          patientName: patient?.name,
        },
      );

      response.data = {
        code: 0,
        data: { ...saved, scheduled_at: formatDateTime(saved.scheduled_at) },
      };
      response.code = HttpStatus.CREATED;
    } catch (error) {
      // console.error('Error creating appointment:', error);

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

      const newScheduledAt = dto.scheduled_at ?? existing.scheduled_at;
      const newBranch = dto.branch ?? existing.branch;

      // enforce the 2nd Thu/Fri-of-the-month Calbayog-only rule
      assertBranchAllowedForDate(new Date(newScheduledAt), newBranch);

      // lock scoped to the BRANCH only (not branch+exact-time) — matches
      // assertNoScheduleConflict's +/- 30 minute buffer window, same as
      // addAppointment. A lock keyed to the exact timestamp would let two
      // requests 15 minutes apart both pass the conflict check in parallel.
      const lockResource = this.redisLock.generateLock(
        'appointment-slot',
        'global',
      );
      const lock: ILock | undefined = await this.redisLock.singleLock(
        lockResource,
        5000,
      );

      if (!lock) {
        // distinct from SCHEDULE_CONFLICT — this means "someone else is
        // mid-booking/rescheduling at this branch right now", not "this
        // slot is confirmed already taken" (that's the DB-level check below)
        response.data = { code: ErrorCode.LOCK_BUSY };
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

        // separate check: same patient can't be at ANY branch at an
        // overlapping time, even if each branch individually has room.
        // Was missing here entirely — addAppointment already had it.
        await assertNoPatientScheduleConflict(
          this.appointmentRepository,
          existing.patient_id,
          newScheduledAt,
          dto.id,
        );

        const appointment: Partial<Appointment> = {
          branch: newBranch,
          scheduled_at: newScheduledAt, // raw value — not formatted
          treatment_done: dto.treatment_done ?? existing.treatment_done,
          debit_amount: dto.debit_amount ?? existing.debit_amount,
          appointment_status:
            dto.appointment_status ?? existing.appointment_status,
        };

        await this.appointmentRepository.update({ id: dto.id }, appointment);
        await this.redis.del(appointmentKey(dto.id));
        await this.redis.del(appointmentsKey());

        const patient = await this.patientRepository.findOne({
          where: { id: existing.patient_id },
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
        where: { id: appointment.patient_id },
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

  async updateAppointmentStatus(
    dto: UpdateAppointmentStatusDto,
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

      // COMPLETED is trigger-driven (flips automatically once balance <= 0
      // via recalc_payment_appointment_balance) — never settable directly,
      // or someone could mark an unpaid appointment "completed" and bypass
      // payment tracking entirely.
      if (dto.appointment_status === EAppointmentStatus.COMPLETED) {
        response.data = { code: ErrorCode.STATUS_NOT_MANUALLY_SETTABLE };
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

      await this.appointmentRepository.update(
        { id: dto.id },
        { appointment_status: dto.appointment_status },
      );

      await this.redis.del(appointmentKey(dto.id));
      await this.redis.del(appointmentsKey());

      const patient = await this.patientRepository.findOne({
        where: { id: existing.patient_id },
        select: { name: true },
      });

      void this.notificationHelper.notifyDoctors(
        EDoctorAppointmentNotification.APPOINTMENT_UPDATED,
        `Appointment for ${patient?.name ?? 'a patient'} marked as ${dto.appointment_status}.`,
        {
          // appointmentId: dto.id,
          appointmentStatus: dto.appointment_status,
          patientName: patient?.name,
        },
      );

      response.data = {
        code: 0,
        data: { ...existing, appointmentStatus: dto.appointment_status },
      };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error updating appointment status:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }
}
