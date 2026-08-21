import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsIn,
  IsDateString,
} from 'class-validator';
import {
  EPatientStatus,
  ESex,
  EAllergy,
  EMedicalCondition,
} from '../enum/enum';

export class CreatePatientDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  id?: string;

  // Basic
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  last_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  first_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  middle_name?: string;

  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsEnum(ESex)
  sex?: ESex;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  religion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  home_no?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  office_no?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  fax_no?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cellphone_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  dental_insurance?: string;

  @IsOptional()
  @IsDateString()
  effective_date?: string | null;

  // Minors
  @IsOptional()
  @IsString()
  @MaxLength(150)
  parent_guardian_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  parent_occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  referred_by?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason_for_consultation?: string;

  // Dental History
  @IsOptional()
  @IsString()
  @MaxLength(150)
  prev_dentist?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_dental_visit?: string;

  // Physician
  @IsOptional()
  @IsString()
  @MaxLength(150)
  physician_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  physician_specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  physician_office_address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  physician_office_no?: string;

  // Yes/No (0=Yes, 1=No)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_gh?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_umt?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  umt_cond?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_sio?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sio_detail?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_hosp?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  hosp_detail?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_med?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  med_detail?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_tob?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_drug?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_all?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(EAllergy, { each: true })
  allergies?: EAllergy[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  allergy_others?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bleeding_time?: string;

  // Women only
  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_preg?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_nurs?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_bcp?: number;

  // Blood
  @IsOptional()
  @IsString()
  @MaxLength(10)
  blood_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  blood_pressure?: string;

  // Medical conditions checklist
  @IsOptional()
  @IsArray()
  @IsEnum(EMedicalCondition, { each: true })
  med_conds?: EMedicalCondition[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  med_conds_other?: string;

  @IsOptional()
  @IsEnum(EPatientStatus)
  status?: EPatientStatus;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  id?: string;

  // Basic
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  last_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  first_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  middle_name?: string;

  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsEnum(ESex)
  sex?: ESex;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  religion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  home_no?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  office_no?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  fax_no?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cellphone_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  dental_insurance?: string;

  @IsOptional()
  @IsDateString()
  effective_date?: string;

  // Minors
  @IsOptional()
  @IsString()
  @MaxLength(150)
  parent_guardian_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  parent_occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  referred_by?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason_for_consultation?: string;

  // Dental History
  @IsOptional()
  @IsString()
  @MaxLength(150)
  prev_dentist?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_dental_visit?: string;

  // Physician
  @IsOptional()
  @IsString()
  @MaxLength(150)
  physician_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  physician_specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  physician_office_address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  physician_office_no?: string;

  // Yes/No (0=Yes, 1=No)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_gh?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_umt?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  umt_cond?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_sio?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sio_detail?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_hosp?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  hosp_detail?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_med?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  med_detail?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_tob?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_drug?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_all?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(EAllergy, { each: true })
  allergies?: EAllergy[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  allergy_others?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bleeding_time?: string;

  // Women only
  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_preg?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_nurs?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  ar_bcp?: number;

  // Blood
  @IsOptional()
  @IsString()
  @MaxLength(10)
  blood_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  blood_pressure?: string;

  // Medical conditions checklist
  @IsOptional()
  @IsArray()
  @IsEnum(EMedicalCondition, { each: true })
  med_conds?: EMedicalCondition[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  med_conds_other?: string;

  @IsOptional()
  @IsEnum(EPatientStatus)
  status?: EPatientStatus;
}

export class GetPatientDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  id?: string;
}
