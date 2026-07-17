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

export class CreateAppointmentDto {
  @IsUUID()
  id: string;

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

export class UpdateAppointmentDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsEnum(EBranch)
  branch?: EBranch;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

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
  id?: string;
}
