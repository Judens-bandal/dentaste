import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
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
  safeParser,
  toManilaUTC,
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

import {
  EAppointmentStatus,
  EDentalService,
  isValidService,
  isValidServiceType,
} from './enum/appointment';
import {
  appointmentKey,
  appointmentsKey,
  patientRecordKey,
  patientsKey,
  paymentsKey,
  summaryVersionKey,
} from '../redis/redis.keys';
import { Patient } from '../patient/entity/patient';
import { ILock, RedisLock } from '../redis/redis.lock';
import {
  getAppointmentStatus,
  getPaymentStatus,
} from './helper/appointment.helper';
import { APPOINTMENT_TTL } from '../redis/redis.ttl';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis-con.module';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment, 'main_repo')
    private readonly appointmentRepository: Repository<Appointment>,

    @InjectRepository(Patient, 'main_repo')
    private readonly patientRepository: Repository<Patient>,
    // private readonly redis: RedisCacheService,

    @Inject(REDIS_CLIENT) private readonly redis: Redis,

    private readonly redisLock: RedisLock,
    private readonly notificationHelper: NotificationHelper,
  ) {}

  async getTotalSched(req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }
      // const cachekey = patientsKey();
      // const cached = await this.readCache<IPatient[]>(cachekey);
      // if (cached) {
      //   response.data = { code: 0, data: cached.length };
      //   response.code = HttpStatus.OK;
      //   return;
      // }
      const rows = await this.appointmentRepository
        .createQueryBuilder('appointment')
        .select('appointment.branch', 'branch')
        .addSelect('COUNT(appointment.id)', 'count')
        .where('appointment.appointment_status = :status', {
          status: EAppointmentStatus.SCHEDULED,
        })
        .groupBy('appointment.branch')
        .getRawMany<{ branch: string; count: string }>();

      const by_branch = rows.map((row) => ({
        branch: row.branch,
        count: Number(row.count),
      }));

      const data = {
        total: by_branch.reduce((sum, row) => sum + row.count, 0),
        by_branch,
      };
      // await this.writeCache(cachekey, total, PATIENT_TTL);
      response.data = { code: 0, data: data };
      response.code = HttpStatus.OK;
    } catch (error) {
      response.data = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        // message: error.message,
      };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

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
      const cached = await this.redis.get(cachekey);

      if (cached) {
        let cacheData: IAppointments[] | null = null;
        try {
          cacheData = JSON.parse(cached) as IAppointments[];
        } catch {
          await this.redis.del(cachekey);
        }

        if (Array.isArray(cacheData)) {
          const data = cacheData.map((appointment) => {
            const legacyAppointment = appointment as IAppointments & {
              amount_charger?: number;
            };
            const parsedCharge = Number(
              legacyAppointment.amount_charge ??
                legacyAppointment.amount_charger ??
                0,
            );
            const amount_charge = Number.isFinite(parsedCharge)
              ? parsedCharge
              : 0;
            const balance = Number(appointment.balance);

            return {
              ...legacyAppointment,
              amount_charge,
              balance,
              payment_status: getPaymentStatus(amount_charge, balance),
            };
          });

          response.code = HttpStatus.OK;
          response.data = { code: 0, data };
          return;
        }
      }

      const appointments = await this.appointmentRepository.find({
        relations: {
          patient: true,
        },
        select: {
          id: true,
          patient_id: true,
          branch: true,
          service: true,
          service_other: true,
          service_type: true,
          treatment_done: true,
          scheduled_at: true,
          appointment_status: true,
          amount_charge: true,
          balance: true,
          updated_at: true,
          patient: {
            // id: true,
            last_name: true,
            first_name: true,
            middle_name: true,
            cellphone_number: true,
            address: true,
            occupation: true,
            age: true,
            status: true,
          },
        },
        order: { scheduled_at: 'DESC' },
      });

      const data: IAppointments[] = [];

      for (const appointment of appointments) {
        const amount_charge = Number(appointment.amount_charge);
        const balance = Number(appointment.balance);

        data.push({
          id: appointment.id ?? null,
          patient_id: appointment.patient_id ?? null,
          patient: appointment.patient
            ? {
                last_name: appointment.patient.last_name ?? null,
                first_name: appointment.patient.first_name ?? null,
                middle_name: appointment.patient.middle_name ?? null,
                cellphone_number: appointment.patient.cellphone_number ?? null,
                address: appointment.patient.address ?? null,
                occupation: appointment.patient.occupation ?? null,
                age: appointment.patient.age ?? null,
                status: appointment.patient.status ?? null,
              }
            : null,
          branch: appointment.branch,
          service: appointment.service,
          service_other: appointment.service_other ?? null,
          service_type: appointment.service_type ?? null,
          treatment_done: appointment.treatment_done ?? null,
          scheduled_at: formatDateTime(appointment.scheduled_at),
          amount_charge,
          balance,
          appointment_status: appointment.appointment_status,
          payment_status: getPaymentStatus(amount_charge, balance),
          updated_at: appointment.updated_at
            ? formatDateTime(String(appointment.updated_at))
            : null,
        });
      }

      await this.redis.set(
        cachekey,
        JSON.stringify(data),
        'EX',
        APPOINTMENT_TTL,
      );
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

    const lockResource = this.redisLock.generateLock(
      'appointment-slot',
      'global',
    );

    let lock: ILock | undefined;

    try {
      lock = await this.redisLock.singleLock(lockResource, 5000);
    } catch (error) {
      console.error('Lock acquire failed:', error);
    }
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
      const { id } = extractUser(req);

      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const selectedService = dto.service ?? EDentalService.Other;
      const selectedCustomService = dto.service_other?.trim();

      if (!isValidService(selectedService, selectedCustomService)) {
        response.data = { code: ErrorCode.INVALID_SERVICE_TYPE };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      if (!isValidServiceType(selectedService, dto.service_type)) {
        response.data = { code: ErrorCode.INVALID_SERVICE_TYPE };
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
        scheduled_at: toManilaUTC(dto.scheduled_at),
        service: selectedService,
        service_other: selectedCustomService ?? null,
        service_type: dto.service_type ?? '',
        treatment_done: dto.treatment_done ?? '',
        amount_charge: dto.amount_charge ?? 0,
        base_charge: dto.amount_charge ?? 0,
        balance: dto.amount_charge ?? 0,
        appointment_status: dto.appointment_status,
      });

      const saved = await this.appointmentRepository.save(appointment);
      await this.invalidate({
        patient_id: dto.patient_id,
        branches: [dto.branch],
        money: true,
      });

      const patient = await this.patientRepository.findOne({
        where: { id: dto.patient_id },
        select: { last_name: true, first_name: true, middle_name: true },
      });

      void this.notificationHelper.notifyDoctors(
        EDoctorAppointmentNotification.APPOINTMENT_CREATED,
        `New appointment for ${patient?.last_name ?? 'a patient'} ${patient?.first_name ?? ''} ${patient?.middle_name ?? ''} scheduled at ${saved.branch} on ${formatDateTime(saved.scheduled_at)}.`,
        {
          branch: saved.branch,
          scheduled_at: formatDateTime(saved.scheduled_at), // display-formatted for the notification only
          patientName:
            patient?.last_name +
            ' ' +
            patient?.first_name +
            ' ' +
            (patient?.middle_name || ''),
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
      try {
        await this.redisLock.releaseLock(lock);
      } catch (error) {
        console.error('Lock release failed:', error);
      }
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
      const newService = dto.service ?? (existing.service as EDentalService);
      const newServiceType =
        dto.service_type !== undefined
          ? dto.service_type
          : existing.service_type;
      const newServiceOther =
        dto.service_other !== undefined
          ? dto.service_other.trim()
          : (existing.service_other?.trim() ?? undefined);

      if (!isValidService(newService, newServiceOther)) {
        response.data = { code: ErrorCode.INVALID_SERVICE_TYPE };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      // validate service_type belongs to the chosen service's mini-enum
      if (
        !isValidServiceType(
          newService || undefined,
          newServiceType || undefined,
        )
      ) {
        response.data = { code: ErrorCode.INVALID_SERVICE_TYPE };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

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

      let lock: ILock | undefined;

      try {
        lock = await this.redisLock.singleLock(lockResource, 5000);
      } catch (error) {
        console.error('Lock acquire failed:', error);
      }

      if (!lock) {
        response.data = { code: ErrorCode.LOCK_BUSY };
        response.code = HttpStatus.CONFLICT;
        expressResponse(res, response);
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
        if (existing.patient_id) {
          await assertNoPatientScheduleConflict(
            this.appointmentRepository,
            existing.patient_id,
            newScheduledAt,
            dto.id,
          );
        }

        const newAmountCharge = dto.amount_charge ?? existing.amount_charge;
        const newBaseCharge =
          dto.amount_charge !== undefined
            ? dto.amount_charge
            : existing.base_charge;
        const newBalance =
          dto.amount_charge !== undefined
            ? Number(existing.balance) +
              (dto.amount_charge - Number(existing.amount_charge))
            : existing.balance;
        const newAppointmentStatus =
          dto.appointment_status ??
          (existing.appointment_status === EAppointmentStatus.COMPLETED &&
          newBalance > 0
            ? EAppointmentStatus.SCHEDULED
            : existing.appointment_status);

        const appointment: Partial<Appointment> = {
          branch: newBranch,
          scheduled_at: newScheduledAt, // raw value — not formatted
          service: newService ?? '',
          service_other: newServiceOther ?? null,
          service_type: newServiceType ?? '',
          treatment_done:
            dto.treatment_done !== undefined
              ? dto.treatment_done
              : (existing.treatment_done ?? ''),
          amount_charge: newAmountCharge,
          base_charge: newBaseCharge,
          balance: newBalance,
          appointment_status: newAppointmentStatus,
        };

        await this.appointmentRepository.update({ id: dto.id }, appointment);
        // await this.redis.del(appointmentKey(dto.id));
        // await this.redis.del(appointmentsKey());
        // await this.redis.del(patientsKey());
        await this.invalidate({
          id: dto.id,
          patient_id: existing.patient_id,
          branches: [existing.branch, newBranch],
          money: true,
        });
        const patient = existing.patient_id
          ? await this.patientRepository.findOne({
              where: { id: existing.patient_id },
              select: {
                last_name: true,
                first_name: true,
                middle_name: true,
              },
            })
          : null;

        void this.notificationHelper.notifyDoctors(
          EDoctorAppointmentNotification.APPOINTMENT_UPDATED,
          `Appointment for ${patient?.last_name ?? 'a patient'} ${patient?.first_name ?? ''} ${patient?.middle_name ?? ''} updated — now ${newBranch} on ${formatDateTime(newScheduledAt)}.`,
          {
            branch: newBranch,
            scheduledAt: formatDateTime(newScheduledAt),
            patientName:
              patient?.last_name +
              ' ' +
              patient?.first_name +
              ' ' +
              (patient?.middle_name || ''),
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
        try {
          await this.redisLock.releaseLock(lock);
        } catch (error) {
          console.error('Lock release failed:', error);
        }
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
      const patient = appointment.patient_id
        ? await this.patientRepository.findOne({
            where: { id: appointment.patient_id },
            select: {
              last_name: true,
              first_name: true,
              middle_name: true,
            },
          })
        : null;
      await this.appointmentRepository.delete({ id: dto.id });
      await this.invalidate({
        id: dto.id,
        patient_id: appointment.patient_id,
        branches: [appointment.branch],
        money: true,
      });

      void this.notificationHelper.notifyDoctors(
        EDoctorAppointmentNotification.APPOINTMENT_DELETED,
        `Appointment ${patient?.last_name ?? 'for an unassigned patient'} ${patient?.first_name ?? ''} ${patient?.middle_name || ''} was canceled.`,
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

      await this.invalidate({
        id: dto.id,
        patient_id: existing.patient_id,
      });

      const patient = existing.patient_id
        ? await this.patientRepository.findOne({
            where: { id: existing.patient_id },
            select: {
              last_name: true,
              first_name: true,
              middle_name: true,
            },
          })
        : null;

      void this.notificationHelper.notifyDoctors(
        EDoctorAppointmentNotification.APPOINTMENT_UPDATED,
        `Appointment for ${patient?.last_name ?? 'a patient'} ${patient?.first_name ?? ''} ${patient?.middle_name ?? ''} marked as ${dto.appointment_status}.`,
        {
          // appointmentId: dto.id,
          appointmentStatus: dto.appointment_status,
          patientName:
            patient?.last_name +
            ' ' +
            patient?.first_name +
            ' ' +
            (patient?.middle_name || ''),
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

  private async invalidate(a: {
    id?: Appointment['id'];
    patient_id?: Appointment['patient_id'] | null;
    branches?: Appointment['branch'][];
    money?: boolean;
  }) {
    try {
      const p = this.redis.pipeline();
      p.del(appointmentsKey());
      p.del(patientsKey());
      if (a.id) p.del(appointmentKey(a.id));
      if (a.patient_id) p.del(patientRecordKey(a.patient_id));
      if (a.money) {
        p.del(paymentsKey());
        for (const b of new Set(a.branches ?? [])) p.incr(summaryVersionKey(b));
        p.incr(summaryVersionKey());
      }
      const results = await p.exec();
      results?.forEach(([err], i) => {
        if (err) console.error(`Redis invalidate cmd ${i} failed:`, err);
      });
    } catch (error) {
      console.error('Redis invalidation failed:', error);
    }
  }
}
