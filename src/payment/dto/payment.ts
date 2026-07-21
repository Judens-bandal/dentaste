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

export class CreatePaymentDto {
  // @Optional()
  // id?: string;

  @Optional()
  @IsUUID()
  appointmentId: string;

  @IsEnum(EPaymentMode)
  mode: EPaymentMode;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amountPaid: number;

  @IsDateString()
  datePaid: string;
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
  amountPaid?: number;

  @IsOptional()
  @IsDateString()
  datePaid?: string;
}
