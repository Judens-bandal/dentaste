// // patients/patient.entity.ts
// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   UpdateDateColumn,
//   OneToMany,
// } from 'typeorm';
// import { EPatientStatus } from '../enum/enum';

// import { Transform } from 'class-transformer';
// import { transformDateToISOString } from '../../../utils/common.helper';
// import { Appointment } from '../../appointment/entity/appointment';

// @Entity('patients')
// export class Patient {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'varchar', length: 150 })
//   last_name: string;

//   @Column({ type: 'varchar', length: 150 })
//   first_name: string;

//   @Column({ type: 'varchar', length: 150, nullable: true })
//   middle_name: string | null;

//   @Column({ type: 'varchar', length: 255 })
//   address: string;

//   @Column({ name: 'cellphone_number', type: 'varchar', length: 20 })
//   cellphone_number: string;

//   @Column({ type: 'int' })
//   age: number;

//   @Column({ type: 'varchar', length: 100 })
//   occupation: string;

//   @Column({ type: 'varchar', length: 255, nullable: true })
//   complain: string | null;

//   @Column({ type: 'varchar', length: 20, default: EPatientStatus.SINGLE })
//   status: EPatientStatus;

//   @CreateDateColumn({ name: 'created_at' })
//   @Transform(transformDateToISOString)
//   created_at: Date;

//   @UpdateDateColumn({ name: 'updated_at' })
//   @Transform(transformDateToISOString)
//   updated_at: Date;

//   @OneToMany(() => Appointment, (appointment) => appointment.patient)
//   appointments: Appointment[];
// }

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Transform } from 'class-transformer';
import { transformDateToISOString } from '../../../utils/common.helper';
import { Appointment } from '../../appointment/entity/appointment';
import {
  EPatientStatus,
  ESex,
  EAllergy,
  EMedicalCondition,
} from '../enum/enum';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Basic Patient Information ───────────────────────────────────────────
  @Column({ type: 'varchar', length: 150 })
  last_name: string;

  @Column({ type: 'varchar', length: 150 })
  first_name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  middle_name: string | null;

  @Column({ type: 'date', nullable: true })
  birthdate: string | null; // mm/dd/yy stored as ISO date

  @Column({ type: 'int', nullable: true })
  age: number | null;

  @Column({ type: 'enum', enum: ESex, nullable: true })
  sex: ESex | null; // M / F

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  religion: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  home_no: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  office_no: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  fax_no: string | null;

  @Column({
    name: 'cellphone_number',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  cellphone_number: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  occupation: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  dental_insurance: string | null;

  @Column({ type: 'date', nullable: true })
  effective_date: string | null;

  // ─── For Minors ──────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 150, nullable: true })
  parent_guardian_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  parent_occupation: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referred_by: string | null; // Whom may we thank for referring you?

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason_for_consultation: string | null; // What is your reason for dental consultation?

  // ─── Dental History ──────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 150, nullable: true })
  prev_dentist: string | null; // Previous Dentist: Dr. ___

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_dental_visit: string | null;

  // ─── Medical History – Physician ─────────────────────────────────────────
  @Column({ type: 'varchar', length: 150, nullable: true })
  physician_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  physician_specialty: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  physician_office_address: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  physician_office_no: string | null;

  // ─── Yes / No questions (0 = Yes, 1 = No) ────────────────────────────────
  @Column({ type: 'smallint', default: 1 })
  ar_gh: number; // 1. Are you in good health?

  @Column({ type: 'smallint', default: 1 })
  ar_umt: number; // 2. Are you under medical treatment now?

  @Column({ type: 'varchar', length: 255, nullable: true })
  umt_cond: string | null; // If so, what is the condition being treated?

  @Column({ type: 'smallint', default: 1 })
  ar_sio: number; // 3. Have you ever had serious illness or surgical operation?

  @Column({ type: 'varchar', length: 255, nullable: true })
  sio_detail: string | null; // If so, what illness or operation?

  @Column({ type: 'smallint', default: 1 })
  ar_hosp: number; // 4. Have you ever been hospitalized?

  @Column({ type: 'varchar', length: 255, nullable: true })
  hosp_detail: string | null; // If so, when and why?

  @Column({ type: 'smallint', default: 1 })
  ar_med: number; // 5. Are you taking any prescription/non-prescription medication?

  @Column({ type: 'varchar', length: 255, nullable: true })
  med_detail: string | null; // If so, please specify

  @Column({ type: 'smallint', default: 1 })
  ar_tob: number; // 6. Do you use tobacco products?

  @Column({ type: 'smallint', default: 1 })
  ar_drug: number; // 7. Do you use alcohol, cocaine or other dangerous drugs?

  @Column({ type: 'smallint', default: 1 })
  ar_all: number; // 8. Are you allergic to any of the following?

  @Column({ type: 'simple-array', nullable: true })
  allergies: EAllergy[] | null; // checked allergies

  @Column({ type: 'varchar', length: 100, nullable: true })
  allergy_others: string | null; // Others ___

  @Column({ type: 'varchar', length: 50, nullable: true })
  bleeding_time: string | null; // 9. Bleeding Time

  // ─── For women only (0 = Yes, 1 = No) ────────────────────────────────────
  @Column({ type: 'smallint', nullable: true })
  ar_preg: number | null; // Are you pregnant?

  @Column({ type: 'smallint', nullable: true })
  ar_nurs: number | null; // Are you nursing?

  @Column({ type: 'smallint', nullable: true })
  ar_bcp: number | null; // Are you taking birth control pills?

  // ─── Blood info ──────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 10, nullable: true })
  blood_type: string | null; // 11. Blood Type

  @Column({ type: 'varchar', length: 20, nullable: true })
  blood_pressure: string | null; // 12. Blood Pressure

  // ─── 13. Medical conditions checklist ────────────────────────────────────
  @Column({ type: 'simple-array', nullable: true })
  med_conds: EMedicalCondition[] | null; // checked conditions

  @Column({ type: 'varchar', length: 255, nullable: true })
  med_conds_other: string | null; // Other ___

  @Column({ type: 'varchar', length: 20, default: EPatientStatus.SINGLE })
  status: EPatientStatus;

  @CreateDateColumn({ name: 'created_at' })
  @Transform(transformDateToISOString)
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @Transform(transformDateToISOString)
  updated_at: Date;

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments: Appointment[];
}
