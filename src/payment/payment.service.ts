// payments/payment.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Response } from 'express';
import { Payment } from './entity/payment';
import { Appointment } from '../appointment/entity/appointment';
import { Patient } from '../patient/entity/patient';

import { ICustomRequest, IResponse } from '../../utils/common.interface';
import { ErrorCode } from '../../utils/common.enum';
import { expressResponse, extractUser } from '../../utils/common.helper';
import { appointmentKey, appointmentsKey } from '../redis/redis.keys';
import { RedisCacheService } from '../redis/redis-cach.service';
import {
  EDoctorNotification,
  NotificationHelper,
} from '../notification/common/notification.helper';
import { CreatePaymentDto } from './dto/payment';

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
}
