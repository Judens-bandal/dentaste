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
  ValidateIf,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Optional } from '@nestjs/common';
import { IsCustomDate, IsFutureDate } from '../../../utils/common.helper';
import {
  EAppointmentStatus,
  EBranch,
  EDentalService,
} from '../enum/appointment';

export class AppointmentServiceEntryDto {
  @IsEnum(EDentalService)
  service: EDentalService;

  @IsOptional()
  @IsString()
  service_type?: string;

  @ValidateIf((e) => String(e.service) === String(EDentalService.Other))
  @IsString()
  @MaxLength(255)
  service_other?: string;
}

export class CreateAppointmentDto {
  @IsUUID()
  patient_id: string;

  @IsEnum(EBranch)
  branch: EBranch;

  // Full ISO datetime now (not just a date) — e.g. '2026-07-20T14:30:00Z'
  @IsString()
  @IsFutureDate()
  scheduled_at: string;

  @IsOptional()
  @IsEnum(EDentalService)
  service?: EDentalService;

  @ValidateIf((e) => String(e.service) === String(EDentalService.Other))
  @IsString()
  @MaxLength(255)
  service_other?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AppointmentServiceEntryDto)
  services: AppointmentServiceEntryDto[];
  // validated against SERVICE_TYPE_MAP in the service layer (depends on `service`)
  @IsOptional()
  service_type?: string;

  @IsOptional()
  @IsString()
  treatment_done?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount_charge: number;

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
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsEnum(EDentalService)
  service?: EDentalService;

  @ValidateIf((e) => String(e.service) === String(EDentalService.Other))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  service_other?: string;

  @IsOptional()
  @IsString()
  service_type?: string;

  @IsOptional()
  @IsString()
  treatment_done?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount_charge?: number;

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
  @IsUUID()
  id: string;
}

export class UpdateAppointmentStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(EAppointmentStatus)
  appointment_status: EAppointmentStatus;
}
