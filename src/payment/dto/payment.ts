// payments/dto/create-payment.dto.ts
import {
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
  IsString,
  IsOptional,
} from 'class-validator';
import { EPaymentMode } from '../enum/payment';
import { Optional } from '@nestjs/common';
import { EBranch } from '../../appointment/enum/appointment';
import { IsCustomDate } from '../../../utils/common.helper';

export class CreatePaymentDto {
  // @Optional()
  // id?: string;

  @Optional()
  @IsUUID()
  appointment_id: string;

  @IsEnum(EPaymentMode)
  mode: EPaymentMode;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount_paid: number;

  @IsDateString()
  date_paid: string;
}

export class GetPaymentDto {
  @IsUUID()
  id: string;
}

export class UpdatePaymentDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsEnum(EPaymentMode)
  mode?: EPaymentMode;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount_paid?: number;

  @IsOptional()
  @IsDateString()
  date_paid?: string;
}

// payments/dto/get-total-payments.dto.ts
export class GetTotalPaymentsDto {
  // @Optional()
  // @IsUUID()
  // id?: string;

  @IsCustomDate()
  dateFrom: string;

  @IsCustomDate()
  dateTo: string;

  // used by getTotalReceivedPayments / getFullyPaidAppointmentsTotal to
  // filter to one branch; IGNORED by getTotalReceivedByBranch, which
  // always returns every branch broken down individually
  @IsOptional()
  @IsEnum(EBranch)
  branch?: EBranch;
}

export class GetAnnualSummaryDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  year: string;
}
