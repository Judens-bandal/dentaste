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
import { Optional } from '@nestjs/common';
import { IsCustomDate, IsFutureDate } from '../../../utils/common.helper';

export class CreateAppointmentDto {
  @Optional()
  id: string;

  @IsUUID()
  patientId: string;

  @IsEnum(EBranch)
  branch: EBranch;

  // Full ISO datetime now (not just a date) — e.g. '2026-07-20T14:30:00Z'
  @IsString()
  @IsFutureDate()
  scheduledAt: string;

  @IsString()
  @IsNotEmpty()
  treatmentDone: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debitAmount: number;

  // balance is NOT accepted from the client at all — it's always
  // trg_appointments_recalc_balance computing it from debitAmount on INSERT.
  // (removed entirely, rather than kept optional, so it can never be set)

  @IsOptional()
  @IsNumber()
  noShow?: number;
}
export class UpdateAppointmentDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsEnum(EBranch)
  branch: EBranch;

  @IsOptional()
  @IsString()
  @IsFutureDate()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  treatmentDone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  debitAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  balance?: number;

  @IsOptional()
  noShow?: number;
}

export class GetAppointmentDto {
  @Optional()
  @IsString()
  id: string;
}

export class DeleteAppointmentDto {
  // @Optional()
  // @IsString()
  // id?: string;

  @IsString()
  id: string;
}
