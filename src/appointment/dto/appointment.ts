// appointments/dto/create-appointment.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { EBranch } from '../enum/appointment';

export class CreateAppointmentDto {
  @IsOptional()
  id?: string;

  @IsUUID()
  patientId: string;

  @IsEnum(EBranch)
  branch: EBranch;

  // Full ISO datetime now (not just a date) — e.g. '2026-07-20T14:30:00Z'
  @IsDateString()
  scheduledAt: string;

  @IsString()
  @IsNotEmpty()
  treatmentDone: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debitAmount: number;

  // balance excluded — computed by DB triggers, never set from the client.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  balance?: number;

  @IsOptional()
  noShow?: number;
}
