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
import { tap } from 'rxjs/operators';

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

export class DeletePaymentDto {
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
  @IsCustomDate()
  from: string;

  @IsCustomDate()
  to: string;

  @IsOptional()
  @IsEnum(EBranch)
  branch?: EBranch;
}

export class GetAnnualSummaryDto {
  // @IsUUID()
  // id: string;

  @IsOptional()
  @IsString()
  year: string;
}

export type TMonthlyBranchRow = { month: string } & Record<EBranch, number>;

export interface IMonthlyBranchRevenue {
  year: string;
  rows: TMonthlyBranchRow[];
  grand_total: number;
}

export const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
