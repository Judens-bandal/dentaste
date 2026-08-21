import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EToothCondition,
  EPeriodontalScreening,
  EOcclusion,
  EAppliance,
  ETmd,
  EXrayType,
} from '../enum/enum';

export class ToothRecordSnapshotDto {
  @IsInt()
  @Min(11)
  @Max(85)
  tooth_number: number;

  @IsEnum(EToothCondition)
  condition: EToothCondition;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}

export class CreateIntraoralExamDto {
  @IsString()
  patient_id: string;

  @IsDateString()
  exam_date: string;

  @IsOptional()
  @IsArray()
  @IsEnum(EPeriodontalScreening, { each: true })
  periodontal?: EPeriodontalScreening[];

  @IsOptional()
  @IsArray()
  @IsEnum(EOcclusion, { each: true })
  occlusion?: EOcclusion[];

  @IsOptional()
  @IsArray()
  @IsEnum(EAppliance, { each: true })
  appliances?: EAppliance[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  appliances_other?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ETmd, { each: true })
  tmd?: ETmd[];

  @IsOptional()
  @IsArray()
  @IsEnum(EXrayType, { each: true })
  xray_taken?: EXrayType[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  xray_periapical_teeth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  xray_others?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToothRecordSnapshotDto)
  tooth_records?: ToothRecordSnapshotDto[];
}

export class GetIntraoralExamDto {
  @IsUUID()
  patient_id: string;
}
