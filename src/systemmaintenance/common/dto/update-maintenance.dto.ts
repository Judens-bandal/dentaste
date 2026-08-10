import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateMaintenanceDto {
  @IsIn([0, 1])
  enabled: 0 | 1;

  @IsOptional()
  @IsString()
  message?: string;

  @ValidateIf((o) => o.enabled === 0)
  @IsDateString()
  date_from?: string;

  @ValidateIf((o) => o.enabled === 0)
  @IsDateString()
  date_to?: string;
}
