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
  IResponse,
  ITotalReceivedByBranch,
  ITotalReceivedPayments,
} from '../../utils/common.interface';
import { ErrorCode } from '../../utils/common.enum';
import {
  expressResponse,
  extractUser,
  getYearDateRange,
  rangeValidator,
} from '../../utils/common.helper';
import { appointmentKey, appointmentsKey } from '../redis/redis.keys';
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
import { EBranch } from '../appointment/enum/appointment';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment, 'main_repo')
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(Patient, 'main_repo')
    private readonly patientRepository: Repository<Patient>,

    @InjectRepository(Appointment, 'main_repo')
    private readonly appointmentRepository: Repository<Appointment>,

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
          where: { id: dto.appointmentId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!appointment) {
          await queryRunner.rollbackTransaction();
          response.data = { code: ErrorCode.APPOINTMENT_NOT_FOUND };
          response.code = HttpStatus.NOT_FOUND;
          return;
        }

        const currentBalance = Number(appointment.balance);

        if (dto.amountPaid > currentBalance) {
          await queryRunner.rollbackTransaction();
          response.data = {
            code: ErrorCode.PAYMENT_EXCEEDS_BALANCE,
            message: `Payment of ${dto.amountPaid} exceeds the remaining balance of ${currentBalance}.`,
          };
          response.code = HttpStatus.BAD_REQUEST;
          return;
        }

        const payment = queryRunner.manager.create(Payment, {
          appointmentId: dto.appointmentId,
          mode: dto.mode,
          amountPaid: dto.amountPaid,
          datePaid: dto.datePaid,
        });

        const saved = await queryRunner.manager.save(payment);
        // trg_payments_recalc_balance fires here, inside this same
        // transaction, recalculating appointments.balance before commit

        await queryRunner.commitTransaction();

        // cache invalidation happens AFTER commit — otherwise a request
        // hitting the cache mid-transaction could re-populate it with the
        // pre-payment balance before the commit actually lands
        await this.redis.del(appointmentKey(dto.appointmentId));
        await this.redis.del(appointmentsKey());

        const patient = await this.patientRepository.findOne({
          where: { id: appointment.patientId },
          select: { name: true },
        });

        void this.notificationHelper.notifyDoctors(
          EDoctorNotification.PAYMENT_RECEIVED,
          `Payment of ${dto.amountPaid} (${dto.mode}) received for ${patient?.name ?? 'a patient'}.`,
          {
            // appointmentId: dto.appointmentId,
            amountPaid: dto.amountPaid,
            mode: dto.mode,
            patientName: patient?.name,
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

  // ── Totals: single value, optionally filtered to one branch ────

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

  // ── Totals: fully-settled appointments only (secondary metric) ─

  //   async getFullyPaidAppointmentsTotal(
  //     dto: GetTotalPaymentsDto,
  //     req: ICustomRequest,
  //     res: Response,
  //   ) {
  //     const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

  //     try {
  //       const { id } = extractUser(req);
  //       if (!id) {
  //         response.data = { code: ErrorCode.MISSING_ID };
  //         response.code = HttpStatus.BAD_REQUEST;
  //         return;
  //       }

  //       if (!rangeValidator(dto.dateFrom, dto.dateTo)) {
  //         response.data = {
  //           code: ErrorCode.INVALID_DATE_RANGE,
  //           message: '"dateFrom" must be on or before "dateTo".',
  //         };
  //         response.code = HttpStatus.BAD_REQUEST;
  //         return;
  //       }

  //       const qb = this.appointmentRepository
  //         .createQueryBuilder('appointment')
  //         .where('appointment.scheduled_at BETWEEN :dateFrom AND :dateTo', {
  //           dateFrom: dto.dateFrom,
  //           dateTo: dto.dateTo,
  //         })
  //         .andWhere('appointment.balance <= 0');

  //       if (dto.branch) {
  //         qb.andWhere('appointment.branch = :branch', { branch: dto.branch });
  //       }

  //       const result = await qb
  //         .select('SUM(appointment.debit_amount)', 'total')
  //         .addSelect('COUNT(appointment.id)', 'count')
  //         .getRawOne();

  //       const data: IFullyPaidAppointmentsTotal = {
  //         fully_paid_total: Number(result.total) || 0,
  //         appointment_count: Number(result.count) || 0,
  //         date_from: dto.dateFrom,
  //         date_to: dto.dateTo,
  //         branch: dto.branch ?? 'ALL',
  //       };

  //       response.data = { code: 0, data };
  //       response.code = HttpStatus.OK;
  //     } catch (error) {
  //       console.error('Error calculating fully-paid appointments total:', error);

  //       if (error instanceof HttpException) {
  //         const errorResponse = error.getResponse();
  //         response.data =
  //           typeof errorResponse === 'string'
  //             ? { message: errorResponse }
  //             : (errorResponse as Record<string, any>);
  //         response.code = error.getStatus();
  //       } else {
  //         response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
  //         response.code = HttpStatus.INTERNAL_SERVER_ERROR;
  //       }
  //     } finally {
  //       expressResponse(res, response);
  //     }
  //   }

  // ── Totals: broken down per branch for the same date range ─────

  //   async getTotalReceivedByBranch(
  //     dto: GetTotalPaymentsDto, // dto.branch is ignored here — always returns ALL branches
  //     req: ICustomRequest,
  //     res: Response,
  //   ) {
  //     const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

  //     try {
  //       const { id } = extractUser(req);
  //       if (!id) {
  //         response.data = { code: ErrorCode.MISSING_ID };
  //         response.code = HttpStatus.BAD_REQUEST;
  //         return;
  //       }

  //       if (!rangeValidator(dto.dateFrom, dto.dateTo)) {
  //         response.data = {
  //           code: ErrorCode.INVALID_DATE_RANGE,
  //           message: '"dateFrom" must be on or before "dateTo".',
  //         };
  //         response.code = HttpStatus.BAD_REQUEST;
  //         return;
  //       }

  //       const rows = await this.paymentRepository
  //         .createQueryBuilder('payment')
  //         .innerJoin('payment.appointment', 'appointment')
  //         .where('payment.date_paid BETWEEN :dateFrom AND :dateTo', {
  //           date_from: dto.dateFrom,
  //           date_to: dto.dateTo,
  //         })
  //         .select('appointment.branch', 'branch')
  //         .addSelect('SUM(payment.amount_paid)', 'total')
  //         .addSelect('COUNT(payment.id)', 'count')
  //         .groupBy('appointment.branch')
  //         .getRawMany();

  //       const branches: IBranchTotalReceived[] = rows.map((row) => ({
  //         branch: row.branch,
  //         total_received: Number(row.total) || 0,
  //         transaction_count: Number(row.count) || 0,
  //       }));

  //       const grand_total = branches.reduce(
  //         (sum, b) => sum + b.total_received,
  //         0,
  //       );

  //       const data: ITotalReceivedByBranch = {
  //         date_from: dto.dateFrom,
  //         date_to: dto.dateTo,
  //         branches,
  //         grand_total,
  //       };

  //       response.data = { code: 0, data };
  //       response.code = HttpStatus.OK;
  //     } catch (error) {
  //       console.error('Error calculating total received by branch:', error);

  //       if (error instanceof HttpException) {
  //         const errorResponse = error.getResponse();
  //         response.data =
  //           typeof errorResponse === 'string'
  //             ? { message: errorResponse }
  //             : (errorResponse as Record<string, any>);
  //         response.code = error.getStatus();
  //       } else {
  //         response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
  //         response.code = HttpStatus.INTERNAL_SERVER_ERROR;
  //       }
  //     } finally {
  //       expressResponse(res, response);
  //     }
  //   }

  //   async getAnnualTotalReceived(
  //     dto: GetAnnualSummaryDto & { branch?: EBranch },
  //     req: ICustomRequest,
  //     res: Response,
  //   ) {
  //     const response: IResponse = { code: HttpStatus.ACCEPTED, data: null };

  //     try {
  //       const { id } = extractUser(req, dto);
  //       if (!id) {
  //         response.data = { code: ErrorCode.MISSING_ID };
  //         response.code = HttpStatus.BAD_REQUEST;
  //         return;
  //       }

  //       const { year, is_current_year, start_date, end_date } = getYearDateRange(
  //         dto.year,
  //       );

  //       const qb = this.paymentRepository
  //         .createQueryBuilder('payment')
  //         .innerJoin('payment.appointment', 'appointment')
  //         .where('payment.date_paid BETWEEN :startDate AND :endDate', {
  //           start_date,
  //           end_date,
  //         });

  //       if (dto.branch) {
  //         qb.andWhere('appointment.branch = :branch', { branch: dto.branch });
  //       }

  //       const result = await qb
  //         .select('SUM(payment.amount_paid)', 'total')
  //         .addSelect('COUNT(payment.id)', 'count')
  //         .getRawOne();

  //       const data: IAnnualTotalReceived = {
  //         year: String(year),
  //         branch: dto.branch ?? 'ALL',
  //         is_current_year,
  //         total_received: Number(result.total) || 0,
  //         transaction_count: Number(result.count) || 0,
  //       };

  //       response.data = { code: 0, data };
  //       response.code = HttpStatus.OK;
  //     } catch (error) {
  //       console.error('Error calculating annual total received:', error);

  //       if (error instanceof HttpException) {
  //         const errorResponse = error.getResponse();
  //         response.data =
  //           typeof errorResponse === 'string'
  //             ? { message: errorResponse }
  //             : (errorResponse as Record<string, any>);
  //         response.code = error.getStatus();
  //       } else {
  //         response.data = { code: ErrorCode.INTERNAL_SERVER_ERROR };
  //         response.code = HttpStatus.INTERNAL_SERVER_ERROR;
  //       }
  //     } finally {
  //       expressResponse(res, response);
  //     }
  //   }
}
