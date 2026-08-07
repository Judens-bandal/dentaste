// patients/dto/create-patient.dto.ts
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsInt,
  Min,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { EPatientStatus } from '../enum/enum';
import { Optional } from '@nestjs/common';

export class CreatePatientDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  last_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  first_name: string;

  @IsString()
  @Optional()
  middle_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cellphone_number: string;

  @IsInt()
  @Min(0)
  age: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  occupation: string;

  @Optional()
  complain?: string;

  @IsOptional()
  @IsEnum(EPatientStatus)
  status?: EPatientStatus;
}

export class UpdatePatientDto {
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  last_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  first_name: string;

  @IsString()
  @Optional()
  middle_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cellphone_number: string;

  @IsInt()
  @Min(0)
  age: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  occupation: string;

  @IsString()
  @Optional()
  complain?: string;

  @Optional()
  @IsEnum(EPatientStatus)
  status: EPatientStatus;
}

export class GetPatientDto {
  @IsOptional()
  @IsString()
  id?: string;
}
