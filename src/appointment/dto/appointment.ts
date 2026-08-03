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
import { EAppointmentStatus, EBranch } from '../enum/appointment';
import { Optional } from '@nestjs/common';
import { IsCustomDate, IsFutureDate } from '../../../utils/common.helper';

export class CreateAppointmentDto {
  @Optional()
  id: string;

  @IsUUID()
  patient_id: string;

  @IsEnum(EBranch)
  branch: EBranch;

  // Full ISO datetime now (not just a date) — e.g. '2026-07-20T14:30:00Z'
  @IsString()
  @IsFutureDate()
  scheduled_at: string;

  @IsString()
  @IsNotEmpty()
  treatment_done: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debit_amount: number;

  // balance is NOT accepted from the client at all — it's always
  // trg_appointments_recalc_balance computing it from debitAmount on INSERT.
  // (removed entirely, rather than kept optional, so it can never be set)

  @IsOptional()
  @IsEnum(EAppointmentStatus)
  appointment_status!: EAppointmentStatus;
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
  scheduled_at: string;

  @IsOptional()
  @IsString()
  treatment_done?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  debit_amount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  balance?: number;

  @IsOptional()
  @IsEnum(EAppointmentStatus)
  appointment_status!: EAppointmentStatus;
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

export class UpdateAppointmentStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(EAppointmentStatus)
  appointment_status: EAppointmentStatus;
}
