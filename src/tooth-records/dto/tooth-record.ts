import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EToothCondition } from '../enum/enum';

export class UpsertToothRecordDto {
  @IsUUID()
  patient_id: string;

  @IsInt()
  @Min(11)
  @Max(85)
  tooth_number: number;

  @IsOptional()
  @IsEnum(EToothCondition)
  condition?: EToothCondition | null; // null/omitted = clear the tooth

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}

export class GetToothRecordsDto {
  @IsUUID()
  patient_id: string;
}
