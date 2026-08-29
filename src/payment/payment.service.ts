// payments/payment.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Response } from 'express';
import { Payment } from './entity/payment';
import { Appointment } from '../appointment/entity/appointment';
import { Patient } from '../patient/entity/patient';

import {
  IAnnualTotalReceived,
  IBranchTotalReceived,
  ICustomRequest,
  IFullyPaidAppointmentsTotal,
  IPatient,
  IPayment,
  IResponse,
  ITotalReceivedByBranch,
  ITotalReceivedPayments,
} from '../../utils/common.interface';
import { ErrorCode } from '../../utils/common.enum';
import {
  expressResponse,
  extractUser,
  formatDateTime,
  getYearDateRange,
  rangeValidator,
} from '../../utils/common.helper';
import {
  appointmentKey,
  appointmentsKey,
  paymentsKey,
  totalReceivedKey,
} from '../redis/redis.keys';
import { RedisCacheService } from '../redis/redis-cach.service';
import {
  EDoctorNotification,
  NotificationHelper,
} from '../notification/common/notification.helper';
import {
  CreatePaymentDto,
  GetAnnualSummaryDto,
  GetPaymentDto,
  GetTotalPaymentsDto,
} from './dto/payment';
import { EAppointmentStatus, EBranch } from '../appointment/enum/appointment';
import { PATIENT_TTL, PAYMENTS_TTL } from '../redis/redis.ttl';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment, 'main_repo')
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(Patient, 'main_repo')
    private readonly patientRepository: Repository<Patient>,

    @InjectDataSource('main_repo')
    private readonly dataSource: DataSource,

    private readonly redis: RedisCacheService,
    private readonly notificationHelper: NotificationHelper,
  ) {}

  async createPayment(
    dto: CreatePaymentDto,
    req: ICustomRequest,
    res: Response,
  ) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // pessimistic_write locks this appointment row until commit/rollback —
        // if two payments for the SAME appointment arrive at nearly the same
        // instant, the second one blocks here until the first transaction
        // finishes, so it re-reads the balance AFTER the first payment
        // actually landed, instead of both racing off a stale read.
        const appointment = await queryRunner.manager.findOne(Appointment, {
          where: { id: dto.appointment_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!appointment) {
          await queryRunner.rollbackTransaction();
          response.data = { code: ErrorCode.APPOINTMENT_NOT_FOUND };
          response.code = HttpStatus.NOT_FOUND;
          return;
        }

        const currentBalance = Number(appointment.balance);

        if (dto.amount_paid > currentBalance) {
          await queryRunner.rollbackTransaction();
          response.data = {
            code: ErrorCode.PAYMENT_EXCEEDS_BALANCE,
            message: `Payment of ${dto.amount_paid} exceeds the remaining balance of ${currentBalance}.`,
          };
          response.code = HttpStatus.BAD_REQUEST;
          return;
        }

        const payment = queryRunner.manager.create(Payment, {
          appointment_id: dto.appointment_id,
          mode: dto.mode,
          amount_paid: dto.amount_paid,
          date_paid: dto.date_paid,
        });

        const saved = await queryRunner.manager.save(payment);

        const newBalance = Number(appointment.balance) - dto.amount_paid;
        const appointmentUpdate: Partial<Appointment> = {
          balance: newBalance,
        };

        if (
          appointment.appointment_status !== EAppointmentStatus.NO_SHOW &&
          appointment.appointment_status !== EAppointmentStatus.CANCELLED
        ) {
          appointmentUpdate.appointment_status =
            newBalance <= 0
              ? EAppointmentStatus.COMPLETED
              : appointment.appointment_status === EAppointmentStatus.COMPLETED
                ? EAppointmentStatus.SCHEDULED
                : appointment.appointment_status;
        }

        await queryRunner.manager.update(
          Appointment,
          { id: dto.appointment_id },
          appointmentUpdate,
        );

        await queryRunner.commitTransaction();

        // cache invalidation happens AFTER commit — otherwise a request
        // hitting the cache mid-transaction could re-populate it with the
        // pre-payment balance before the commit actually lands.
        // paymentsKey() was previously missing here — without it, getPayments()
        // would keep serving a stale list (missing this new payment) until
        // PAYMENTS_TTL expired naturally.
        await this.redis.del(appointmentKey(dto.appointment_id));
        await this.redis.del(appointmentsKey());
        await this.redis.del(paymentsKey());

        const patient = await this.patientRepository.findOne({
          where: { id: appointment.patient_id },
          select: { last_name: true, first_name: true, middle_name: true },
        });

        void this.notificationHelper.notifyDoctors(
          EDoctorNotification.PAYMENT_RECEIVED,
          `Payment of ${dto.amount_paid} (${dto.mode}) received for ${patient?.last_name ?? 'a patient'}.`,
          {
            appointmentId: dto.appointment_id,
            amountPaid: dto.amount_paid,
            mode: dto.mode,
            patientName:
              patient?.last_name +
              ' ' +
              patient?.first_name +
              ' ' +
              (patient?.middle_name || ''),
          },
        );

        response.data = { code: 0, data: saved };
        response.code = HttpStatus.CREATED;
      } catch (innerError) {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
        throw innerError;
      }
    } catch (error) {
      console.error('Error creating payment:', error);

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
      await queryRunner.release();
      expressResponse(res, response);
    }
  }

  async getPayments(dto: GetPaymentDto, req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      const { id } = extractUser(req);
      if (!id) {
        response.data = { code: ErrorCode.MISSING_ID };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const cachekey = paymentsKey();
      const cacheData = await this.redis.get<IPayment[]>(cachekey);
      if (cacheData) {
        response.code = HttpStatus.OK;
        response.data = { code: 0, data: cacheData };
        return;
      }

      const payments = await this.paymentRepository.find({
        relations: {
          appointment: {
            patient: true,
          },
        },
        select: {
          mode: true,
          amount_paid: true,
          date_paid: true,
          created_at: true,
          appointment: {
            service: true,
            service_type: true,
            treatment_done: true,
            branch: true,
            patient: {
              last_name: true,
              first_name: true,
              middle_name: true,
              cellphone_number: true,
              address: true,
            },
          },
        },
        order: { created_at: 'DESC' },
      });

      const data: IPayment[] = [];

      for (const payment of payments) {
        data.push({
          // id: payment.id ?? null,
          appointment: {
            service: payment.appointment?.service ?? null,
            service_type: payment.appointment?.service_type ?? null,
            treatment_done: payment.appointment?.treatment_done ?? null,
            branch: payment.appointment?.branch ?? null,
            patient: {
              name:
                payment.appointment?.patient?.last_name +
                ' ' +
                payment.appointment?.patient?.first_name +
                ' ' +
                (payment.appointment?.patient?.middle_name || ''),
              cellphone_number:
                payment.appointment?.patient?.cellphone_number ?? null,
              address: payment.appointment?.patient?.address ?? null,
            },
          },
          mode: payment.mode,
          amount_paid: Number(payment.amount_paid),
          date_paid: formatDateTime(payment.date_paid),
          created_at: formatDateTime(payment.created_at),
        });
      }
      await this.redis.set(cachekey, data, PAYMENTS_TTL);
      response.code = HttpStatus.OK;
      response.data = { code: 0, data: data };
    } catch (error) {
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  //////

  async getTotalReceivedPayments(
    dto: GetTotalPaymentsDto,
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

      if (!rangeValidator(dto.dateFrom, dto.dateTo)) {
        response.data = {
          code: ErrorCode.INVALID_DATE_RANGE,
          message: '"dateFrom" must be on or before "dateTo".',
        };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const cachekey = totalReceivedKey(dto.dateFrom, dto.dateTo, dto.branch);
      const cacheData = await this.redis.get<ITotalReceivedPayments>(cachekey);
      if (cacheData) {
        response.data = { code: 0, data: cacheData };
        response.code = HttpStatus.OK;
        return;
      }

      const qb = this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoin('payment.appointment', 'appointment')
        .where('payment.date_paid BETWEEN :dateFrom AND :dateTo', {
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
        });

      if (dto.branch) {
        qb.andWhere('appointment.branch = :branch', { branch: dto.branch });
      }

      const result = await qb
        .select('SUM(payment.amount_paid)', 'total')
        .addSelect('COUNT(payment.id)', 'count')
        .getRawOne();

      const data: ITotalReceivedPayments = {
        total_received: Number(result.total) || 0,
        transaction_count: Number(result.count) || 0,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
        branch: dto.branch ?? 'ALL',
      };

      // range that includes today/future -> short TTL, since numbers can
      // still change as new payments land; a fully past range is safe to
      // cache much longer, since that history is settled
      const today = new Date().toISOString().split('T')[0];
      const isOngoingRange = dto.dateTo >= today;
      const ttl = isOngoingRange ? 60 : PAYMENTS_TTL; // 1 min vs your normal TTL

      await this.redis.set(cachekey, data, ttl);
      response.data = { code: 0, data };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error calculating total received payments:', error);

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

  // this method takes NO req/res — it's cron-safe, writes straight to Redis
  async refreshPaymentsCache(): Promise<void> {
    try {
      const payments = await this.paymentRepository.find({
        /* same query as getPayments */
      });
      // ...build data array...
      await this.redis.set(paymentsKey(), payments, PAYMENTS_TTL);
    } catch (error) {
      console.error('Error refreshing payments cache via cron:', error);
    }
  }
}
