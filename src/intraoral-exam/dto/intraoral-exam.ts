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
  ArrayMinSize,
  IsDateString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EToothCondition,
  EToothArea,
  EPeriodontalScreening,
  EOcclusion,
  EAppliance,
  ETmd,
  EXrayType,
} from '../enum/enum';

export class ToothAreaSnapshotDto {
  @IsEnum(EToothArea)
  area: EToothArea;

  @IsEnum(EToothCondition)
  condition: EToothCondition;
}

export class ToothRecordSnapshotDto {
  @IsInt()
  @Min(11)
  @Max(85)
  tooth_number: number;

  @ValidateIf((record) => !record.areas)
  @IsEnum(EToothCondition)
  condition?: EToothCondition;

  @ValidateIf((record) => !record.condition)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ToothAreaSnapshotDto)
  areas?: ToothAreaSnapshotDto[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}

export class CreateIntraoralExamDto {
  @IsString()
  patient_id: string;

  @IsUUID()
  appointment_id: string;

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
