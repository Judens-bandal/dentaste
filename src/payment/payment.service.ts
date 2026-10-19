// payments/payment.service.ts
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
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
  getYearDateRangeb,
  rangeValidator,
} from '../../utils/common.helper';
import {
  appointmentKey,
  appointmentsKey,
  patientRecordKey,
  paymentsKey,
  summaryVersionKey,
  totalTransactionsKey,
} from '../redis/redis.keys';
import { RedisCacheService } from '../redis/redis-cach.service';
import {
  EDoctorNotification,
  NotificationHelper,
} from '../notification/common/notification.helper';
import {
  CreatePaymentDto,
  DeletePaymentDto,
  GetAnnualSummaryDto,
  GetPaymentDto,
  GetTotalPaymentsDto,
  IMonthlyBranchRevenue,
  MONTH_LABELS,
  TMonthlyBranchRow,
} from './dto/payment';
import {
  EAppointmentStatus,
  EBranch,
  EPaymentStatus,
} from '../appointment/enum/appointment';
import { PAYMENTS_TTL } from '../redis/redis.ttl';
import { ChainableCommander, Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis-con.module';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment, 'main_repo')
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(Appointment, 'main_repo')
    private readonly appointmentRepository: Repository<Appointment>,

    @InjectRepository(Patient, 'main_repo')
    private readonly patientRepository: Repository<Patient>,

    @InjectDataSource('main_repo')
    private readonly dataSource: DataSource,

    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly notificationHelper: NotificationHelper,
  ) {}

  async calculateUnPaid(req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      // const { id } = extractUser(req);
      // if (!id) {
      //   response.data = { code: ErrorCode.MISSING_ID };
      //   response.code = HttpStatus.BAD_REQUEST;
      //   return;
      // }
      // const cachekey = patientsKey();
      // const cached = await this.readCache<IPatient[]>(cachekey);
      // if (cached) {
      //   response.data = { code: 0, data: cached.length };
      //   response.code = HttpStatus.OK;
      //   return;
      // }

      const row = await this.appointmentRepository
        .createQueryBuilder('appointment')
        .select('COUNT(appointment.id)', 'total')
        .addSelect(
          'COUNT(appointment.id) FILTER (WHERE appointment.balance > 0)',
          'unpaid',
        )
        .addSelect(
          'COALESCE(SUM(appointment.balance) FILTER (WHERE appointment.balance > 0), 0)',
          'unpaid_amount',
        )
        .getRawOne<{
          total: string;
          unpaid: string;
          unpaid_amount: string;
        }>();

      response.data = {
        code: 0,
        data: {
          // total: Number(row?.total ?? 0),
          unpaid: Number(row?.unpaid ?? 0),
          unpaid_amount: Number(row?.unpaid_amount ?? 0),
        },
      };
      // await this.writeCache(cachekey, total, PATIENT_TTL);
      // response.data = { code: 0, data: total };
      response.code = HttpStatus.OK;
    } catch (error) {
      response.data = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: error.message,
      };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

  async calculateAmountPaid(req: ICustomRequest, res: Response) {
    const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

    try {
      // const { id } = extractUser(req);
      // if (!id) {
      //   response.data = { code: ErrorCode.MISSING_ID };
      //   response.code = HttpStatus.BAD_REQUEST;
      //   return;
      // }
      // const cachekey = patientsKey();
      // const cached = await this.readCache<IPatient[]>(cachekey);
      // if (cached) {
      //   response.data = { code: 0, data: cached.length };
      //   response.code = HttpStatus.OK;
      //   return;
      // }
      const total = await this.paymentRepository.sum('amount_paid');
      // await this.writeCache(cachekey, total, PATIENT_TTL);
      response.data = { code: 0, data: total };
      response.code = HttpStatus.OK;
    } catch (error) {
      response.data = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: error.message,
      };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }

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

        if (Number(appointment.amount_charge) <= 0) {
          await queryRunner.rollbackTransaction();
          response.data = {
            code: ErrorCode.CHARGE_NOT_SET,
            message:
              'No charge has been set for this appointment yet. Add the service in the intraoral exam first.',
          };
          response.code = HttpStatus.BAD_REQUEST;
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

        const newBalance = currentBalance - dto.amount_paid;
        const appointmentUpdate: Partial<Appointment> = { balance: newBalance };

        if (
          appointment.appointment_status !== EAppointmentStatus.NO_SHOW &&
          appointment.appointment_status !== EAppointmentStatus.CANCELLED
        ) {
          appointmentUpdate.appointment_status =
            Number(appointment.amount_charge) > 0 && newBalance <= 0
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
        await this.invalidate((p) => {
          p.del(appointmentKey(dto.appointment_id));
          p.del(appointmentsKey());
          p.del(paymentsKey());
          if (appointment.patient_id)
            p.del(patientRecordKey(appointment.patient_id));
          p.incr(summaryVersionKey(appointment.branch));
          p.incr(summaryVersionKey());
        });
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

  async deletePayment(
    dto: DeletePaymentDto,
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

      const payment = await this.paymentRepository.findOne({
        where: { id: dto.id },
        relations: { appointment: true },
      });

      if (!payment) {
        response.data = { code: ErrorCode.PAYMENT_NOT_FOUND };
        response.code = HttpStatus.NOT_FOUND;
        return;
      }

      const appointment = await this.appointmentRepository.findOne({
        where: { id: payment.appointment_id },
      });

      await this.paymentRepository.delete({ id: dto.id });

      if (appointment) {
        const newBalance =
          Number(appointment.balance) + Number(payment.amount_paid);
        const newStatus =
          appointment.appointment_status !== EAppointmentStatus.NO_SHOW &&
          appointment.appointment_status !== EAppointmentStatus.CANCELLED
            ? newBalance > 0
              ? EAppointmentStatus.SCHEDULED
              : EAppointmentStatus.COMPLETED
            : appointment.appointment_status;

        await this.appointmentRepository.update(
          { id: appointment.id },
          { balance: newBalance, appointment_status: newStatus },
        );
        await this.invalidate((p) => {
          p.del(appointmentsKey());
          p.del(paymentsKey());
          if (appointment) {
            p.del(appointmentKey(appointment.id));
            if (appointment.patient_id)
              p.del(patientRecordKey(appointment.patient_id));
            p.incr(summaryVersionKey(appointment.branch));
            p.incr(summaryVersionKey());
          }
        });
      }

      const pipeline = this.redis.pipeline();
      pipeline.del(appointmentsKey());
      pipeline.del(paymentsKey());
      await pipeline.exec();

      response.data = { code: 0 };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error deleting payment:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
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
      const cached = await this.redis.get(cachekey);
      if (cached) {
        try {
          response.code = HttpStatus.OK;
          response.data = { code: 0, data: JSON.parse(cached) as IPayment[] };
          return;
        } catch {
          await this.redis.del(cachekey); // corrupt entry, fall through to DB
        }
      }

      const payments = await this.paymentRepository.find({
        relations: {
          appointment: {
            patient: true,
          },
        },
        select: {
          id: true,
          mode: true,
          amount_paid: true,
          date_paid: true,
          created_at: true,
          appointment: {
            service: true,
            service_other: true,
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
          id: payment.id,
          appointment: {
            service: payment.appointment?.service ?? null,
            service_other: payment.appointment?.service_other ?? null,
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
      await this.redis.set(cachekey, JSON.stringify(data), 'EX', PAYMENTS_TTL);
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

      if (!rangeValidator(dto.from, dto.to)) {
        response.data = {
          code: ErrorCode.INVALID_DATE_RANGE,
          message: '"from" must be on or before "to".',
        };
        response.code = HttpStatus.BAD_REQUEST;
        return;
      }

      const version = Number(
        (await this.redis.get(summaryVersionKey(dto.branch))) ?? 0,
      );
      const cachekey = totalTransactionsKey(
        dto.from,
        dto.to,
        dto.branch,
        version,
      );

      const cached = await this.redis.get(cachekey);
      if (cached) {
        try {
          response.data = { code: 0, data: JSON.parse(cached) };
          response.code = HttpStatus.OK;
          return;
        } catch {
          await this.redis.del(cachekey);
        }
      }

      const qb = this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoin('payment.appointment', 'appointment')
        .where('payment.date_paid BETWEEN :from AND :to', {
          from: dto.from,
          to: dto.to,
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
        from: dto.from,
        to: dto.to,
        branch: dto.branch ?? 'ALL',
      };

      // range that includes today/future -> short TTL, since numbers can
      // still change as new payments land; a fully past range is safe to
      // cache much longer, since that history is settled
      const today = new Date().toISOString().split('T')[0];
      const isOngoingRange = dto.to >= today;
      const ttl = isOngoingRange ? 60 : PAYMENTS_TTL; // 1 min vs your normal TTL

      await this.redis.set(cachekey, JSON.stringify(data), 'EX', PAYMENTS_TTL);
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
      await this.redis.set(
        paymentsKey(),
        JSON.stringify(payments),
        'EX',
        PAYMENTS_TTL,
      );
    } catch (error) {
      console.error('Error refreshing payments cache via cron:', error);
    }
  }

  private async invalidate(build: (p: ChainableCommander) => void) {
    try {
      const pipeline = this.redis.pipeline();
      build(pipeline);
      const results = await pipeline.exec();
      results?.forEach(([err], i) => {
        if (err) console.error(`Redis pipeline cmd ${i} failed:`, err);
      });
    } catch (error) {
      console.error('Redis invalidation failed:', error);
    }
  }

  async getMonthlyReceivedByBranch(
    dto: GetAnnualSummaryDto,
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

      const { year, startDate, endDate } = getYearDateRangeb(dto.year);
      // current year → stop at the current month; past years → all 12
      const lastMonth = Number(endDate.slice(5, 7));

      const raw = await this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoin('payment.appointment', 'appointment')
        .where('payment.date_paid BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .select('EXTRACT(MONTH FROM payment.date_paid)', 'month')
        .addSelect('appointment.branch', 'branch')
        .addSelect('SUM(payment.amount_paid)', 'total')
        .groupBy('EXTRACT(MONTH FROM payment.date_paid)')
        .addGroupBy('appointment.branch')
        .getRawMany();

      const branches = Object.values(EBranch);
      const rows = Array.from({ length: lastMonth }, (_, i) => {
        const row = { month: MONTH_LABELS[i] } as TMonthlyBranchRow;
        for (const b of branches) row[b] = 0;
        return row;
      });

      for (const r of raw) {
        const row = rows[Number(r.month) - 1];
        if (row) row[r.branch as EBranch] = Number(r.total) || 0;
      }

      const grand_total = rows.reduce(
        (sum, row) => sum + branches.reduce((s, b) => s + row[b], 0),
        0,
      );

      const data: IMonthlyBranchRevenue = { year, rows, grand_total };
      response.data = { code: 0, data };
      response.code = HttpStatus.OK;
    } catch (error) {
      console.error('Error building monthly revenue by branch:', error);
      response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
      response.code = HttpStatus.INTERNAL_SERVER_ERROR;
    } finally {
      expressResponse(res, response);
    }
  }
}
