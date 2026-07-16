// payments/dto/create-payment.dto.ts
import { IsUUID, IsEnum, IsNumber, Min, IsDateString } from 'class-validator';
import { EPaymentMode } from '../enum/payment';

export class CreatePaymentDto {
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
